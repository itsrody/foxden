// Node CLI runner for the mocha suite in test/test.js
// Loads the same fixtures as test/test.html, but sources are supplied by loadSources().
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import Mocha from 'mocha';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.dirname(testDir);

async function loadSources() {
	const moduleFiles = ['src/shared/urlkey.js', 'src/shared/mime.js', 'src/shared/googlefonts.js', 'src/shared/csp.js', 'src/fonts.js', 'src/shared/perf.js', 'src/vendor.js', 'src/cache.js', 'src/stats.js', 'src/shared/timing.js', 'src/shared/cssfix.js'];
	for (const rel of moduleFiles)
		Object.assign(globalThis, await import(pathToFileURL(path.join(rootDir, rel)).href));
}

function loadFixtures() {
	globalThis.urls = {};
	const fixtures = readdirSync(testDir)
		.filter(f => /^cdn-.*\.js$/.test(f))
		.sort();
	for (const f of fixtures)
		vm.runInThisContext(readFileSync(path.join(testDir, f), 'utf8'), { filename: path.join(testDir, f) });
}

await loadSources();
globalThis.chai = await import('chai');
loadFixtures();

const mocha = new Mocha({ reporter: 'spec', timeout: 60000 });
mocha.suite.emit('pre-require', globalThis, path.join(testDir, 'test.js'), mocha);
vm.runInThisContext(readFileSync(path.join(testDir, 'test.js'), 'utf8'), { filename: path.join(testDir, 'test.js') });

mocha.run(failures => {
	process.exitCode = failures ? 1 : 0;
});
