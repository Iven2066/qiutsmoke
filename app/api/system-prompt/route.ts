import { cookies } from "next/headers";
import { ensureTables, hasDb } from "@/lib/db";
import { sql } from "@vercel/postgres";

export async function GET() {
  try {
    if (!hasDb()) {
      return new Response("", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
    await ensureTables();
    const jar = cookies();
    let uid = jar.get("uid")?.value || "";
    if (!uid) {
      uid = crypto.randomUUID();
      jar.set("uid", uid, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
    }
    await sql`INSERT INTO users(id) VALUES (${uid}) ON CONFLICT (id) DO NOTHING`;
    const rows = await sql`SELECT system_prompt FROM user_settings WHERE user_id = ${uid}`;
    const content = rows.rows?.[0]?.system_prompt || "";
    return new Response(content, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch {
    return new Response("", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

export async function POST(req: Request) {
  try {
    if (!hasDb()) return new Response("ok", { status: 200 });
    await ensureTables();
    const jar = cookies();
    let uid = jar.get("uid")?.value || "";
    if (!uid) {
      uid = crypto.randomUUID();
      jar.set("uid", uid, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
    }
    await sql`INSERT INTO users(id) VALUES (${uid}) ON CONFLICT (id) DO NOTHING`;
    const text = await req.text();
    await sql`INSERT INTO user_settings(user_id, system_prompt, updated_at) VALUES (${uid}, ${text || ""}, now())
      ON CONFLICT (user_id) DO UPDATE SET system_prompt = EXCLUDED.system_prompt, updated_at = now()`;
    return new Response("ok", { status: 200 });
  } catch {
    return new Response("error", { status: 500 });
  }
}
