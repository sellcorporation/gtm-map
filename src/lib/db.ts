import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Production-only database connection - NO MOCK MODE
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is required. ' +
    'Please set it in your .env.local file. ' +
    'Get your connection string from Supabase: Settings > Database > Connection String (URI)'
  );
}

const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString);
const db = drizzle(client, { schema });

const profiles = schema.profiles;
const userSettings = schema.userSettings;
const companies = schema.companies;
const clusters = schema.clusters;
const ads = schema.ads;
const userSessions = schema.userSessions;

export { db, schema, profiles, userSettings, companies, clusters, ads, userSessions };
