import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const file = readFileSync('package-lock.json');
const base64 = file.toString('base64');
const chunkSize = 1152;
const count = Math.ceil(base64.length / chunkSize);
const sha256 = createHash('sha256').update(file).digest('hex');
console.log('LOCKFILE_HEADER size=' + file.length + ' chunks=' + count + ' sha256=' + sha256);
for (let i = 0; i < count; i++) {
  console.log('LOCKFILE_PART ' + i + ' ' + base64.slice(i * chunkSize, (i + 1) * chunkSize));
}
console.log('LOCKFILE_COMPLETE');
