import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Database URL from environment
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Create postgres client
const client = postgres(databaseUrl, {
  max: 20,
  idle_timeout: 30,
});

// Create drizzle instance
export const db = drizzle(client, { schema });

// For serverless environments, you might want:
// const client = postgres(databaseUrl, { prepare: false })
// export const db = drizzle(client, { schema })

export type Database = typeof db;
