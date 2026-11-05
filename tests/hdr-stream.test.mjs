import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {avifColor, linearP3Tiles, linearP3Strip} from '../src/js/hdr/color.mjs';
import createStreamDecoder from '../src/js/hdr/vendor/avif-stream-dec.js';
const root = new URL('../src/js/hdr/', import.meta.url);
const fixture = fs.readFileSync(fileURLToPath(new URL('../examples/test-hdr.avif', import.meta.url)));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
// Check against the upstream icodec integer output, not another streaming decode.
globalThis.self = globalThis;
self._icodec_ImageData = (data, width, height, depth) => ({data, width, height, depth});
const {default:createLegacy} = await import('../src/js/hdr/vendor/avif-dec.js');
const legacy = await createLegacy({wasmBinary: fs.readFileSync(new URL('vendor/avif-dec.wasm', root))});
const reference = legacy.decode(fixture);
const expectedRGBA = digest(reference.data);
const widths = [2000, reference.width - 2000];
const expectedTiles = linearP3Tiles(reference, widths);
const expectedHDR = expectedTiles.tiles.map(tile => digest(new Uint8Array(tile.data.buffer)));
const decoder = await createStreamDecoder({wasmBinary: fs.readFileSync(new URL('vendor/avif-stream-dec.wasm', root))});
const pointer = decoder._malloc(fixture.length);
decoder.HEAPU8.set(fixture, pointer);
assert.equal(decoder._panorama_decode(pointer, fixture.length), 0);
const image = {width:decoder._panorama_width(),height:decoder._panorama_height(),depth:decoder._panorama_depth()};
image.data = new Uint8Array(decoder.HEAPU8.buffer, decoder._panorama_pixels(), image.width * image.height * 8);
assert.equal(digest(image.data), expectedRGBA, 'new decoder must preserve the legacy RGBA pixels exactly');
assert.equal(image.data.buffer, decoder.HEAPU8.buffer, 'RGBA must be borrowed, not copied');
let x = 0;
for (const [index,width] of widths.entries()) {
    const hash = createHash('sha256');
    for (let y = 0; y < image.height; y += 37) {
        const tile = linearP3Strip(image, x, width, y, Math.min(37, image.height - y));
        hash.update(new Uint8Array(tile.data.buffer));
    }
    assert.equal(hash.digest('hex'), expectedHDR[index], 'strip conversion must preserve all HDR pixels');
    x += width;
}
decoder._panorama_release();assert.equal(decoder._panorama_pixels(), 0);
decoder._free(pointer);
const profile = avifColor(fixture.buffer.slice(fixture.byteOffset, fixture.byteOffset + fixture.byteLength));
assert.equal(profile.width, image.width);assert.equal(profile.height, image.height);
// Run the real worker protocol with transfer semantics and delayed acknowledgements.
let outstanding = 0, strips = 0, result;
const hashes = widths.map(() => createHash('sha256'));
self.postMessage = (message, transfer = []) => {
    const data = structuredClone(message, {transfer});
    if (data.strip) {
        assert.equal(outstanding, 0, 'worker must wait for every acknowledgement');
        outstanding++;strips++;
        const strip = data.strip;
        hashes[strip.texture].update(new Uint8Array(strip.data.buffer));
        setTimeout(() => {outstanding--; self.onmessage({data:{ack:strip.id}});}, 0);
    }
    if (data.error) throw new Error(data.error);
    if (data.result) result = data.result;
};
await import('../src/js/hdr/avif-worker.mjs');
await self.onmessage({data:{blob:new Blob([fixture]),width:image.width,height:image.height,widths,maxUploadBytes:1024*1024}});
assert.equal(outstanding, 0);assert.ok(strips > 2);assert.equal(result.streamed,true);
assert.deepEqual(hashes.map(hash => hash.digest('hex')),expectedHDR);
// Invalid input must be recoverable without leaking the previous decoder image.
const bad = decoder._malloc(16);decoder.HEAPU8.fill(0,bad,bad+16);
assert.notEqual(decoder._panorama_decode(bad,16),0);decoder._panorama_release();decoder._free(bad);
console.log('PASS: exact legacy RGBA and HDR pixels, borrowed WASM memory, AVIF dimensions, acknowledged worker transfers, release and malformed input.');
