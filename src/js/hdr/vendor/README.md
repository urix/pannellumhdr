AVIF decoder from icodec 0.6.0 (MIT), https://github.com/Kaciras/icodec
Only dist/avif-dec.js and dist/avif-dec.wasm are included, unmodified.
NPM archive SHA-1: bf3619bf21e7ae9d9e1192a67689d9163c793519

Built upstream with libavif v1.1.1 and libaom v3.11.0-rc1.
License notices are included alongside these files; libavif's notice includes
its bundled third-party components. No encoder is shipped.

The wrapper uses the original integer RGBA output and depth; it does not use
browser ImageData, which cannot represent these 10/12-bit integer pixels.

Streaming HDR decoder (`avif-stream-dec.js` / `.wasm`): custom C wrapper in
`utils/hdr/avif-stream-dec.c`, built with Emscripten 4.0.10, libavif v1.1.1,
libaom v3.11.0-rc1, and libyuv a6a2ec654b1be1166b376476a7555c89eca0c275.
It retains RGBA in WASM until explicit release; the worker borrows the memory
and converts / transfers bounded strips with GPU acknowledgements. The original
icodec decoder is retained only as an independent reference for regression tests.
The streaming wrapper is covered by this repository's MIT license; third-party
notices are LICENSE-libavif, LICENSE-aom and LICENSE-libyuv.
See `utils/hdr/README.md` for rebuilding.
