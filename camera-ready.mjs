// Read configuration only: retrying a shutter command can create duplicate photos.
// A successful query confirms communication, not that every camera buffer is empty.
export async function waitForCameraReady({ probe, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  await sleep(750);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await probe();
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt === 2 || !/\b(?:device[ _-]?busy|camera (?:is )?busy|PTP_RC_DeviceBusy)\b/i.test(message)) throw error;
      await sleep((attempt + 1) * 1000);
    }
  }
}
