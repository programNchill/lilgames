import { Injectable } from '@nestjs/common';
import {  UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from 'src/users/user.entity';

// TODO: user a real hasher
const NB_SALT_ROUNDS = 5
const hasher = (password: string) => bcrypt.hash(password, NB_SALT_ROUNDS);


export type ValidatedUser = Omit<User, 'passwordHash'>;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<ValidatedUser | null> {
    const user = await this.usersService.findOneByUsername(username);
    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: ValidatedUser) {
    const payload = { username: user.username, userId: user.id };
    
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
