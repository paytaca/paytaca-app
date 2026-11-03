import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// Node 20 has no global WebSocket; fall back to the bundled `ws` shim.
const WS = globalThis.WebSocket ?? (await import('ws')).default

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 9448
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = 'scripts/releases/v0.27.0'
const OUT = 'public/releases/v0.27.0'
const WIDTH = 1200
const HEIGHT = 1500

const JOBS = [
  { file: `${SRC}/01-cover.html`, out: `${OUT}/01-cover.png` },
  { file: `${SRC}/02-group-chat.html`, out: `${OUT}/02-private-group-chat.png` },
  { file: `${SRC}/03-subscriptions.html`, out: `${OUT}/03-subscriptions.png` },
  { file: `${SRC}/04-cauldron-referrals.html`, out: `${OUT}/04-cauldron-referrals.png` },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--no-first-run',
    '--hide-scrollbars',
    '--force-color-profile=srgb',
    '--user-data-dir=/tmp/chrome-paytaca-release-profile',
    `--remote-debugging-port=${PORT}`,
    'about:blank',
  ],
  { stdio: 'ignore' }
)

async function waitForDevtools() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      if (res.ok) return
    } catch {
      // devtools not up yet — retry
    }
    await sleep(250)
  }
  throw new Error('devtools not ready')
}

function connect(wsUrl) {
  const ws = new WS(wsUrl)
  let id = 0
  const pending = new Map()
  const ready = new Promise((res) => (ws.onopen = res))
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(msg.error.message))
      else resolve(msg.result)
    }
  }
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      id += 1
      pending.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params }))
    })
  return { ws, ready, send }
}

async function capture(job) {
  const target = await (
    await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })
  ).json()
  const cdp = connect(target.webSocketDebuggerUrl)
  await cdp.ready
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await cdp.send('Page.navigate', { url: pathToFileURL(resolve(ROOT, job.file)).href })

  for (let i = 0; i < 80; i++) {
    const r = await cdp.send('Runtime.evaluate', {
      expression: 'document.readyState',
      returnByValue: true,
    })
    if (r.result.value === 'complete') break
    await sleep(150)
  }

  await cdp.send('Runtime.evaluate', {
    expression: `
      (async () => {
        await document.fonts.ready;
        const imgs = [...document.images];
        await Promise.all(imgs.map((i) => i.complete ? Promise.resolve() : new Promise((r) => { i.onload = r; i.onerror = r })));
        return true;
      })()
    `,
    awaitPromise: true,
    returnByValue: true,
  })
  await sleep(350)

  const probe = await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        let maxR = 0, maxB = 0;
        for (const el of document.querySelectorAll('.frame *')) {
          const r = el.getBoundingClientRect();
          if (r.width || r.height) { maxR = Math.max(maxR, r.right); maxB = Math.max(maxB, r.bottom); }
        }
        return { maxR: Math.round(maxR), maxB: Math.round(maxB) };
      })()
    `,
    returnByValue: true,
  })

  const shot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
    clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT, scale: 2 },
  })
  const outPath = resolve(ROOT, job.out)
  mkdirSync(dirname(outPath), { recursive: true })
  const buffer = Buffer.from(shot.data, 'base64')
  writeFileSync(outPath, buffer)
  cdp.ws.close()
  await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`).catch(() => {})
  return { out: job.out, bytes: buffer.length, bounds: probe.result.value }
}

async function main() {
  await waitForDevtools()
  for (const job of JOBS) {
    const res = await capture(job)
    const { maxR, maxB } = res.bounds
    const warn = maxR > WIDTH || maxB > HEIGHT ? '  ⚠ OVERFLOW' : ''
    console.log(`rendered ${res.out} (${res.bytes} bytes) bounds ${maxR}x${maxB}${warn}`)
  }
}

main()
  .then(() => {
    chrome.kill()
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    chrome.kill()
    process.exit(1)
  })
