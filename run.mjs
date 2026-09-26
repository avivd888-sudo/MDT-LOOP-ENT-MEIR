import * as esbuild from "esbuild";
import { mkdirSync } from "node:fs";
mkdirSync("test/out", { recursive: true });
await esbuild.build({ entryPoints: ["test/sim-check.ts"], bundle: true, platform: "node", format: "esm", outfile: "test/out/sim-check.mjs", logLevel: "error" });
await import("./out/sim-check.mjs");
