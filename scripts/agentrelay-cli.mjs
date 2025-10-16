#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const electronAppDir = join(repoRoot, "electron-app");
const electronDistEntry = join(electronAppDir, "dist", "main", "main.js");

function run(command, args, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: process.env,
      ...options,
    });
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise(undefined);
      } else {
        rejectPromise(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

function parseArgs(argv) {
  const passthrough = [];
  let packageBuild = false;
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "package" || value === "--package" || value === "--dist") {
      packageBuild = true;
    } else if (value === "--headless" || value === "--no-ui") {
      passthrough.push(value);
    } else {
      passthrough.push(value);
    }
  }
  return { packageBuild, passthrough };
}

const args = process.argv.slice(2);
const { passthrough, packageBuild } = parseArgs(args);

async function main() {
  if (packageBuild) {
    await run("npm", ["run", "dist"], { cwd: electronAppDir });
    return;
  }

  await run("npm", ["run", "build"], { cwd: electronAppDir });
  const electronBin = process.platform === "win32" ? "npx.cmd" : "npx";
  const electronArgs = ["electron", electronDistEntry, ...passthrough];
  await run(electronBin, electronArgs, { cwd: electronAppDir });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
