import { AuthService } from './auth.service';
import { UserStatus } from '../generated/prisma/enums';
import * as argon from 'argon2';

jest.mock('argon2', () => ({ verify: jest.fn() }));

describe('AuthService account status', () => {
  const userService = { findUserValidate: jest.fn() };
  const service = new AuthService(
    userService as any,
    {} as any,
    {} as any,
    {} as any,
  );

  beforeEach(() => jest.clearAllMocks());

  it.each([UserStatus.INACTIVE, UserStatus.BLOCKED])(
    'rejects login for %s accounts before password verification',
    async (status) => {
      userService.findUserValidate.mockResolvedValue({
        id: 1,
        password: 'hash',
        status,
      });
      await expect(
        service.validateUser('0123456789', 'secret'),
      ).rejects.toThrow('Tài khoản không tồn tại hoặc bị khóa');
      expect(argon.verify).not.toHaveBeenCalled();
    },
  );

  it('allows credential validation for active accounts', async () => {
    userService.findUserValidate.mockResolvedValue({
      id: 1,
      phone: '0123456789',
      name: 'A',
      role: 'PLAYER',
      password: 'hash',
      status: UserStatus.ACTIVE,
    });
    (argon.verify as jest.Mock).mockResolvedValue(true);
    await expect(
      service.validateUser('0123456789', 'secret'),
    ).resolves.toMatchObject({ id: 1, role: 'PLAYER' });
  });
});
