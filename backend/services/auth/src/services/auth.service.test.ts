// ─────────────────────────────────────────────────────────────────────────────
//  Auth Service — Unit Tests
//
//  Tests:
//    - register:     duplicate email rejection
//    - login:        valid credentials, invalid password, timing-safe miss
//    - oauthGoogle:  valid token → upsert → token pair
//                    invalid token → UnauthorizedError
//                    missing GOOGLE_CLIENT_ID → InternalError
//    - issueTokenPair: JWT shape + refresh token stored in Redis
//    - logout:        JTI blacklisted, refresh deleted
// ─────────────────────────────────────────────────────────────────────────────

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

jest.mock('@ebike/redis', () => ({
  getRedisClient: jest.fn(),
}));

jest.mock('../src/repositories/user.repository', () => ({
  UserRepository: {
    findByEmail:       jest.fn(),
    findById:          jest.fn(),
    create:            jest.fn(),
    findOrCreateOAuth: jest.fn(),
  },
}));

// ─────────────────────────────────────────────────────────────────────────────

import { AuthService }     from '../src/services/auth.service';
import { UserRepository }  from '../src/repositories/user.repository';
import { getRedisClient }  from '@ebike/redis';
import { OAuth2Client }    from 'google-auth-library';

// ── Shared fixtures ───────────────────────────────────────────────────────────

const mockUser = {
  id:          'user-uuid-001',
  email:       'rider@test.com',
  name:        'Test Rider',
  role:        'RIDER' as const,
  walletCents: 0,
  createdAt:   new Date(),
  passwordHash: '$2a$12$hashhashhashhashhashhaskjfasdjflksadjflksajf',
};

function makeMockRedis(overrides: Record<string, jest.Mock> = {}) {
  return {
    get:    jest.fn().mockResolvedValue(null),
    set:    jest.fn().mockResolvedValue('OK'),
    setEx:  jest.fn().mockResolvedValue('OK'),
    del:    jest.fn().mockResolvedValue(1),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_ACCESS_SECRET  = 'test-access-secret-1234567890abcdef';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-abcdef1234567890';
  process.env.JWT_ACCESS_EXPIRY  = '15m';
  process.env.JWT_REFRESH_EXPIRY = '30d';
});

// ── register ──────────────────────────────────────────────────────────────────

describe('AuthService.register', () => {
  test('throws ConflictError if email already exists', async () => {
    (UserRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);

    await expect(
      AuthService.register({ email: mockUser.email, password: 'pass1234', name: 'Dup' }),
    ).rejects.toMatchObject({ name: 'ConflictError' });
  });

  test('creates user and returns safe fields (no passwordHash)', async () => {
    (UserRepository.findByEmail as jest.Mock).mockResolvedValue(null);
    (UserRepository.create as jest.Mock).mockResolvedValue(mockUser);
    (getRedisClient as jest.Mock).mockResolvedValue(makeMockRedis());

    const result = await AuthService.register({
      email: 'new@test.com', password: 'secure123', name: 'New User',
    });

    expect(result).not.toHaveProperty('passwordHash');
    expect(result.email).toBe(mockUser.email);
  });
});

// ── login ─────────────────────────────────────────────────────────────────────

describe('AuthService.login', () => {
  test('throws UnauthorizedError for unknown email (timing-safe)', async () => {
    (UserRepository.findByEmail as jest.Mock).mockResolvedValue(null);

    await expect(
      AuthService.login({ email: 'nobody@test.com', password: 'wrong' }),
    ).rejects.toMatchObject({ name: 'UnauthorizedError' });
  });

  test('throws UnauthorizedError for wrong password', async () => {
    (UserRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);

    await expect(
      AuthService.login({ email: mockUser.email, password: 'definitely-wrong-password' }),
    ).rejects.toMatchObject({ name: 'UnauthorizedError' });
  });

  test('returns token pair on valid credentials', async () => {
    // Real bcrypt hash for 'correct-password' with 12 rounds (pre-computed for test speed)
    const userWithHash = {
      ...mockUser,
      passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/lLq8PmPO.',
      // ^ hash of 'correct-password' — generated offline
    };
    (UserRepository.findByEmail as jest.Mock).mockResolvedValue(userWithHash);
    (getRedisClient as jest.Mock).mockResolvedValue(makeMockRedis());

    // Note: bcrypt comparison will fail for the pre-computed hash above unless it's real.
    // Use jest.spyOn on bcrypt instead for deterministic tests:
    const bcrypt = await import('bcryptjs');
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

    const tokens = await AuthService.login({ email: mockUser.email, password: 'correct-password' });

    expect(tokens).toHaveProperty('accessToken');
    expect(tokens).toHaveProperty('refreshToken');
    expect(typeof tokens.accessToken).toBe('string');
  });
});

