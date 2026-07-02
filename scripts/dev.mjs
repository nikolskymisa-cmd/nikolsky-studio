import { spawn } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const children = [];

const start = (name, args) => {
  const child = spawn(process.execPath, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  children.push(child);
  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`${name} exited with code ${code}`);
      stopAll(code);
    }
  });
};

const stopAll = (code = 0) => {
  for (const child of children) child.kill();
  process.exit(code);
};

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));

start("admin-api", [join(root, "scripts", "admin-api.mjs")]);
start("next", [join(root, "node_modules", "next", "dist", "bin", "next"), "dev"]);
