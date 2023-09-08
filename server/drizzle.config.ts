import type { Config } from "drizzle-kit";
 
export default {
  schema: "./src/schema/*",
  out: "./drizzle",
  driver: 'turso',
  dbCredentials: {
    url: 'file:./local.db'
  }
} satisfies Config;