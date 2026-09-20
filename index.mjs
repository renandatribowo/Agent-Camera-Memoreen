#!/usr/bin/env node

import http from 'node:http';
import { captureWithPausedLiveView } from './capture-lifecycle.mjs';
import { execSync, spawn } from 'node:child_process';
import { writeFile, unlink, readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const PORT = Number(process.env.DSLR_AGENT_PORT || 3100);
const HOST = process.env.DSLR_AGENT_HOST || '127.0.0.1';

// Only browser pages served from these origins are allowed to talk to the
// agent via CORS. Without this, any website open in the same browser could
// silently trigger camera capture / live view on the kiosk machine.
// Configure with a comma-separated list, e.g.
//   DSLR_AGENT_ALLOWED_ORIGINS="https://memoreen.id,http://localhost:3000"
const ALLOWED_ORIGINS = (
  process.env.DSLR_AGENT_ALLOWED_ORIGINS ||
  'http://localhost:3000,http://127.0.0.1:3000'
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function resolveAllowedOrigin(requestOrigin) {
  if (!requestOrigin) return null;
  return ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : null;
}

function isGphoto2Available() {
  try {
    execSync('which gphoto2', { encoding: 'utf-8' });
    return true;
  } catch {
    return false;
  }
}

function gphoto2(args, options = {}) {
  try {
    return execSync(`gphoto2 ${args}`, {
      encoding: 'utf-8',
      timeout: options.timeout ?? 30000,
      env: { ...process.env, LANG: 'en_US.UTF-8' },
    });
  } catch (err) {
    throw new Error(`gPhoto2 error: ${err.message}`);
  }
}

function detectCameras() {
  if (!isGphoto2Available()) return [];
  try {
    const output = gphoto2('--auto-detect');
    const lines = output.split('\n').filter((l) => l.trim());
    const cameras = [];
    let started = false;
    for (const line of lines) {
      if (line.includes('Model')) { started = true; continue; }
      if (!started || line.includes('---')) continue;
      const parts = line.split(/\s{2,}/).filter(Boolean);
      if (parts.length >= 2) {
        cameras.push({ model: parts[0].trim(), port: parts[1].trim() });
      }
    }
    return cameras;
  } catch {
    return [];
  }
}

let liveViewProcess = null;
let latestPreview = null;
let captureInProgress = false;

function startLiveView() {
  if (captureInProgress) return false;
  if (!isGphoto2Available()) return false;
  if (liveViewProcess) return true;

  try {
    liveViewProcess = spawn('gphoto2', ['--capture-movie', '--stdout'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const chunks = [];
    liveViewProcess.stdout.on('data', (chunk) => {
      chunks.push(chunk);
      const total = chunks.reduce((s, c) => s + c.length, 0);
      if (total > 500000) {
        const all = Buffer.concat(chunks);
        const sofi = all.indexOf(Buffer.from([0xff, 0xd8]));
        const eoi = all.lastIndexOf(Buffer.from([0xff, 0xd9]));
        if (sofi >= 0 && eoi > sofi) {
          latestPreview = all.subarray(sofi, eoi + 2);
        }
        chunks.length = 0;
      }
    });

    liveViewProcess.on('exit', () => {
      liveViewProcess = null;
      latestPreview = null;
    });

    return true;
  } catch {
    return false;
  }
}

async function stopLiveView() {
  const process = liveViewProcess;
  if (process && process.exitCode === null && process.signalCode === null) {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        process.removeListener('close', onClose);
        reject(new Error('Live view belum melepas kamera. Coba ulangi.'));
      }, 5000);
      function onClose() { clearTimeout(timer); resolve(); }
      process.once('close', onClose);
      process.kill('SIGTERM');
    });
  }
  if (liveViewProcess === process) liveViewProcess = null;
  latestPreview = null;
}

async function capturePhoto(outputDir) {
  if (!isGphoto2Available()) throw new Error('gPhoto2 tidak tersedia');

  await writeFile(path.join(outputDir, '.gphoto-permission'), '');

  const filename = `capture-${Date.now()}.jpg`;
  const filepath = path.join(outputDir, filename);

  // Keep the photo in camera RAM and download in the same gphoto2 session.
  // Use the choice label so this does not depend on camera-specific indices.
  const output = gphoto2(`--set-config-value capturetarget="Internal RAM" --capture-image-and-download --filename "${filepath}"`, { timeout: 60000 });

  if (!existsSync(filepath)) {
    throw new Error(`File hasil capture tidak ditemukan: ${output}`);
  }

  return filepath;
}

async function capturePreview() {
  if (!isGphoto2Available()) return null;
  try {
    const buf = execSync('gphoto2 --capture-preview --stdout', {
      encoding: 'buffer',
      timeout: 15000,
    });
    return Buffer.from(buf);
  } catch {
    return null;
  }
}

