import { execFile } from 'node:child_process';

// One gphoto session: Canon EOS needs live view active for autofocusdrive.
// No camera settings or shell fragments are accepted from the browser.
export const FOCUS_ARGS = [
  '--set-config', 'viewfinder=1',
  '--set-config', 'autofocusdrive=1',
  // Older contrast-detect bodies need time before AF is released.
  '--wait-event=3s',
  '--set-config', 'autofocusdrive=0',
  '--set-config', 'viewfinder=0',
];
export function runAutofocus() {
  return new Promise((resolve, reject) => {
    execFile('gphoto2', FOCUS_ARGS, { timeout: 12000, maxBuffer: 1024 * 1024,
      env: { ...process.env, LANG: 'en_US.UTF-8' } }, error => error ? reject(error) : resolve());
  });
}

export function createFocusController({ stop, resume, run = runAutofocus }) {
  let busy = false;
  let nextAllowed = 0;
  return {
    get busy() { return busy; },
    async focus() {
      if (busy) return { success: false, code: 'busy' };
      if (Date.now() < nextAllowed) return { success: false, code: 'cooldown' };
      busy = true;
      let success = false;
      try {
        await stop();
        await run();
        success = true;
      } catch {
        // Failure is not evidence that focus was achieved. The UI must back off.
      } finally {
        try { await resume(); } catch { success = false; }
        nextAllowed = Date.now() + (success ? 5000 : 15000);
        busy = false;
      }
      return { success, code: success ? 'ok' : 'failed' };
    },
  };
}
