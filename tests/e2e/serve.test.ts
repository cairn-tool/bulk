import { spawn } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cliPath } from "../helpers/cli.js";
import { tempEnv } from "../helpers/env.js";
import { startSourceServer, type SourceServer } from "../helpers/source-server.js";

let server: SourceServer;
let env: ReturnType<typeof tempEnv>;
beforeAll(async () => {
  server = await startSourceServer({ hosts: ["openlibrary.org", "www.ntsb.gov"] });
  env = tempEnv();
});
afterAll(async () => {
  await server.close();
  env.cleanup();
});

interface Frame {
  id?: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

/** Drives a real server over stdio: the handshake, then the requests, then EOF. */
async function session(
  requests: unknown[],
): Promise<{ frames: Frame[]; stderr: string; exitCode: number }> {
  const child = spawn(process.execPath, [cliPath, "serve", "mcp"], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...env.env, BULK_HOSTS: server.hostsEnv, CI: "1" },
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf-8").on("data", (c: string) => (stdout += c));
  child.stderr.setEncoding("utf-8").on("data", (c: string) => (stderr += c));
  const frames = [
    {
      jsonrpc: "2.0",
      id: 0,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "e2e", version: "0" },
      },
    },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    ...requests,
  ];
  for (const frame of frames) child.stdin.write(JSON.stringify(frame) + "\n");
  child.stdin.end();
  const exitCode = await new Promise<number>((resolve) =>
    child.on("close", (code) => resolve(code ?? 1)),
  );
  const parsed = stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Frame);
  return { frames: parsed, stderr, exitCode };
}

describe("bulk serve mcp", () => {
  it("lists the tools and answers a query and a list", async () => {
    const { frames, exitCode, stderr } = await session([
      { jsonrpc: "2.0", id: 1, method: "tools/list" },
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "openlibrary_query", arguments: { keys: ["9780262033848", "bad"] } },
      },
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "ntsb_reports_list", arguments: { mode: ["Marine"], limit: 5 } },
      },
      {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: "openlibrary_query", arguments: {} },
      },
      {
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: { name: "list_sources", arguments: {} },
      },
    ]);
    expect(exitCode).toBe(0);
    expect(stderr).toBe("");
    const list = frames.find((f) => f.id === 1)!.result as { tools: { name: string }[] };
    expect(list.tools.map((t) => t.name)).toContain("ntsb_reports_list");
    expect(list.tools.map((t) => t.name)).not.toContain("ntsb_reports_fetch");
    const query = frames.find((f) => f.id === 2)!.result as { content: { text: string }[] };
    const payload = JSON.parse(query.content[0].text);
    expect(payload).toMatchObject({ plugin: "openlibrary", total: 1, skipped: ["bad"] });
    expect(payload.results["9780262033848"].title).toBe("Introduction to Algorithms");
    const listed = JSON.parse(
      (frames.find((f) => f.id === 3)!.result as { content: { text: string }[] }).content[0].text,
    );
    expect(listed).toMatchObject({ plugin: "ntsb-reports", count: 1 });
    expect(listed.rows[0].stem).toBe("MAR2401");
    expect(frames.find((f) => f.id === 4)!.error?.message).toContain(
      "Invalid arguments for openlibrary_query",
    );
    const sources = JSON.parse(
      (frames.find((f) => f.id === 5)!.result as { content: { text: string }[] }).content[0].text,
    );
    expect(sources.plugins.length).toBeGreaterThan(20);
  });

  it("rejects an unknown protocol", async () => {
    const { runCli } = await import("../helpers/cli.js");
    const result = await runCli(["serve", "http"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unknown protocol: http");
  });
});