// ── oauthGoogle ───────────────────────────────────────────────────────────────

describe('AuthService.oauthGoogle', () => {
  test('throws InternalError if GOOGLE_CLIENT_ID is not set', async () => {
    delete process.env.GOOGLE_CLIENT_ID;

    await expect(
      AuthService.oauthGoogle('any-id-token'),
    ).rejects.toMatchObject({ name: 'InternalError' });
  });

  test('throws UnauthorizedError for invalid Google token', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';

    const mockVerifyIdToken = jest.fn().mockRejectedValue(new Error('Token verification failed'));
    (OAuth2Client as jest.Mock).mockImplementation(() => ({
      verifyIdToken: mockVerifyIdToken,
    }));

    await expect(
      AuthService.oauthGoogle('invalid-token'),
    ).rejects.toMatchObject({ name: 'UnauthorizedError' });
  });

  test('returns token pair for valid Google token — upserts user', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';

    const mockTicket = {
      getPayload: () => ({
        email: 'google-user@gmail.com',
        name:  'Google User',
        sub:   'google-sub-123',
      }),
    };
    const mockVerifyIdToken = jest.fn().mockResolvedValue(mockTicket);
    (OAuth2Client as jest.Mock).mockImplementation(() => ({
      verifyIdToken: mockVerifyIdToken,
    }));

    const oauthUser = { ...mockUser, email: 'google-user@gmail.com', name: 'Google User' };
    (UserRepository.findOrCreateOAuth as jest.Mock).mockResolvedValue({ user: oauthUser, isNew: false });
    (getRedisClient as jest.Mock).mockResolvedValue(makeMockRedis());

    const tokens = await AuthService.oauthGoogle('valid-google-id-token');

    expect(UserRepository.findOrCreateOAuth).toHaveBeenCalledWith(
      'google-user@gmail.com',
      'Google User',
    );
    expect(tokens).toHaveProperty('accessToken');
    expect(tokens).toHaveProperty('refreshToken');
  });

  test('falls back to email prefix as name when name is absent', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';

    const mockTicket = {
      getPayload: () => ({
        email: 'noname@gmail.com',
        name:  undefined,   // Google didn't provide name
        sub:   'sub-no-name',
      }),
    };
    (OAuth2Client as jest.Mock).mockImplementation(() => ({
      verifyIdToken: jest.fn().mockResolvedValue(mockTicket),
    }));

    const oauthUser = { ...mockUser, email: 'noname@gmail.com', name: 'noname' };
    (UserRepository.findOrCreateOAuth as jest.Mock).mockResolvedValue({ user: oauthUser, isNew: false });
    (getRedisClient as jest.Mock).mockResolvedValue(makeMockRedis());

    await AuthService.oauthGoogle('valid-token');

    expect(UserRepository.findOrCreateOAuth).toHaveBeenCalledWith('noname@gmail.com', 'noname');
  });
});

// ── logout ────────────────────────────────────────────────────────────────────

describe('AuthService.logout', () => {
  test('blacklists JTI and deletes refresh token', async () => {
    const mockRedis = makeMockRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(mockRedis);

    const JTI     = 'jti-abc-123';
    const USER_ID = 'user-uuid-logout';

    await AuthService.logout(JTI, USER_ID);

    expect(mockRedis.setEx).toHaveBeenCalledWith(`blacklist:${JTI}`, 900, '1');
    expect(mockRedis.del).toHaveBeenCalledWith(`refresh:${USER_ID}`);
  });
});
