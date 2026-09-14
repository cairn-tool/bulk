import { execFile, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

export const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const cliPath = path.join(repoRoot, "dist", "cli.js");

const exec = promisify(execFile);

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/** Runs the compiled CLI and captures everything, whatever the exit status. */
export async function runCli(
  args: string[],
  opts: { env?: NodeJS.ProcessEnv; cwd?: string; maxBuffer?: number } = {},
): Promise<CliResult> {
  try {
    const { stdout, stderr } = await exec(process.execPath, [cliPath, ...args], {
      env: { ...process.env, CI: "1", ...opts.env },
      cwd: opts.cwd,
      maxBuffer: opts.maxBuffer ?? 16 * 1024 * 1024,
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
      exitCode: typeof e.code === "number" ? e.code : 1,
    };
  }
}

/** Starts the CLI and returns the child, for tests that need to signal it. */
export function spawnCli(args: string[], env: NodeJS.ProcessEnv = {}) {
  return spawn(process.execPath, [cliPath, ...args], {
    env: { ...process.env, CI: "1", ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
}
