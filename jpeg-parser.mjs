// Frames must be complete and fresh before the browser measures sharpness.
export function createJpegParser(onFrame) {
  let buffer = Buffer.alloc(0);
  return chunk => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length > 1) {
      const start = buffer.indexOf(Buffer.from([0xff, 0xd8]));
      if (start < 0) { buffer = buffer.subarray(-1); return; }
      if (start) buffer = buffer.subarray(start);
      const end = buffer.indexOf(Buffer.from([0xff, 0xd9]), 2);
      if (end < 0) {
        if (buffer.length > 8 * 1024 * 1024) buffer = Buffer.alloc(0);
        return;
      }
      onFrame(buffer.subarray(0, end + 2));
      buffer = buffer.subarray(end + 2);
    }
  };
}
