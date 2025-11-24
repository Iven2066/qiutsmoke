import { sql } from "@vercel/postgres";

export async function ensureTables() {
  await sql`CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY, created_at timestamptz DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS user_settings (
    user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    system_prompt text,
    quit_date date,
    updated_at timestamptz DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS user_prompts (
    user_id text REFERENCES users(id) ON DELETE CASCADE,
    topic_id text,
    prompt text,
    updated_at timestamptz DEFAULT now(),
    PRIMARY KEY (user_id, topic_id)
  )`;
}
