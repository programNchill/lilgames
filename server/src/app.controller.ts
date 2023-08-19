import { Controller, Request, Get, UseGuards } from '@nestjs/common';
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
  getProfile(@Request() req: {user: User}) {
    return req.user;
  }

}
