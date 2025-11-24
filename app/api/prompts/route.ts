import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "prompts.json");

function ensureFile() {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "{}", "utf-8");
}

export async function GET() {
  try {
    ensureFile();
    const content = await fs.promises.readFile(filePath, "utf-8");
    return new Response(content, {
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
    const { id, prompt } = await req.json();
    if (!id || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "参数错误" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    ensureFile();
    const content = await fs.promises.readFile(filePath, "utf-8");
    let obj: Record<string, string> = {};
    try {
      obj = JSON.parse(content) || {};
    } catch {
      obj = {};
    }
    obj[id] = prompt;
    await fs.promises.writeFile(filePath, JSON.stringify(obj), "utf-8");
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

