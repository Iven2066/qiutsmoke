import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "system-prompt.txt");

function ensureFile() {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "", "utf-8");
}

export async function GET() {
  try {
    ensureFile();
    const content = await fs.promises.readFile(filePath, "utf-8");
    return new Response(content || "", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch {
    return new Response("", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

export async function POST(req: Request) {
  try {
    const text = await req.text();
    ensureFile();
    await fs.promises.writeFile(filePath, text || "", "utf-8");
    return new Response("ok", { status: 200 });
  } catch {
    return new Response("error", { status: 500 });
  }
}

