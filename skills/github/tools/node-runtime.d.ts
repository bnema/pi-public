declare module "node:child_process" {
  export type SpawnSyncReturns<T> = {
    status: number | null;
    signal: string | null;
    error?: Error;
    stdout: T;
    stderr: T;
  };

  export function spawnSync(
    command: string,
    args?: readonly string[],
    options?: { cwd?: string; encoding?: "utf8"; maxBuffer?: number },
  ): SpawnSyncReturns<string>;
}

declare module "node:fs" {
  export function lstatSync(path: string): { isSymbolicLink(): boolean };
  export function mkdirSync(path: string, options?: { recursive?: boolean; mode?: number }): string | undefined;
  export function mkdtempSync(prefix: string): string;
  export function readFileSync(path: string, encoding: "utf8"): string;
  export function realpathSync(path: string): string;
  export function writeFileSync(
    file: string,
    data: string,
    options?: { encoding?: "utf8"; mode?: number; flag?: string },
  ): void;
}

declare module "node:os" {
  export function tmpdir(): string;
}

declare module "node:path" {
  export function dirname(path: string): string;
  export function join(...paths: string[]): string;
  export function relative(from: string, to: string): string;
}

declare const process: {
  argv: string[];
  cwd(): string;
  exit(code?: number): never;
  exitCode?: number;
};

declare const console: Console;

declare const Buffer: {
  from(value: string, encoding: "utf8"): { byteLength: number; subarray(start: number, end?: number): { toString(encoding: "utf8"): string } };
};
