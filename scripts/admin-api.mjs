import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const root = process.cwd();
const port = Number(process.env.ADMIN_API_PORT || 4317);
const allowedOrigins = new Set(["http://127.0.0.1:3000", "http://localhost:3000"]);

const send = (response, status, data) => {
  response.writeHead(status, response.localsHeaders);
  response.end(JSON.stringify(data));
};

const readBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
};

const runGit = async (args) => {
  const { stdout, stderr } = await exec("git", args, { cwd: root });
  return `${stdout}${stderr}`.trim();
};

const server = createServer(async (request, response) => {
  const origin = request.headers.origin;
  response.localsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "http://127.0.0.1:3000",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
  };

  if (request.method === "OPTIONS") return send(response, 200, { ok: true });

  try {
    if (request.method === "GET" && request.url === "/health") {
      return send(response, 200, { ok: true, message: "Admin API работает" });
    }

    if (request.method === "GET" && request.url === "/content") {
      const [content, works] = await Promise.all([
        readFile(join(root, "data", "landing-content.json"), "utf8"),
        readFile(join(root, "data", "works.json"), "utf8"),
      ]);
      return send(response, 200, { ok: true, content: JSON.parse(content), works: JSON.parse(works) });
    }

    if (request.method === "POST" && request.url === "/save") {
      const body = await readBody(request);
      await Promise.all([
        writeFile(join(root, "data", "landing-content.json"), `${JSON.stringify(body.content, null, 2)}\n`, "utf8"),
        writeFile(join(root, "data", "works.json"), `${JSON.stringify(body.works, null, 2)}\n`, "utf8"),
      ]);
      return send(response, 200, { ok: true, message: "Сохранено в data/*.json" });
    }

    if (request.method === "POST" && request.url === "/publish") {
      const changed = await runGit(["status", "--porcelain", "--", "data/landing-content.json", "data/works.json"]);
      if (!changed) return send(response, 200, { ok: true, message: "Изменений в data нет. GitHub уже актуален." });

      await runGit(["add", "data/landing-content.json", "data/works.json"]);
      await runGit(["commit", "-m", "Update portfolio content"]);
      const output = await runGit(["push"]);
      return send(response, 200, { ok: true, message: "Запушено. GitHub Pages пересобирается.", output });
    }

    return send(response, 404, { ok: false, message: "Не найдено" });
  } catch (error) {
    return send(response, 500, { ok: false, message: error instanceof Error ? error.message : "Ошибка admin API" });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Admin API: http://127.0.0.1:${port}`);
});
