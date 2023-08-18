import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './users.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create({username, password}: CreateUserDto): Promise<boolean> {
    if (await this.findOneByUsername(username)) {
      return false;
    }
    // TODO: validate password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const newUser = this.usersRepository.create({username, passwordHash: passwordHash});
    await this.usersRepository.insert(newUser);
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
