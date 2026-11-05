const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/js/libpannellum.js'), 'utf8');
const upload = source.slice(source.indexOf('    function uploadWebGPUImage('),
    source.indexOf('    function decodeHDRAVIF('));
function check(width, height, limit, realPixels = false) {
    const calls = [];
    const pixels = realPixels ? Uint16Array.from({length: width * height * 4}, (_, i) => i) :
        {subarray: (start, end) => ({start, end})};
    const context = {Math, Error, gpuLinearPixels: false, gpuUploadSources: [{width, height, data: pixels}],
        gpuTextures: [{}], gpuDiagnostics: {}, gpuDevice: {limits: {maxBufferSize: limit},
            queue: {writeTexture: (...args) => calls.push(args)}}};
    vm.runInNewContext(upload + '\nuploadWebGPUImage();', context);
    let nextRow = 0;
    for (const [destination, data, layout, size] of calls) {
        assert.equal(destination.origin.y, nextRow);
        assert.equal(layout.bytesPerRow, width * 8);
        assert.equal(layout.rowsPerImage, size.height);
        assert.ok(Math.ceil(layout.bytesPerRow / 256) * 256 * size.height <= Math.min(limit, 32 * 1024 * 1024));
        if (realPixels) assert.deepEqual([...data], [...pixels.subarray(nextRow * width * 4, (nextRow + size.height) * width * 4)]);
        else {assert.equal(data.start, nextRow * width * 4); assert.equal(data.end, (nextRow + size.height) * width * 4);}
        nextRow += size.height;
    }
    assert.equal(nextRow, height);
    assert.equal(context.gpuDiagnostics.uploads[0].chunks, calls.length);
    return calls.length;
}
assert.ok(check(8192, 5000, 268435456) > 1); // Android 10K first texture
assert.ok(check(1808, 5000, 268435456) > 1); // second texture, padded stride
assert.ok(check(8192, 7000, 268435456) > 1); // upload ceiling 14K
check(17, 7, 1024, true); // uneven final strip, exact pixel values
assert.throws(() => check(8192, 1, 1024), /single HDR texture row/);
console.log('PASS: HDR strip uploads respect buffer limits and cover all rows without changing pixels.');
