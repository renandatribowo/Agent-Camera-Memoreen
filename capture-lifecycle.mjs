// A gphoto2 movie process owns the USB interface until it has fully exited.
export async function captureWithPausedLiveView({ isLive, stop, capture, start }) {
  const resume = isLive();
  if (resume) await stop();
  try {
    return await capture();
  } finally {
    if (resume) await start();
  }
}
