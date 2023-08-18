import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

export type OnCreateUser = { username: string; password: string };

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async createUser({username, password}: OnCreateUser): Promise<boolean> {
    if (await this.findOneByUsername(username)) {
      return false;
    }
    // TODO: validate password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    let new_user = this.usersRepository.create();
    new_user.username = username;
    new_user.password_hash = passwordHash;
    await this.usersRepository.save(new_user);
    return true;
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  findOneByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ username });
  }

  findOneById(id: number): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

  async remove(id: number): Promise<void> {
    await this.usersRepository.delete(id);
  }
}
