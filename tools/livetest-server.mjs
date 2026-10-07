// Local test page server: exercises CSP patch, SRI/crossorigin stripping,
// CDN script redirect, Google Fonts CSS + bundled fonts, Report-Only patching.
import http from 'node:http';

const jquerySri = 'sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=';

const page = () => `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>jslibcache livetest</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto&display=swap">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<script src="https://code.jquery.com/jquery-3.7.1.min.js" integrity="${jquerySri}" crossorigin="anonymous"></script>
</head><body>
<p style="font-family: Roboto">Roboto sample text</p>
<p class="fa-solid fa-check" id="icon">icon</p>
<script src="/check.js"></script>
</body></html>`;

const fontPage = (familyHref, sample, familyCss) => `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>jslibcache livetest font</title>
<link rel="stylesheet" href="${familyHref}">
</head><body>
<p style="font-family: ${familyCss}">${sample}</p>
</body></html>`;

// inline scripts are blocked by the page's own CSP (no 'unsafe-inline'),
// so assertions live in a 'self' file instead
const checkJs = `window.__result = {
  jquery: typeof jQuery !== 'undefined' ? jQuery.fn.jquery : null,
  integrity: document.querySelector('script[src*=jquery]').getAttribute('integrity'),
  hasCrossorigin: document.querySelector('script[src*=jquery]').hasAttribute('crossorigin'),
  sheets: document.styleSheets.length,
};`;

let cspReports = 0;

const server = http.createServer((req, res) => {
	if (req.url.startsWith('/ping'))
	{
		res.writeHead(200, { 'Content-Type': 'text/plain' });
		res.end('pong');
		return;
	}
	if (req.url.startsWith('/reportcount'))
	{
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ count: cspReports }));
		return;
	}
	if (req.url.startsWith('/csp-report'))
	{
		cspReports++;
		req.resume();
		req.on('end', () => { res.writeHead(204); res.end(); });
		return;
	}
	if (req.url.startsWith('/check.js'))
	{
		res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
		res.end(checkJs);
		return;
	}
	if (req.url.startsWith('/unknownfont'))
	{
		// family not in the bundled manifest: blockUnknownGoogleFonts decides
		res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
		res.end(fontPage('https://fonts.googleapis.com/css2?family=Tangerine&display=swap', 'Tangerine sample', 'Tangerine'));
		return;
	}
	if (req.url.startsWith('/subsetfont'))
	{
		res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
		res.end(fontPage('https://fonts.googleapis.com/css2?family=Roboto&text=Hello+World&display=swap', 'Hello World', 'Roboto'));
		return;
	}
	if (req.url.startsWith('/reportonly'))
	{
		// no enforced CSP: scripts work either way; the Report-Only policy
		// disallows data:, so an UNPATCHED policy yields a violation report
		// (counted at /csp-report) and a patched one yields none
		res.writeHead(200, {
			'Content-Type': 'text/html; charset=utf-8',
			'Content-Security-Policy-Report-Only': "script-src 'self' https://code.jquery.com; report-uri /csp-report",
		});
		res.end(page());
		return;
	}
	if (req.url.startsWith('/nocsp'))
	{
		// no CSP at all: any CDN script may execute (multi-CDN sweep)
		res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
		res.end(page());
		return;
	}
	// /strict: only default-src — the CSP patch must create script-src/style-src/
	// font-src from it (plus data:/moz-extension:) or every redirect breaks here
	const strictCsp = "default-src 'self' https://code.jquery.com https://fonts.googleapis.com https://fonts.gstatic.com https://cdnjs.cloudflare.com";
	res.writeHead(200, {
		'Content-Type': 'text/html; charset=utf-8',
		// allows the original CDN origins, but NOT data: — our CSP patch must add data:
		'Content-Security-Policy': req.url.startsWith('/strict') ? strictCsp :
			"script-src 'self' https://code.jquery.com; style-src 'self' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
	});
	res.end(page());
});

const port = process.env.PORT || 8765;
server.listen(port, '127.0.0.1', () => console.log(`livetest server on http://127.0.0.1:${port}/`));
