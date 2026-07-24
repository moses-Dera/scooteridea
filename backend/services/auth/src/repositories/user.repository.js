import { prisma } from '@ebike/db';
export class UserRepository {
    static async findByEmail(email) {
        return prisma.user.findUnique({ where: { email } });
    }
    static async findById(id) {
        return prisma.user.findUnique({ where: { id } });
    }
    static async create(dto) {
        const user = await prisma.user.create({
            data: {
                email: dto.email,
                passwordHash: dto.passwordHash,
                name: dto.name,
                phone: dto.phone,
                role: 'RIDER',
            },
        });
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone ?? undefined,
            role: user.role,
            walletCents: user.walletCents,
            createdAt: user.createdAt,
        };
    }
    static async findOrCreateOAuth(email, name) {
        let user = await prisma.user.findUnique({ where: { email } });
        let isNew = false;
        if (!user) {
            user = await prisma.user.create({ data: { email, name, role: 'RIDER' } });
            isNew = true;
        }
        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone ?? undefined,
                role: user.role,
                walletCents: user.walletCents,
                createdAt: user.createdAt,
            },
            isNew,
        };
    }
    static async updatePassword(id, passwordHash) {
        await prisma.user.update({
            where: { id },
            data: { passwordHash },
        });
    }
}
