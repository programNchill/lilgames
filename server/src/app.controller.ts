import { Controller, Request as DecoratorRequest, Get, Post, UseGuards, HttpStatus, BadRequestException } from '@nestjs/common';
import { LocalAuthGuard } from './auth/local-auth.guard';
import { AuthService } from './auth/auth.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { User } from './users/user.entity';
import { OnCreateUser, UsersService } from './users/users.service';
import { Request  } from 'express';

@Controller()
export class AppController {
  constructor(private authService: AuthService, private userService: UsersService) {}

  @Get("lolwat")
  getHello(): string {
    return "Hello lol";
  }

  @Post('auth/signup')
  async createUser(@DecoratorRequest() req: Request) {
    if (await this.userService.createUser(req.body as OnCreateUser)) {
      return;
    }

    throw new BadRequestException();
  }

  @UseGuards(LocalAuthGuard)
  @Post('auth/login')
  async login(@DecoratorRequest() req: {user: User}) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@DecoratorRequest() req: {user: User}) {
    return req.user;
  }

}
