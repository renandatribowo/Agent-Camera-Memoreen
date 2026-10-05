import { writeFile } from 'node:fs/promises';

export const PRINT_IMAGE_TIMEOUT_MS = 90_000;

export async function downloadPrintImage(imageUrl, filepath, { fetchImage = fetch, timeoutMs = PRINT_IMAGE_TIMEOUT_MS } = {}) {
  let response;
  try {
    response = await fetchImage(imageUrl, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new Error(`Gagal mengunduh photo strip (${response.status})`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) throw new Error('File print bukan gambar');
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > 25 * 1024 * 1024) throw new Error('Ukuran file print tidak valid');
    await writeFile(filepath, buffer);
  } catch (error) {
    if (error?.name === 'TimeoutError') {
      throw new Error(`Unduhan photo strip melewati batas ${Math.max(1, Math.round(timeoutMs / 1000))} detik. Periksa koneksi internet pada komputer agent.`, { cause: error });
    }
    throw error;
  }
}
