import { Injectable } from '@nestjs/common';
import { LibSQLDatabase, drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import config from 'drizzle.config';

@Injectable()
export class DatabaseService {
  db: LibSQLDatabase<Record<string, never>>;
  constructor() {
    this.db = drizzle(createClient(config.dbCredentials));
  }
}
