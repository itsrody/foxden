#!/usr/bin/env node
// Downloads pinned vendor libraries from cdnjs/jsdelivr/unpkg and writes
// resources/vendor/manifest.json keyed by cache UID.
// Each lib lists alias source URLs (one per CDN naming scheme); every alias
// UID maps to the same file, so cross-CDN requests share the bundle without
// touching the parsers. Re-run to bump pins: npm run build:vendor
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getUID } from '../src/shared/urlkey.js';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const vendorDir = path.join(rootDir, 'resources', 'vendor');

// { file, version, sources }: first source is downloaded; all sources are
// registered as UID keys for the same file.
const VENDOR = [
	// current pins (already bundled)
	{ file: 'jquery/jquery-3.7.1.min.js', version: '3.7.1', sources: [
		'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js',
		'https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js',
	] },
	{ file: 'lodash/lodash-4.17.21.min.js', version: '4.17.21', sources: [
		'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js',
		'https://unpkg.com/lodash@4.17.21/lodash.min.js',
	] },
	{ file: 'bootstrap/js/bootstrap-5.3.3.min.js', version: '5.3.3', sources: [
		'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/js/bootstrap.min.js',
	] },
	{ file: 'bootstrap/css/bootstrap-5.3.3.min.css', version: '5.3.3', sources: [
		'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css',
	] },
	{ file: 'react/react-18.3.1.min.js', version: '18.3.1', sources: [
		'https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js',
	] },
	// Tier A — tiny + massive reach
	{ file: 'dayjs/dayjs-1.11.13.min.js', version: '1.11.13', sources: [
		'https://cdnjs.cloudflare.com/ajax/libs/dayjs/1.11.13/dayjs.min.js',
		'https://cdn.jsdelivr.net/npm/dayjs@1.11.13/dayjs.min.js',
	] },
	{ file: 'underscore/underscore-1.13.7.min.js', version: '1.13.7', sources: [
		'https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.13.7/underscore-min.js',
		'https://cdn.jsdelivr.net/npm/underscore@1.13.7/underscore-min.js',
	] },
	{ file: 'popper/popper-2.11.8.min.js', version: '2.11.8', sources: [
		'https://cdnjs.cloudflare.com/ajax/libs/popper.js/2.11.8/umd/popper.min.js',
		'https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.8/dist/umd/popper.min.js',
	] },
	{ file: 'backbone/backbone-1.6.0.min.js', version: '1.6.0', sources: [
		'https://cdnjs.cloudflare.com/ajax/libs/backbone.js/1.6.0/backbone-min.js',
	] },
	{ file: 'axios/axios-1.8.4.min.js', version: '1.8.4', sources: [
		'https://cdnjs.cloudflare.com/ajax/libs/axios/1.8.4/axios.min.js',
		'https://cdn.jsdelivr.net/npm/axios@1.8.4/dist/axios.min.js',
	] },
	{ file: 'moment/moment-2.30.1.min.js', version: '2.30.1', sources: [
		'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js',
		'https://cdn.jsdelivr.net/npm/moment@2.30.1/min/moment.min.js',
	] },
	// Tier B — legacy EOL, frozen forever
	{ file: 'jquery/jquery-1.12.4.min.js', version: '1.12.4', sources: [
		'https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.4/jquery.min.js',
		'https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js',
	] },
	{ file: 'bootstrap/js/bootstrap-3.3.7.min.js', version: '3.3.7', sources: [
		'https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.7/js/bootstrap.min.js',
		'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js',
	] },
	{ file: 'bootstrap/css/bootstrap-3.3.7.min.css', version: '3.3.7', sources: [
		'https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.7/css/bootstrap.min.css',
	] },
	{ file: 'angular/angular-1.8.3.min.js', version: '1.8.3', sources: [
		'https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.8.3/angular.min.js',
		'https://ajax.googleapis.com/ajax/libs/angularjs/1.8.3/angular.min.js',
	] },
	// Tier F — firefoxification parity libs
	{ file: 'webrtc-adapter/adapter-9.0.1.min.js', version: '9.0.1', sources: [
		'https://cdnjs.cloudflare.com/ajax/libs/webrtc-adapter/9.0.1/adapter.min.js',
		'https://cdn.jsdelivr.net/npm/webrtc-adapter@9.0.1/out/adapter.js',
	] },
	{ file: 'hls/hls-1.6.5.min.js', version: '1.6.5', sources: [
		'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.6.5/hls.min.js',
		'https://cdn.jsdelivr.net/npm/hls.js@1.6.5/dist/hls.min.js',
	] },
	{ file: 'plyr/plyr-3.8.3.min.js', version: '3.8.3', sources: [
		'https://cdnjs.cloudflare.com/ajax/libs/plyr/3.8.3/plyr.min.js',
		'https://cdn.jsdelivr.net/npm/plyr@3.8.3/dist/plyr.min.js',
	] },
	// Tier G — tiny + ubiquitous
	{ file: 'alpinejs/alpine-3.15.0.min.js', version: '3.15.0', sources: [
		'https://cdnjs.cloudflare.com/ajax/libs/alpinejs/3.15.0/cdn.min.js',
		'https://unpkg.com/alpinejs@3.15.0/dist/cdn.min.js',
	] },
	{ file: 'htmx/htmx-2.0.4.min.js', version: '2.0.4', sources: [
		'https://cdnjs.cloudflare.com/ajax/libs/htmx/2.0.4/htmx.min.js',
		'https://cdn.jsdelivr.net/npm/htmx.org@2.0.4/dist/htmx.min.js',
	] },
	{ file: 'socket.io/socket.io-4.8.1.min.js', version: '4.8.1', sources: [
		'https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.8.1/socket.io.min.js',
		'https://cdn.jsdelivr.net/npm/socket.io-client@4.8.1/dist/socket.io.min.js',
	] },
];

const libs = {};
let totalBytes = 0;
for (const { file, version, sources } of VENDOR)
{
	const dest = path.join(vendorDir, file);
	mkdirSync(path.dirname(dest), { recursive: true });
	const resp = await fetch(sources[0], { signal: AbortSignal.timeout(30000) });
	if (!resp.ok)
		throw new Error(`HTTP ${resp.status} for ${sources[0]}`);
	const buf = Buffer.from(await resp.arrayBuffer());
	writeFileSync(dest, buf);
	totalBytes += buf.length;
	for (const src of sources)
	{
		const { uid } = getUID(new URL(src));
		if (libs[uid] && libs[uid].file !== file)
			throw new Error(`UID collision: ${uid} maps to ${libs[uid].file} and ${file}`);
		libs[uid] = { file, version };
	}
	console.log(`${String(buf.length).padStart(7)}B  ${file}  (${sources.length} keys)`);
}

const outFile = path.join(vendorDir, 'manifest.json');
writeFileSync(outFile, JSON.stringify({ generatedBy: 'tools/build-vendor-manifest.mjs', libs }, null, '\t') + '\n');
console.log(`wrote ${path.relative(process.cwd(), outFile)}: ${Object.keys(libs).length} keys, ${VENDOR.length} files, ${totalBytes}B`);
