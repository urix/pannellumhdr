import {avifColor, linearP3Strip} from './color.mjs';

let acknowledge;
self.onmessage = async function(event) {
    if (event.data.ack !== undefined) {
        if (acknowledge && acknowledge.id === event.data.ack) {
            acknowledge.resolve();
            acknowledge = null;
        }
        return;
    }
    let decoder, inputPointer;
    try {
        const {blob, widths, width, height, maxUploadBytes = 8 * 1024 * 1024} = event.data;
        self.postMessage({progress: 'read-avif'});
        const buffer = await blob.arrayBuffer();
        const profile = avifColor(buffer);
        if (!profile) { self.postMessage({result: null}); return; }
        if (event.data.probe) {
            self.postMessage({result: profile.width && profile.height ?
                {width: profile.width, height: profile.height, hdrSource: true} : null});
            return;
        }
        self.postMessage({progress: 'load-decoder'});
        const {default:createDecoder} = await import('./vendor/avif-stream-dec.js');
        decoder = await createDecoder();
        inputPointer = decoder._malloc(buffer.byteLength);
        if (!inputPointer) throw new Error('Unable to allocate AVIF input.');
        decoder.HEAPU8.set(new Uint8Array(buffer), inputPointer);
        self.postMessage({progress: 'decode-avif'});
        const status = decoder._panorama_decode(inputPointer, buffer.byteLength);
        if (status) throw new Error('AVIF decode failed: ' + decoder.UTF8ToString(decoder._panorama_error()));
        const image = {width: decoder._panorama_width(), height: decoder._panorama_height(),
            depth: decoder._panorama_depth()};
        const rowBytes = image.width * 4 * (image.depth > 8 ? 2 : 1);
        if (decoder._panorama_stride() !== rowBytes) throw new Error('Unexpected AVIF row stride.');
        // Borrow pixel memory. The decoder retains ownership until all uploads finish.
        image.data = new Uint8Array(decoder.HEAPU8.buffer, decoder._panorama_pixels(), rowBytes * image.height);
        const memory = {wasmHeapBytes: decoder.HEAPU8.byteLength,
            rgbaBytes: image.data.byteLength, rgbaCopiedToJS: false, maxUploadBytes};
        self.postMessage({progress: 'check-dimensions', memory,
            dimensions: {width: image.width, height: image.height, depth: image.depth, rgbaBytes: image.data.byteLength}});
        if (image.width !== width || image.height !== height)
            throw new Error('Decoded AVIF dimensions ' + image.width + 'x' + image.height +
                ' do not match panorama ' + width + 'x' + height + '.');
        if (widths.reduce((sum, value) => sum + value, 0) !== width)
            throw new Error('AVIF texture widths do not match the image.');
        let sourceX = 0, peak = 0, id = 0;
        for (let texture = 0; texture < widths.length; texture++) {
            const tileWidth = widths[texture];
            const stagingRowBytes = Math.ceil(tileWidth * 8 / 256) * 256;
            const rowsPerStrip = Math.floor(maxUploadBytes / stagingRowBytes);
            if (rowsPerStrip < 1) throw new Error('HDR upload limit is smaller than a row.');
            for (let y = 0; y < height; y += rowsPerStrip) {
                self.postMessage({progress: 'convert-hdr-strip'});
                const tile = linearP3Strip(image, sourceX, tileWidth, y, Math.min(rowsPerStrip, height - y));
                peak = Math.max(peak, tile.peak);
                const done = new Promise(resolve => {acknowledge = {id, resolve};});
                self.postMessage({strip: {id, texture, y, width: tile.width,
                    height: tile.height, data: tile.data}}, [tile.data.buffer]);
                await done; // No next allocation until the GPU consumes this strip.
                id++;
            }
            sourceX += tileWidth;
        }
        decoder._panorama_release();
        decoder._free(inputPointer);
        inputPointer = 0;
        self.postMessage({result: {streamed: true, peak, depth: image.depth, width, height}});
    } catch (error) {
        self.postMessage({error: String(error.message || error)});
    } finally {
        if (decoder) {
            decoder._panorama_release();
            if (inputPointer) decoder._free(inputPointer);
        }
    }
};
