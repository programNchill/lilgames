import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';


export const Users = sqliteTable('users', {
  id: integer('id').primaryKey(),
  username: text('username').notNull(),
  passwordHash: text('passwordHash').notNull(),
});

export type User = typeof Users.$inferSelect;