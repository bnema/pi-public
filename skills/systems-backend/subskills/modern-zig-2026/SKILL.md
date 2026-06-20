---
name: modern-zig-2026
description: Use when writing, porting, or reviewing Zig code against recent 2026-era Zig versions, including Zig 0.16+ language changes, std.Io, build system changes, stdlib API shifts, testing, and idiomatic modern Zig patterns.
---

# Modern Zig 2026

## Core Principle

Write against the current Zig model, not older blog posts or 0.11–0.15 habits. Verify signatures in the installed stdlib or official release notes, then prefer explicit dependencies, pure inputs, unmanaged containers, and `std.Io` for nondeterministic or blocking work.

## First Checks

- Run `zig version`; do not assume API compatibility across Zig minors.
- Check official release notes and installed source for unfamiliar APIs.
- If porting, expect large but mechanical diffs; avoid compatibility shims unless the project intentionally supports multiple Zig versions.
- Prefer simple breaking changes in v0.x libraries over legacy wrappers.

## 2026 Idioms to Prefer

| Area | Prefer |
|---|---|
| Entry point | `pub fn main(init: std.process.Init) !void` when app code needs IO, args, env, allocators |
| IO / nondeterminism | Pass `io: std.Io` like `allocator: std.mem.Allocator` |
| Tests | `std.testing.allocator` and `std.testing.io` |
| Filesystem | `std.Io.Dir` / `std.Io.File`; methods usually take `io` |
| Stdio | `std.Io.File.stdout().writeStreamingAll(io, bytes)` or a writer |
| Randomness | `io.random(buf)`; use `io.randomSecure(buf)` when process-memory RNG state is unacceptable |
| Time | `std.Io.Timestamp`, `Duration`, `Clock`, `Timeout` |
| Concurrency | `io.async`, `io.concurrent`, `std.Io.Group`; always handle cancellation |
| Sync | `std.Io.Mutex`, `Condition`, `Semaphore`, `RwLock`, `Event` when tasks may interact with IO runtimes |
| Containers | Unmanaged/container `.empty` style; pass allocator to mutating methods |
| Metaprogramming | New builtins like `@Int`, `@Struct`, `@Union`, `@Enum`, `@Fn`, `@Pointer` instead of `@Type` |
| C interop | Prefer build-system `addTranslateC` over new `@cImport` usage |
| Env / args | Access at `main`; pass needed values downward instead of reading globals |
| Paths | Prefer pure `std.fs.path` APIs with explicit cwd/env inputs where required |

## Minimal Application Shape

```zig
const std = @import("std");

pub fn main(init: std.process.Init) !void {
    const gpa = init.gpa;
    const io = init.io;

    const args = try init.minimal.args.toSlice(init.arena.allocator());
    _ = args;

    try run(gpa, io, init.environ_map);
}

fn run(gpa: std.mem.Allocator, io: std.Io, env: *const std.process.Environ.Map) !void {
    _ = gpa;
    _ = env;
    try std.Io.File.stdout().writeStreamingAll(io, "ok\n");
}
```

## Porting Hotspots

- `std.io` -> `std.Io`; `GenericReader`/`AnyReader` -> `std.Io.Reader`.
- `std.fs.cwd()` -> `std.Io.Dir.cwd()`; `std.fs.File`/`Dir` -> `std.Io.File`/`Dir`.
- `std.crypto.random.bytes(buf)` -> `io.random(buf)`.
- `std.Thread.Pool` / `WaitGroup` -> `std.Io.Group` or futures.
- `std.Thread` sync primitives -> `std.Io` equivalents when used with task IO.
- `@Type(...)` -> specific type-creating builtins.
- `std.process.getCwdAlloc` -> `std.process.currentPathAlloc(io, allocator)`.
- Managed maps/queues are often removed or renamed to unmanaged/module variants; look for `.empty`, `push`, `pop`, and allocator-per-call APIs.
- `std.process.Child` spawn/run helpers -> `std.process.spawn` / `std.process.run` with `io`.

## Cancellation and Async Rules

- Use `io.async` for independent work; use `io.concurrent` when simultaneous execution is required for correctness and handle `error.ConcurrencyUnavailable`.
- After creating a future, `defer` cancellation unless all paths await it.
- `cancel` may return a successful resource; clean it up.
- Propagate `error.Canceled` unless this code requested the cancellation; if swallowing it, usually call `io.recancel()`.

## Common Mistakes

- Copying old Zig examples without checking version.
- Creating `std.Io.Threaded` inside library functions instead of accepting `io`.
- Treating env vars, cwd, random, time, process spawning, and filesystem as harmless globals.
- Keeping managed-container habits after APIs moved to unmanaged/`.empty` patterns.
- Using `@cImport` for new code when build-system C translation is the intended direction.
- Assuming experimental `Io.Evented` is production-ready; default to `Io.Threaded` unless intentionally experimenting.

## Source Anchors

When uncertain, consult Zig 0.16+ release notes sections: “I/O as an Interface”, “Juicy Main”, “Environment Variables and Process Arguments Become Non-Global”, “@Type Replaced…”, “@cImport Moving to Build System”, “Migration to Unmanaged Containers”, “Thread.Pool Removed”, filesystem/process/time/randomness changes, and build-system changes.
