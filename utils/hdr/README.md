# Streaming HDR AVIF decoder

The worker retains RGBA in WASM and converts at most 8 MiB of float16 pixels
per upload. It waits for the renderer's GPU acknowledgement before creating the
next strip. No full JavaScript RGBA or float16 image is allocated. PQ AVIFs with
supported primary-image metadata are probed without a browser Image decode.
This includes Rec.2020 / PQ metadata and the known Adobe Rec.2020 PQ ICC profile;
unknown ICC profiles are rejected by the custom decoder.
Other formats retain the normal browser path; WebGPU failures lazily load a native
Image for WebGL fallback. HDR presentation and memory use on mobile devices require device testing.

## Rebuild

Use Emscripten **4.0.10**, libavif **v1.1.1**, libaom **v3.11.0-rc1**, and
libyuv **a6a2ec654b1be1166b376476a7555c89eca0c275**. Keep dependencies in an
isolated build directory. Put libyuv sources in `LIBAVIF_SOURCE/ext/libyuv`.
The generated decoder and license notices are checked into `src/js/hdr/vendor`.

Configure aom with `emcmake cmake -S AOM_SOURCE -B AOM_BUILD` and:

```
-DCMAKE_BUILD_TYPE=Release -DCMAKE_C_FLAGS="-msimd128 -msse2 -msse4.1"
-DAOM_TARGET_CPU=generic -DENABLE_DOCS=OFF -DENABLE_TESTS=OFF
-DENABLE_EXAMPLES=OFF -DENABLE_TOOLS=OFF -DCONFIG_MULTITHREAD=0
-DCONFIG_RUNTIME_CPU_DETECT=0 -DCONFIG_AV1_ENCODER=0
-DCONFIG_AV1_DECODER=1 -DCONFIG_AV1_HIGHBITDEPTH=1 -DENABLE_CCACHE=OFF
```

Build aom, then configure libavif with `emcmake cmake -S LIBAVIF_SOURCE -B LIBAVIF_BUILD` and:

```
-DCMAKE_BUILD_TYPE=Release -DCMAKE_C_FLAGS="-msimd128 -msse2 -msse4.1"
-DCMAKE_CXX_FLAGS="-msimd128 -msse2 -msse4.1" -DBUILD_SHARED_LIBS=OFF
-DAVIF_CODEC_AOM=SYSTEM -DAOM_LIBRARY=AOM_BUILD/libaom.a -DAOM_INCLUDE_DIR=AOM_SOURCE
-DAVIF_CODEC_AOM_ENCODE=OFF -DAVIF_CODEC_AOM_DECODE=ON -DAVIF_LIBYUV=LOCAL
-DAVIF_BUILD_APPS=OFF -DAVIF_LIBSHARPYUV=OFF -DAVIF_ENABLE_EXPERIMENTAL_SAMPLE_TRANSFORM=ON
```

Run `cmake --build LIBAVIF_BUILD --target avif`, then with `emcc` on PATH:

```
sh utils/hdr/build-stream-dec.sh LIBAVIF_SOURCE LIBAVIF_BUILD AOM_BUILD
npm run test:hdr
```

Rebuild the viewer in `utils/build` and deploy its JavaScript together with the
complete `build/hdr` directory. The original icodec decoder is retained as an
independent reference for the pixel comparison in `tests/hdr-stream.test.mjs`;
the production worker uses only the streaming decoder.

Browser integration checks are in `tests/hdr-browser.test.cjs` (Playwright).
See the root [README](../../readme.md#tests) for Node.js requirements, the pinned
Playwright installation, and commands for source and built-viewer checks.
Set `PLAYWRIGHT_MODULE_PATH` and `CHROME_EXECUTABLE` if needed.
`PANNELLUM_BUILD=1` checks the generated bundle, `HDR_FULL_REGRESSION=1` also
checks GPU readback and HDR/SDR pixel stability. Optional `PANORAMA_8K_FIXTURE`
and `PANORAMA_10K_FIXTURE` point to local real-image files; they are not fetched
or committed by this test.
