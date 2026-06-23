import { prisma } from '@ebike/db';
import type { RegisterDto, User } from '@ebike/types';

export class UserRepository {
  static async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  static async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  static async create(dto: RegisterDto & { passwordHash: string }): Promise<User> {
    const user = await prisma.user.create({
      data: {
        email:        dto.email,
        passwordHash: dto.passwordHash,
        name:         dto.name,
        phone:        dto.phone,
        role:         'RIDER',
      },
    });
    return {
      id:          user.id,
      email:       user.email,
      name:        user.name,
      phone:       user.phone ?? undefined,
      role:        user.role as User['role'],
      walletCents: user.walletCents,
      createdAt:   user.createdAt,
    };
  }

  static async findOrCreateOAuth(email: string, name: string): Promise<User> {
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({ data: { email, name, role: 'RIDER' } });
    }
    return {
      id:          user.id,
      email:       user.email,
      name:        user.name,
      phone:       user.phone ?? undefined,
      role:        user.role as User['role'],
      walletCents: user.walletCents,
      createdAt:   user.createdAt,
    };
  }

  static async updatePassword(id: string, passwordHash: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { passwordHash }
    });
  }
}
