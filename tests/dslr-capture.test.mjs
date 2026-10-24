import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureWithPausedLiveView } from '../capture-lifecycle.mjs';

for (const fails of [false, true]) {
  test(`capture waits for USB release and restores preview (failure=${fails})`, async () => {
    const events = [];
    const operation = captureWithPausedLiveView({
      isLive: () => true,
      stop: async () => { await new Promise(resolve => setTimeout(resolve, 10)); events.push('released'); },
      capture: async () => { events.push('capture'); if (fails) throw new Error('capture failed'); return 'photo'; },
      start: () => events.push('preview'),
    });
    if (fails) await assert.rejects(operation, /capture failed/);
    else assert.equal(await operation, 'photo');
    assert.deepEqual(events, ['released', 'capture', 'preview']);
  });
}

test('capture without live view does not start preview', async () => {
  assert.equal(await captureWithPausedLiveView({
    isLive: () => false,
    stop: () => assert.fail('unexpected stop'),
    start: () => assert.fail('unexpected start'),
    capture: async () => 'photo',
  }), 'photo');
});
