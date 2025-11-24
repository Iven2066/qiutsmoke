import { cookies } from "next/headers";
import { ensureTables, hasDb } from "@/lib/db";
import { sql } from "@vercel/postgres";

export async function GET() {
  try {
    if (!hasDb()) return new Response(JSON.stringify({ quitDate: null }), { status: 200, headers: { "Content-Type": "application/json" } });
    await ensureTables();
    const jar = cookies();
    let uid = jar.get("uid")?.value || "";
    if (!uid) {
      uid = crypto.randomUUID();
      jar.set("uid", uid, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
    }
    await sql`INSERT INTO users(id) VALUES (${uid}) ON CONFLICT (id) DO NOTHING`;
    const rows = await sql`SELECT quit_date FROM user_settings WHERE user_id = ${uid}`;
    const d = rows.rows?.[0]?.quit_date || null;
    return new Response(JSON.stringify({ quitDate: d }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ quitDate: null }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
}

export async function POST(req: Request) {
  try {
    if (!hasDb()) return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    await ensureTables();
    const jar = cookies();
    let uid = jar.get("uid")?.value || "";
    if (!uid) {
      uid = crypto.randomUUID();
      jar.set("uid", uid, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
    }
    await sql`INSERT INTO users(id) VALUES (${uid}) ON CONFLICT (id) DO NOTHING`;
    const body = await req.json();
    const qd = body?.quitDate ? String(body.quitDate) : null;
    await sql`INSERT INTO user_settings(user_id, quit_date, updated_at) VALUES (${uid}, ${qd}, now())
      ON CONFLICT (user_id) DO UPDATE SET quit_date = EXCLUDED.quit_date, updated_at = now()`;
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ error: "保存失败" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
