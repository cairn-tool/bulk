/** Exit statuses a command may decide on its own. 130 is the conventional "interrupted by Ctrl-C". */
export type ExitStatus = 1 | 2 | 130;

export class CommandExit extends Error {
  constructor(readonly exitCode: ExitStatus) {
    super(`Command exited with status ${exitCode}`);
    this.name = "CommandExit";
  }
}

/** Stop an action without terminating the process; the CLI boundary assigns the exit code. */
export function terminate(exitCode: ExitStatus): never {
  throw new CommandExit(exitCode);
}
