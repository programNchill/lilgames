import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller("user/lol")
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("lolwat")
  getHello(): string {
    return this.appService.getHello();
  }

}
