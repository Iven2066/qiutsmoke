import { cookies } from "next/headers";
import { ensureTables, hasDb } from "@/lib/db";
import { sql } from "@vercel/postgres";

export async function GET() {
  try {
    if (!hasDb()) return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
    await ensureTables();
    const jar = cookies();
    let uid = jar.get("uid")?.value || "";
    if (!uid) {
      uid = crypto.randomUUID();
      jar.set("uid", uid, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
    }
    await sql`INSERT INTO users(id) VALUES (${uid}) ON CONFLICT (id) DO NOTHING`;
    const res = await sql`SELECT topic_id, prompt FROM user_prompts WHERE user_id = ${uid}`;
    const obj: Record<string, string> = {};
    for (const row of res.rows || []) {
      obj[String(row.topic_id)] = String(row.prompt ?? "");
    }
    return new Response(JSON.stringify(obj), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response("{}", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(req: Request) {
  try {
    if (!hasDb()) return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    await ensureTables();
    const { id, prompt } = await req.json();
    if (!id || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "参数错误" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const jar = cookies();
    let uid = jar.get("uid")?.value || "";
    if (!uid) {
      uid = crypto.randomUUID();
      jar.set("uid", uid, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
    }
    await sql`INSERT INTO users(id) VALUES (${uid}) ON CONFLICT (id) DO NOTHING`;
    await sql`INSERT INTO user_prompts(user_id, topic_id, prompt, updated_at) VALUES (${uid}, ${String(id)}, ${prompt}, now())
      ON CONFLICT (user_id, topic_id) DO UPDATE SET prompt = EXCLUDED.prompt, updated_at = now()`;
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "保存失败" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
