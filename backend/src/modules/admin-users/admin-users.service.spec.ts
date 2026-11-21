import { AdminUsersService } from './admin-users.service';
import { UserStatus } from '../../generated/prisma/enums';

describe('AdminUsersService status management', () => {
  it('revokes refresh sessions when disabling a user', async () => {
    const prisma: any = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 7 }),
      },
      refreshToken: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      client: {
        $transaction: jest.fn((operations) => Promise.all(operations)),
      },
    };
    const service = new AdminUsersService(prisma);
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({ id: 7, status: UserStatus.INACTIVE } as any);
    await service.updateStatus(7, UserStatus.INACTIVE, 1);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 7, revoked: false } }),
    );
  });
});
