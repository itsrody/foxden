#!/usr/bin/env node
// Generates resources/fonts/manifest.json listing bundled font families,
// replacing the old runtime directory-listing fetch of resources/fonts/.
import { readdirSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const fontsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'resources', 'fonts');
const outFile = path.join(fontsDir, 'manifest.json');

const families = {};
for (const name of readdirSync(fontsDir).sort())
{
	const full = path.join(fontsDir, name);
	if (!statSync(full).isDirectory())
		continue;
	families[name] = readdirSync(full).filter(f => statSync(path.join(full, f)).isFile()).sort();
}

const manifest = {
	generatedBy: 'tools/build-fonts-manifest.mjs',
	families,
};
writeFileSync(outFile, JSON.stringify(manifest, null, '\t') + '\n');
console.log(`wrote ${path.relative(process.cwd(), outFile)}: ${Object.keys(families).length} families, ${Object.values(families).reduce((n, f) => n + f.length, 0)} files`);
