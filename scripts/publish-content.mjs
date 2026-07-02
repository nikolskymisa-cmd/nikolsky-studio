import { execFileSync } from "node:child_process";

const files = ["data/landing-content.json", "data/works.json"];

const run = (command, args, options = {}) => {
  execFileSync(command, args, { stdio: "inherit", ...options });
};

const changed = execFileSync("git", ["status", "--porcelain", "--", ...files], {
  encoding: "utf8",
});

if (!changed.trim()) {
  console.log("Нет изменений в data/*.json. Публиковать нечего.");
  process.exit(0);
}

run("git", ["add", ...files]);
run("git", ["commit", "-m", "Update portfolio content"]);
run("git", ["push"]);

console.log("Готово. GitHub Pages пересоберёт сайт через Actions.");
