import { Controller, Request , Post, UseGuards, BadRequestException, Body } from '@nestjs/common';

import { CreateUserDto } from 'src/users/users.dto';
import { AuthService, ValidatedUser } from './auth.service';
import { UsersService } from 'src/users/users.service';
import { LocalAuthGuard } from './local-auth.guard';

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService, private userService: UsersService) {}

  @Post('signup')
  async createUser(@Body() user: CreateUserDto) {
    if (await this.userService.create(user)) {
      return;
    }

    throw new BadRequestException();
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req: {user: ValidatedUser}) {
    return this.authService.login(req.user);
  }

}
