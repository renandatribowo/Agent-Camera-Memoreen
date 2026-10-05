import { execFileSync } from 'node:child_process';

export function choosePrinterName(configuredName, exec = execFileSync) {
  const name = String(configuredName || '').trim();
  if (name) return name;

  const options = { encoding: 'utf8', env: { ...process.env, LANG: 'C' } };
  try {
    if (/^system default destination:\s*\S+/m.test(exec('lpstat', ['-d'], options))) return '';
  } catch { /* No default printer; check available destinations below. */ }

  let printers = [];
  try {
    printers = exec('lpstat', ['-e'], options).trim().split(/\r?\n/).filter(Boolean);
  } catch { /* CUPS may be unavailable or have no printers. */ }
  if (printers.length === 1) return printers[0];
  if (printers.length === 0) {
    throw new Error('Tidak ada printer CUPS yang tersedia. Periksa koneksi dan driver printer pada komputer agent.');
  }
  throw new Error(`Tidak ada printer default. Isi Printer Name di Admin → Settings → Printer dengan salah satu nama ini: ${printers.join(', ')}`);
}
