// Fails when the code every visitor downloads first grows past its budget.
// Run after `npm run build`: the heavy screens and libraries belong in their
// own lazy chunks, and this is what notices when one slips back in (#370).
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const BUDGET_KB = 380;
const dir = new URL('../dist/assets/', import.meta.url);
const entry = readdirSync(dir).find((name) => /^index-.*\.js$/.test(name));
if (!entry) { console.error('No index-*.js in dist/assets: build first.'); process.exit(1); }
const kb = gzipSync(readFileSync(new URL(entry, dir))).length / 1024;
console.log(`${entry}: ${kb.toFixed(1)} kB gzip (budget ${BUDGET_KB} kB)`);
if (kb > BUDGET_KB) { console.error('The main bundle is over budget: lazy-load what a first screen does not need.'); process.exit(1); }
