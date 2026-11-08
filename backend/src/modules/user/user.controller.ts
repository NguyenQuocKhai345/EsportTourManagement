import { Controller } from '@nestjs/common';
import { UserService } from './user.service';

@Controller({
  path: 'users',
  version: '1'
})
export class UserController {
  constructor(private readonly userService: UserService) {}
}
