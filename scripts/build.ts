import { fileURLToPath, URL } from "node:url";
import { build, write } from "bun";
import solidPlugin from "@opentui/solid/bun-plugin";

// OpenCode compiles Solid JSX only outside node_modules, so installed packages ship compiled TUI entries.
const entries = { tui: "../src/tui.tsx", cli: "../src/cli.tsx" };
const outdir = fileURLToPath(new URL("../dist", import.meta.url));

const result = await build({
  entrypoints: Object.values(entries).map((entry) => fileURLToPath(new URL(entry, import.meta.url))),
  outdir,
  naming: "[name].js",
  format: "esm",
  target: "bun",
  packages: "external",
  external: ["solid-js"],
  plugins: [solidPlugin],
});

if (!result.success) {
  for (const item of result.logs) console.error(item);
  process.exit(1);
}

await write(fileURLToPath(new URL("../dist/package.json", import.meta.url)), '{"type":"module"}\n');
