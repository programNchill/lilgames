import { Injectable } from '@nestjs/common';
import { User, Users } from '../schema/user';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './users.dto';
import { DatabaseService } from 'src/database/database.service';
import { eq } from 'drizzle-orm';


@Injectable()
export class UsersService {
  constructor(
    private databaseService: DatabaseService,
  ) {}

  async create({username, password}: CreateUserDto): Promise<boolean> {
    if (await this.findOneByUsername(username)) {
      return false;
    }
    // TODO: validate password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    await this.databaseService.db.insert(Users).values({username, passwordHash});
    return true;
  }

  async findAll(): Promise<User[]> {
    return await this.databaseService.db.select().from(Users).all();
  }

  async findOneByUsername(username: string): Promise<User | null> {
    const maybeUser = await this.databaseService.db.select().from(Users).where(eq(Users.username, username)).limit(1);
    return maybeUser ? maybeUser[0] : null;
  }

  async findOneById(id: number): Promise<User | null> {
    const maybeUser = await this.databaseService.db.select().from(Users).where(eq(Users.id, id)).limit(1);
    return maybeUser ? maybeUser[0] : null;
  }

  async remove(id: number): Promise<void> {
    await this.databaseService.db.delete(Users).where(eq(Users.id, id));
  }
}
