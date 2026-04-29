import { spawnSync } from "node:child_process";

export type CommandResult = { status: number | null; stdout: string; stderr: string };

export function runAllowFailure(command: string, args: readonly string[], cwd?: string): CommandResult {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", maxBuffer: 1024 * 1024 * 50 });
  const rendered = [command, ...args].join(" ");

  if (result.error) throw new Error(`Command failed to start: ${rendered}\n${result.error.message}`);
  if (result.signal) throw new Error(`Command terminated by signal ${result.signal}: ${rendered}\n${result.stderr || result.stdout}`);

  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

export function run(command: string, args: readonly string[], cwd?: string): string {
  const result = runAllowFailure(command, args, cwd);
  if (result.status !== 0) {
    const rendered = [command, ...args].join(" ");
    const details = [result.stderr, result.stdout].filter(Boolean).join("\n");
    throw new Error(`Command failed (${result.status ?? "unknown"}): ${rendered}\n${details}`);
  }

  return result.stdout.trim();
}
