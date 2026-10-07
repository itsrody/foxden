"use strict";
// Redirect-stage latency observability: per-stage count/avg/max, aggregated in
// memory and exposed through the getStats message. Overhead is three
// performance.now() calls per redirect (~100ns) — no behavior change.

const stages = new Map();

export function timeStage(name, startMs)
{
	const dt = performance.now() - startMs;
	let agg = stages.get(name);
	if (!agg)
	{
		agg = { count: 0, total: 0, max: 0 };
		stages.set(name, agg);
	}
	agg.count++;
	agg.total += dt;
	if (dt > agg.max)
		agg.max = dt;
}

export function getTimingStats()
{
	const out = {};
	for (const [name, agg] of stages)
		out[name] = { count: agg.count, avgMs: agg.count ? agg.total / agg.count : 0, maxMs: agg.max };
	return out;
}

export function resetTiming()
{
	stages.clear();
}
