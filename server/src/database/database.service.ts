import { Injectable } from '@nestjs/common';
import { LibSQLDatabase, drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

@Injectable()
export class DatabaseService {
  db: LibSQLDatabase<Record<string, never>>;
  constructor() {
    this.db = drizzle(createClient({
      url: 'file:./local.db'
    }));
  }
}
