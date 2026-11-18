// Generates audio/01.mp3 … 13.mp3 from the stop texts in template.html using ElevenLabs.
// Key: ELEVENLABS_API_KEY in the environment, or the file ~/.config/elevenlabs/api_key.
// Usage: node narrate.mjs [--dry] [--force] [--voice <voice_id>]
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2);
const flag = n => args.includes(n);
const voice = args.includes('--voice') ? args[args.indexOf('--voice') + 1] : 'JBFqnCBsd6RMkjVDRZzb'; // "George"
const src = fs.readFileSync(path.join(here, 'template.html'), 'utf8');
const m = src.match(/var STEPS = (\[[\s\S]*?\n  \]);/);
const STEPS = new Function('return ' + m[1])();
const say = s => [s.title + '.', s.text.replace(/\s*\([^)]*\)/g, ''), s.quote.replace(/…$/, '.')].join('\n\n');
const texts = STEPS.map(say);
console.log(texts.length + ' clips, ' + texts.join('').length + ' characters');
if (flag('--dry')) { texts.forEach((t, i) => console.log('\n--- ' + (i + 1) + '\n' + t)); process.exit(0); }
let key = process.env.ELEVENLABS_API_KEY;
if (!key) { try { key = fs.readFileSync(path.join(os.homedir(), '.config/elevenlabs/api_key'), 'utf8').trim(); } catch {} }
if (!key) { console.error('No API key: set ELEVENLABS_API_KEY or create ~/.config/elevenlabs/api_key'); process.exit(1); }
fs.mkdirSync(path.join(here, 'audio'), { recursive: true });
for (let i = 0; i < texts.length; i++) {
  const out = path.join(here, 'audio', String(i + 1).padStart(2, '0') + '.mp3');
  if (fs.existsSync(out) && !flag('--force')) { console.log('skip ' + out); continue; }
  const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voice + '?output_format=mp3_44100_64', {
    method: 'POST', headers: { 'xi-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({ text: texts[i], model_id: 'eleven_multilingual_v2' })
  });
  if (!r.ok) { console.error('clip ' + (i + 1) + ' failed: ' + r.status + ' ' + (await r.text()).slice(0, 300)); process.exit(1); }
  fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
  console.log('wrote ' + out);
}
