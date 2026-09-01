import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import { schema } from "./schema.js";

let cachedDb: NeonHttpDatabase<typeof schema> | null = null;

export const getDb = () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured.");
  if (!cachedDb) cachedDb = drizzle({ client: neon(url), schema });
  return cachedDb;
};