function json(res, status, data, allowedOrigin) {
  const body = JSON.stringify(data);
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };
  if (allowedOrigin) headers['Access-Control-Allow-Origin'] = allowedOrigin;
  res.writeHead(status, headers);
  res.end(body);
}

function image(res, status, buffer, allowedOrigin) {
  const headers = {
    'Content-Type': 'image/jpeg',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  };
  if (allowedOrigin) headers['Access-Control-Allow-Origin'] = allowedOrigin;
  res.writeHead(status, headers);
  res.end(buffer);
}

async function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(body));
  });
}

const server = http.createServer(async (req, res) => {
  const allowedOrigin = resolveAllowedOrigin(req.headers.origin);

  if (req.method === 'OPTIONS') {
    const headers = {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    if (allowedOrigin) headers['Access-Control-Allow-Origin'] = allowedOrigin;
    res.writeHead(204, headers);
    res.end();
    return;
  }

  // Reject cross-origin browser requests from pages not in the allowlist.
  // Requests without an Origin header (curl, health checks, same-origin
  // navigation) are still permitted.
  if (req.headers.origin && !allowedOrigin) {
    return json(res, 403, { success: false, error: 'Origin not allowed' });
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  try {
    if (req.method === 'GET' && pathname === '/health') {
      return json(res, 200, {
        ok: true,
        service: 'dslr-agent',
        gphoto2: isGphoto2Available(),
        cameras: detectCameras(),
        liveView: !!liveViewProcess,
        version: '1.0.0',
      }, allowedOrigin);
    }

    if (req.method === 'GET' && pathname === '/detect') {
      const available = isGphoto2Available();
      const cameras = available ? detectCameras() : [];
      return json(res, 200, { available, cameras, count: cameras.length }, allowedOrigin);
    }

    if (req.method === 'POST' && pathname === '/liveview/start') {
      if (!isGphoto2Available()) {
        return json(res, 500, { success: false, error: 'gPhoto2 tidak tersedia' }, allowedOrigin);
      }
      const started = startLiveView();
      if (started) return json(res, 200, { success: true, message: 'Live view started' }, allowedOrigin);
      return json(res, 500, { success: false, error: 'Gagal memulai live view' }, allowedOrigin);
    }

    if (req.method === 'GET' && pathname === '/liveview/frame') {
      if (!latestPreview || latestPreview.length === 0) {
        return json(res, 200, { available: true, error: 'No frame available' }, allowedOrigin);
      }
      return image(res, 200, latestPreview, allowedOrigin);
    }

    if (req.method === 'POST' && pathname === '/liveview/stop') {
      await stopLiveView();
      return json(res, 200, { success: true, message: 'Live view stopped' }, allowedOrigin);
    }

    if (req.method === 'GET' && pathname === '/preview') {
      if (!isGphoto2Available()) {
        return json(res, 200, { available: false, error: 'gPhoto2 tidak tersedia' }, allowedOrigin);
      }
      const buffer = await capturePreview();
      if (!buffer || buffer.length === 0) {
        return json(res, 200, { available: true, error: 'Gagal mengambil preview' }, allowedOrigin);
      }
      return image(res, 200, buffer, allowedOrigin);
    }

    if (req.method === 'POST' && pathname === '/capture') {
      const outputDir = path.join(os.tmpdir(), 'photobooth-dslr-agent');
      await mkdir(outputDir, { recursive: true });
      if (captureInProgress) return json(res, 409, { success: false, error: 'Capture sedang berlangsung' }, allowedOrigin);
      captureInProgress = true;
      let filepath;
      try {
        filepath = await captureWithPausedLiveView({
          isLive: () => !!liveViewProcess,
          stop: stopLiveView,
          capture: () => capturePhoto(outputDir),
          start: () => { captureInProgress = false; startLiveView(); },
        });
      } finally {
        captureInProgress = false;
      }
      const buffer = await readFile(filepath);
      const base64 = buffer.toString('base64');
      unlink(filepath).catch(() => {});
      return json(res, 200, {
        success: true,
        image: `data:image/jpeg;base64,${base64}`,
        filename: path.basename(filepath),
      }, allowedOrigin);
    }

    return json(res, 404, { success: false, error: 'Not found' }, allowedOrigin);
  } catch (err) {
    return json(res, 500, {
      success: false,
      error: err instanceof Error ? err.message : 'Agent error',
    }, allowedOrigin);
  }
});

server.listen(PORT, HOST, () => {
  const available = isGphoto2Available();
  const cameras = available ? detectCameras() : [];
  console.log(`[dslr-agent] Listening on http://${HOST}:${PORT}`);
  console.log(`[dslr-agent] gphoto2: ${available ? 'available' : 'NOT available'}`);
  console.log(`[dslr-agent] Cameras: ${cameras.length ? cameras.map((c) => c.model).join(', ') : 'none detected'}`);
  console.log(`[dslr-agent] Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});

process.on('SIGINT', async () => {
  await stopLiveView();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await stopLiveView();
  process.exit(0);
});
