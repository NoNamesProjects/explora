/**
 * Production server build for the cPanel / Passenger (Express) path.
 *
 * `npm run build` only emits the SPA (tsc --noEmit + vite build) — it does NOT
 * transpile the api/ handlers. But server.js imports COMPILED `./api/*.js`
 * (plain `node server.js`, no tsx loader), so without this step every /api/*
 * route silently fails to mount on cPanel.
 *
 * This bundles each api/**\/*.ts handler with esbuild → a mirrored api/**\/*.js
 * sitting next to the source, so server.js's existing import paths resolve
 * unchanged. lib/** is inlined into each handler; node_modules stay external
 * (installed on the host). Dev (vite-plugin-api.ts) keeps loading the .ts
 * directly, so the emitted .js never collides with the source of truth.
 */
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { readdirSync, statSync, rmSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = join(root, 'api');

/** Recursively collect every `.ts` file under api/ (handlers + nested routes). */
function collectEntries(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) out.push(...collectEntries(abs));
    else if (name.endsWith('.ts')) out.push(abs);
  }
  return out;
}

/** Remove any stale emitted .js so a renamed/removed handler can't linger. */
function cleanEmitted(dir: string): void {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) cleanEmitted(abs);
    else if (name.endsWith('.js')) rmSync(abs);
  }
}

async function main() {
  cleanEmitted(apiDir);
  const entryPoints = collectEntries(apiDir);
  if (!entryPoints.length) throw new Error('no api/*.ts handlers found');

  await build({
    entryPoints,
    outbase: root,
    outdir: root, // mirrors api/ structure → api/**/*.js next to the sources
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    packages: 'external', // express, postgres, neon, zod, xlsx, resend stay external
    sourcemap: false,
    logLevel: 'info',
    // Defensive: resolve the project path aliases if any lib file uses them.
    alias: { '@lib': join(root, 'lib'), '@': join(root, 'src') },
  });

  console.log(`\n[build-server] emitted ${entryPoints.length} handlers:`);
  for (const e of entryPoints) {
    console.log(`  api/${relative(apiDir, e).replace(/\.ts$/, '.js')}`);
  }
}

main().catch((err) => {
  console.error('[build-server] failed:', err);
  process.exit(1);
});
