// RDP driver: navigates the web-ext Firefox instance and evaluates JS in pages.
// Usage: node tools/livetest-rdp.mjs explore | nav | eval
import { connectToFirefox } from '../node_modules/web-ext/lib/firefox/rdp-client.js';
import { readFileSync } from 'node:fs';

const log = readFileSync('/tmp/webext-run.log', 'utf8');
const port = Number((log.match(/start-debugger-server (\d+)/) || [])[1]);
if (!port)
{
	console.error('debugger port not found in /tmp/webext-run.log');
	process.exit(1);
}

const client = await connectToFirefox(port);
client.on('error', e => console.error('RDP error:', e.message));
client.on('rdp-error', e => console.error('RDP rdp-error:', JSON.stringify(e)));

const cmd = process.argv[2] || 'explore';

if (cmd === 'explore')
{
	const tabs = await client.request({ to: 'root', type: 'listTabs' });
	console.log('listTabs keys:', Object.keys(tabs));
	console.log('actors:', tabs.actors);
	const first = tabs.tabs && tabs.tabs[0];
	console.log('first tab:', JSON.stringify(first));
	globalThis.__tabs = tabs;
	// dump a bit more if there's a console actor
	const consoleActor = tabs.consoleActor || (tabs.tabs && tabs.tabs[0] && tabs.tabs[0].consoleActor);
	if (consoleActor)
	{
		try
		{
			const started = await client.request({ to: consoleActor, type: 'startListeners', listeners: ['console-api'] });
			console.log('console startListeners:', JSON.stringify(started).slice(0, 300));
		}
		catch (e) { console.log('console listener failed:', e.message || JSON.stringify(e)); }
	}
	process.exit(0);
}

client.disconnect();
