import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFocusController, FOCUS_ARGS } from '../focus.mjs';

for (const fails of [false, true]) {
  test(`focus serializes USB access and resumes preview (failure=${fails})`, async () => {
    const calls = [];
    let finish;
    const controller = createFocusController({
      stop: async () => { calls.push('stop'); },
      run: () => new Promise((resolve, reject) => { finish = () => fails ? reject(new Error('AF failed')) : resolve(); calls.push('focus'); }),
      resume: async () => { calls.push('resume'); },
    });
    const result = controller.focus();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(controller.busy, true);
    assert.equal((await controller.focus()).code, 'busy');
    finish();
    assert.equal((await result).success, !fails);
    assert.equal(controller.busy, false);
    assert.deepEqual(calls, ['stop', 'focus', 'resume']);
    assert.equal((await controller.focus()).code, 'cooldown');
  });
}

test('does not run AF if stream cannot release camera', async () => {
  const controller = createFocusController({ stop: async () => { throw new Error('busy'); }, run: () => assert.fail(), resume: () => {} });
  assert.equal((await controller.focus()).success, false);
  assert.equal(controller.busy, false);
});

test('focus command enables live view and releases AF without taking a photo', () => {
  assert.ok(FOCUS_ARGS.includes('viewfinder=1'));
  assert.ok(FOCUS_ARGS.includes('autofocusdrive=1'));
  assert.ok(FOCUS_ARGS.includes('autofocusdrive=0'));
  assert.equal(FOCUS_ARGS.some(arg => arg.includes('capture-image')), false);
});
