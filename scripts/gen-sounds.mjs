/**
 * Generates the timer's sound assets as 16-bit PCM WAV files (no external/licensed
 * audio). WAV is used because iOS local-notification sounds must be wav/aiff/caf.
 * Run with: node scripts/gen-sounds.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');
mkdirSync(OUT, { recursive: true });

const RATE = 44100;

function writeWav(name, samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE((v * 32767) | 0, i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(join(OUT, name), Buffer.concat([header, data]));
  console.log('wrote', name, `(${(data.length / 1024).toFixed(1)} KiB)`);
}

const sec = (s) => Math.floor(RATE * s);

// A struck-bell tone: a few inharmonic partials with exponential decay.
function bell(freq, durationSec, partials = [1, 2.0, 2.4, 3.0]) {
  const n = sec(durationSec);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const env = Math.exp(-3.2 * t);
    let s = 0;
    for (let p = 0; p < partials.length; p++) {
      s += Math.sin(2 * Math.PI * freq * partials[p] * t) / (p + 1);
    }
    out[i] = (s / partials.length) * env * 0.9;
  }
  return out;
}

// A short square-ish beep with a quick attack/decay envelope.
function beep(freq, durationSec) {
  const n = sec(durationSec);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const env = Math.min(1, t / 0.005) * Math.exp(-8 * t);
    out[i] = Math.sign(Math.sin(2 * Math.PI * freq * t)) * env * 0.5;
  }
  return out;
}

function concat(...chunks) {
  const total = chunks.reduce((a, c) => a + c.length, 0);
  const out = new Float32Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

const silence = (s) => new Float32Array(sec(s));

// Round-start bell: single bright ding.
writeWav('bell.wav', bell(784, 1.4));

// Round-end bell: a double ding, slightly lower / more urgent.
writeWav('end-bell.wav', concat(bell(660, 0.6), silence(0.05), bell(660, 1.1)));

// Warning (10s left): three quick rising beeps.
writeWav('warning.wav', concat(beep(900, 0.12), silence(0.08), beep(900, 0.12), silence(0.08), beep(1200, 0.18)));

// Countdown beep: single short tick.
writeWav('beep.wav', beep(1000, 0.14));
