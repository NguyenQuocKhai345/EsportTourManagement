import { UserService } from './user.service';
import * as argon from 'argon2';

jest.mock('argon2', () => ({ hash: jest.fn(), verify: jest.fn() }));

describe('UserService BE003', () => {
  let service: UserService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
    };
    service = new UserService(prisma);
  });

  it('returns a safe profile projection', async () => {
    const profile = {
      id: 4,
      name: 'A',
      email: 'a@b.com',
      phone: '0123456789',
      role: 'PLAYER',
      status: 'ACTIVE',
    };
    prisma.user.findUnique.mockResolvedValue(profile);
    await expect(service.getProfile(4)).resolves.toEqual(profile);
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.not.objectContaining({ password: true }),
      }),
    );
  });

  it('updates only profile fields, never role or status', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 4,
      email: 'a@b.com',
      phone: '0123456789',
    });
    prisma.user.update.mockResolvedValue({ id: 4, name: 'New' });
    await service.updateProfile(4, { name: 'New' });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: 'New' } }),
    );
  });

  it('rejects a wrong current password', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 4, password: 'hash' });
    (argon.verify as jest.Mock).mockResolvedValue(false);
    await expect(
      service.changePassword(4, {
        currentPassword: 'bad',
        newPassword: 'NewPass1!',
        confirmPassword: 'NewPass1!',
      }),
    ).rejects.toThrow('Mật khẩu hiện tại không chính xác');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
