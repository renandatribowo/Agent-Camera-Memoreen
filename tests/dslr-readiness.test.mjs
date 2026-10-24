import { test } from 'node:test';
import assert from 'node:assert/strict';
import { waitForCameraReady } from '../camera-ready.mjs';

test('backs off on busy before allowing one capture', async () => {
  const delays = [];
  let attempts = 0;
  await waitForCameraReady({ probe: () => { if (++attempts < 3) throw new Error('PTP Device Busy'); }, sleep: async ms => { delays.push(ms); } });
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [750, 1000, 2000]);
});
test('persistent busy is bounded and retains diagnostics', async () => {
  let attempts = 0;
  await assert.rejects(waitForCameraReady({ probe: () => { attempts++; throw new Error('Camera is busy'); }, sleep: async () => {} }), /Camera is busy/);
  assert.equal(attempts, 3);
});
test('USB and unknown errors are not retried', async () => {
  for (const message of ['USB disconnected', 'Internal RAM unsupported', 'timeout']) {
    let attempts = 0;
    await assert.rejects(waitForCameraReady({ probe: () => { attempts++; throw new Error(message); }, sleep: async () => {} }), new RegExp(message));
    assert.equal(attempts, 1);
  }
});
test('ready camera only needs a settling delay and one probe', async () => {
  let attempts = 0;
  const delays = [];
  await waitForCameraReady({ probe: () => { attempts++; }, sleep: async ms => { delays.push(ms); } });
  assert.equal(attempts, 1);
  assert.deepEqual(delays, [750]);
});
