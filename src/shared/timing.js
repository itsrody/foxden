"use strict";
// Redirect-stage latency observability: per-stage count/avg/max, aggregated in
// memory and exposed through the getStats message. Overhead is three
// performance.now() calls per redirect (~100ns) — no behavior change.

const stages = new Map();
let servedBytesTotal = 0;
let httpCacheHits = 0;
let fpHits = 0;
let fpMismatch = 0;

// In-flight webRequest correlation: beginRequest records the channel start
// (webRequest epoch-ms timestamps), endRequest resolves it on completion.
// Non-blocking observers only — never awaited in the redirect path.
const pending = new Map();
const PENDING_MAX = 5000;

export function beginRequest(requestId, t0EpochMs)
{
	if (pending.size >= PENDING_MAX)
		pending.clear();
	pending.set(requestId, t0EpochMs);
}

export function endRequest(requestId, endEpochMs)
{
	const t0 = pending.get(requestId);
	pending.delete(requestId);
	return t0 === undefined ? null : Math.max(0, endEpochMs - t0);
}

export function cancelRequestTiming(requestId)
{
	pending.delete(requestId);
}

export function timeStage(name, startMs)
{
	noteDuration(name, performance.now() - startMs);
}

export function noteDuration(name, ms)
{
	let agg = stages.get(name);
	if (!agg)
	{
		agg = { count: 0, total: 0, max: 0 };
		stages.set(name, agg);
	}
	agg.count++;
	agg.total += ms;
	if (ms > agg.max)
		agg.max = ms;
}

// Bytes the page received without touching the CDN (served from IndexedDB,
// hot cache or vendor bundle) — the avoided network transfer.
export function noteServedBytes(n)
{
	if (typeof n === "number" && n > 0)
		servedBytesTotal += n;
}

export function noteHttpCache()
{
	httpCacheHits++;
}

// First-party routing outcomes: served from cache vs hash-mismatched
// pass-through. Silent misses (unknown basenames) are intentionally uncounted.
export function noteFpHit()
{
	fpHits++;
}

export function noteFpMismatch()
{
	fpMismatch++;
}

export function getTimingStats()
{
	const out = {};
	for (const [name, agg] of stages)
		out[name] = { count: agg.count, avgMs: agg.count ? agg.total / agg.count : 0, maxMs: agg.max };
	out.servedBytes = servedBytesTotal;
	out.httpCacheHits = httpCacheHits;
	out.fpHits = fpHits;
	out.fpMismatch = fpMismatch;
	return out;
}

export function resetTiming()
{
	stages.clear();
	servedBytesTotal = 0;
	httpCacheHits = 0;
	fpHits = 0;
	fpMismatch = 0;
	pending.clear();
}
