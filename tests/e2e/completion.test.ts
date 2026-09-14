import { describe, expect, it } from "vitest";
import { runCli } from "../helpers/cli.js";

describe("bulk completion", () => {
  it.each(["bash", "zsh", "fish", "powershell"])(
    "generates a %s script naming every plugin command",
    async (shell) => {
      const { stdout, exitCode } = await runCli(["completion", shell], {
        maxBuffer: 64 * 1024 * 1024,
      });
      expect(exitCode).toBe(0);
      expect(stdout.length).toBeGreaterThan(1000);
      expect(stdout).toContain("ntsb-reports");
      expect(stdout).toContain("openlibrary");
      expect(stdout).toContain("dry-run");
    },
  );
  it("rejects an unknown shell", async () => {
    const { exitCode, stderr } = await runCli(["completion", "tcsh"]);
    expect(exitCode).toBe(1);
    expect(stderr).toContain("Unknown shell: tcsh");
  });
});
