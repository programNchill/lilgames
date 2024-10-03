import { Controller, Request, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { User } from './schema/user';

@Controller()
export class AppController {

  @Get("test")
  getHello(): string {
    return "Hello World!";
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: {user: User}) {
    return req.user;
  }

}
