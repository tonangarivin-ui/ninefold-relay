// Screenshot the game at shots.json's scenes through a headless Chromium, over CDP and Node's own
// WebSocket, with no dependency. Usage: node shoot.mjs <repo>   (repo holds shots.json, game/, screenshots/)
// Each scene waits for the page to set window.__shotReady, then writes screenshots/<name>.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repo = resolve(process.argv[2] ?? '.');
const shots = JSON.parse(readFileSync(join(repo, 'shots.json'), 'utf8'));
const PORT = Number(process.env.PORT ?? 18181);
const CDP = Number(process.env.CDP_PORT ?? 9399);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn(process.execPath, [join(repo, 'serve.ts'), '--port', String(PORT)], { cwd: repo, stdio: 'ignore' });
const browser = spawn(process.env.CHROME ?? '/home/ubuntu/.local/bin/chromium', [
  '--headless=new', `--remote-debugging-port=${CDP}`, '--no-sandbox', '--disable-gpu',
  '--hide-scrollbars', '--window-size=1280,720', '--force-device-scale-factor=1', '--user-data-dir=/tmp/shoot-profile', 'about:blank',
], { stdio: 'ignore' });

let ws;
const pending = new Map();
let nextId = 1;
function send(method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((res, rej) => pending.set(id, { res, rej }));
}

async function connect() {
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${CDP}/json/new?about:blank`, { method: 'PUT' });
      const target = await r.json();
      ws = new WebSocket(target.webSocketDebuggerUrl);
      await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
      ws.onmessage = (e) => {
        const m = JSON.parse(e.data);
        const p = pending.get(m.id);
        if (p) { pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
      };
      return;
    } catch { await sleep(200); }
  }
  throw new Error('chromium did not answer on CDP port ' + CDP);
}

await connect();
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
mkdirSync(join(repo, 'screenshots'), { recursive: true });

for (const shot of shots) {
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/${shot.query}` });
  let ready = false;
  for (let i = 0; i < 100 && !ready; i++) {
    await sleep(100);
    const r = await send('Runtime.evaluate', { expression: 'window.__shotReady === true', returnByValue: true });
    ready = r.result.value === true;
  }
  if (!ready) throw new Error(`scene ${shot.name} never became ready: ${shot.query}`);
  await sleep(150);
  const png = await send('Page.captureScreenshot', { format: 'jpeg', quality: 92 });
  const bytes = Buffer.from(png.data, 'base64');
  writeFileSync(join(repo, 'screenshots', shot.name), bytes);
  console.log(shot.name, bytes.length, 'bytes');
}

ws.close();
browser.kill('SIGTERM');
server.kill('SIGTERM');
process.exit(0);
