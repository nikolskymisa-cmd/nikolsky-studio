import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const root = process.cwd();
const port = Number(process.env.ADMIN_API_PORT || 4317);
const allowedOrigins = new Set(["http://127.0.0.1:3000", "http://localhost:3000"]);
const versionsDir = join(root, "data", ".versions");

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

const readContentFiles = async () => {
  const [content, works] = await Promise.all([
    readFile(join(root, "data", "landing-content.json"), "utf8"),
    readFile(join(root, "data", "works.json"), "utf8"),
  ]);
  return { content: JSON.parse(content), works: JSON.parse(works) };
};

const writeContentFiles = async ({ content, works }) => {
  await Promise.all([
    writeFile(join(root, "data", "landing-content.json"), `${JSON.stringify(content, null, 2)}\n`, "utf8"),
    writeFile(join(root, "data", "works.json"), `${JSON.stringify(works, null, 2)}\n`, "utf8"),
  ]);
};

const readVersions = async () => {
  await mkdir(versionsDir, { recursive: true });
  const files = await readdir(versionsDir);
  const versions = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map(async (file) => {
        const raw = await readFile(join(versionsDir, file), "utf8");
        const data = JSON.parse(raw);
        return { id: file.replace(/\.json$/, ""), name: data.name, createdAt: data.createdAt };
      }),
  );
  return versions.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
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
      const { content, works } = await readContentFiles();
      return send(response, 200, { ok: true, content, works });
    }

    if (request.method === "POST" && request.url === "/save") {
      const body = await readBody(request);
      await writeContentFiles(body);
      return send(response, 200, { ok: true, message: "Сохранено в data/*.json" });
    }

    if (request.method === "GET" && request.url === "/versions") {
      const versions = await readVersions();
      return send(response, 200, { ok: true, versions });
    }

    if (request.method === "POST" && request.url === "/version") {
      const body = await readBody(request);
      const snapshot = {
        name: body.name || "Версия без названия",
        createdAt: new Date().toISOString(),
        content: body.content,
        works: body.works,
      };
      await mkdir(versionsDir, { recursive: true });
      const id = snapshot.createdAt.replace(/[:.]/g, "-");
      await writeFile(join(versionsDir, `${id}.json`), `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
      return send(response, 200, { ok: true, id, message: "Версия сохранена" });
    }

    if (request.method === "POST" && request.url === "/restore") {
      const body = await readBody(request);
      const raw = await readFile(join(versionsDir, `${body.id}.json`), "utf8");
      const snapshot = JSON.parse(raw);
      await writeContentFiles({ content: snapshot.content, works: snapshot.works });
      return send(response, 200, { ok: true, content: snapshot.content, works: snapshot.works, message: "Версия восстановлена" });
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
