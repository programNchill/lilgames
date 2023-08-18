import { Controller, Request as DecoratorRequest, Get, Post, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { User } from './users/user.entity';

@Controller()
export class AppController {

  @Get("lolwat")
  getHello(): string {
    return "Hello lol";
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@DecoratorRequest() req: {user: User}) {
    return req.user;
  }

}
