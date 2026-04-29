import { parsePositiveInteger } from "./repo.js";

export type StdoutMode = "summary" | "json" | "index" | "none";

export type ArgSpec = {
  string?: readonly string[];
  number?: readonly string[];
  boolean?: readonly string[];
  stdout?: readonly StdoutMode[];
};

export type ParsedArgs = {
  strings: Record<string, string>;
  numbers: Record<string, number>;
  booleans: Record<string, boolean>;
  stdout?: StdoutMode;
};

export function parseArgs(argv: readonly string[], spec: ArgSpec): ParsedArgs {
  const stringFlags = new Set(spec.string ?? []);
  const numberFlags = new Set(spec.number ?? []);
  const booleanFlags = new Set(spec.boolean ?? []);
  const stdoutModes = spec.stdout ? new Set<StdoutMode>(spec.stdout) : undefined;
  const parsed: ParsedArgs = { strings: {}, numbers: {}, booleans: {} };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const nextValue = (): string => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
      index += 1;
      return value;
    };

    if (stringFlags.has(arg)) parsed.strings[arg] = nextValue();
    else if (numberFlags.has(arg)) parsed.numbers[arg] = parsePositiveInteger(nextValue(), arg);
    else if (booleanFlags.has(arg)) parsed.booleans[arg] = true;
    else if (arg === "--stdout") {
      const mode = nextValue() as StdoutMode;
      if (!stdoutModes?.has(mode)) throw new Error(`--stdout must be one of ${[...(stdoutModes ?? [])].join(", ")}`);
      parsed.stdout = mode;
    } else if (arg === "-h" || arg === "--help") {
      parsed.booleans["--help"] = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}
