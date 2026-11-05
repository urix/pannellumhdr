import assert from 'node:assert/strict';
import fs from 'node:fs';
import {avifColor} from '../src/js/hdr/color.mjs';
const profile = fs.readFileSync(new URL('fixtures/rec2020-pq.icc', import.meta.url));
const box = (type, ...parts) => {
    const data = Buffer.concat(parts), header = Buffer.alloc(8);
    header.writeUInt32BE(data.length + 8); header.write(type, 4);
    return Buffer.concat([header, data]);
};
function fixture(icc) {
    const dimensions = Buffer.alloc(12); dimensions.writeUInt32BE(8192, 4); dimensions.writeUInt32BE(4096, 8);
    const file = Buffer.concat([
        box('ftyp', Buffer.from('avif\0\0\0\0avif')),
        box('meta', Buffer.alloc(4), box('pitm', Buffer.from([0,0,0,0,0,1])),
            box('iprp', box('ipco', box('colr', Buffer.from('prof'), icc), box('ispe', dimensions)),
                box('ipma', Buffer.from([0,0,0,0,0,0,0,1,0,1,2,1,2]))))
    ]);
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.length);
}
assert.deepEqual(avifColor(fixture(profile)), {primaries:9, transfer:16, width:8192, height:4096});
const modified = Buffer.from(profile); modified[modified.length - 1] ^= 1;
assert.throws(() => avifColor(fixture(modified)), /ICC profile is not supported/);
assert.throws(() => avifColor(fixture(profile.subarray(0, 100))), /ICC profile is not supported/);
const dated = Buffer.from(profile); dated[24] ^= 1; dated[84] ^= 1;
assert.equal(avifColor(fixture(dated)).transfer, 16);
console.log('PASS: ICC PQ, dimensions, unknown and truncated profiles, date and profile ID.');
