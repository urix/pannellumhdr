# Pannellum HDR

[![CI](https://github.com/urix/pannellumhdr/actions/workflows/ci.yaml/badge.svg)](https://github.com/urix/pannellumhdr/actions/workflows/ci.yaml)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.3334433.svg)](https://doi.org/10.5281/zenodo.3334433)
[![DOI](https://joss.theoj.org/papers/10.21105/joss.01628/status.svg)](https://doi.org/10.21105/joss.01628)

## About

Pannellum HDR is a fork of [Pannellum](https://github.com/mpetroff/pannellum),
Matthew Petroff's free, open source panorama viewer for the web. It adds WebGPU
HDR output for equirectangular panoramas while retaining the WebGL renderer for
SDR, cubemaps, multiresolution panoramas, and fallback.

Rec.2020 / PQ AVIF still images are decoded with bundled WebAssembly code to
preserve 8-, 10-, or 12-bit source precision. The renderer converts PQ pixels to
linear Display-P3 and uploads bounded float16 strips to WebGPU. Supported PQ
AVIFs can also use deterministic SDR tone mapping. A JavaScript API and an
`<iframe>` viewer are included.

The DOI badges above and the research citation below refer to the original Pannellum
project. HDR additions are maintained in this repository by Yury Golubinsky.

### HDR support and limitations

- `dynamicRange: 'auto'` (default) requests HDR when the browser reports an
  HDR-capable display. `'high'` requests HDR regardless of display detection;
  `'standard'` requests SDR. For supported PQ AVIFs, SDR uses WebGPU with
  luminance-based Reinhard tone mapping when available.
- HDR output requires a secure context (HTTPS or localhost), WebGPU extended
  tone mapping, WebAssembly SIMD, module workers, and an HDR-capable display
  for visible HDR highlights. Forcing `'high'` does not add HDR capability to
  the display or browser.
- The PQ decoder supports Rec.2020 / PQ AVIF metadata and the known Adobe
  Rec.2020 PQ ICC profile. Other ICC profiles, gain-map reconstruction, HLG
  decoding, and crop / nonzero rotation / mirror transforms are not supported
  by this decoder. Other images use the browser's native image path, where
  HDR preservation depends on the browser.
- If HDR initialization fails, the viewer falls back to SDR WebGL. Cubemaps
  and multiresolution panoramas use SDR WebGL.
- HDR pixel correctness and physical display presentation are separate checks.
  See the [HDR parameter documentation](doc/json-config-parameters.md#dynamicrange-string)
  for a previously observed Chrome presentation issue and the diagnostic pages.

## Getting started

### Hosted examples

The original Pannellum [examples](https://pannellum.org/documentation/examples/simple-example/)
are hosted on [pannellum.org](https://pannellum.org/). They demonstrate the
upstream viewer's functionality and provide starting points for custom
configurations. For this fork's HDR example, use the local instructions below.

### Simple tutorial and configuration utility

If you are just looking to display a single panorama without any advanced functionality, the steps for doing so are covered on the [simple tutorial page](https://pannellum.org/documentation/overview/tutorial/). Said page also includes a utility for easily creating the necessary Pannellum configuration.

### Local testing and self-hosting

From the repository root, start a local server:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Open [the HDR example](http://localhost:8000/examples/example-hdr.htm). It uses
source files and the bundled `examples/test-hdr.avif`, so no build is required.
Stop the server with `Control-C`. Use localhost for testing; plain HTTP over a
LAN address does not provide the secure context required by WebGPU.

See _How to use_ for deployment and _Building_ for minified files.

## How to use

1. Build this fork as described in _Building_. Upload `build/pannellum.htm`, the
   complete `build/hdr/` directory beside it, and your panorama to a web server.
   Serve production HDR pages over HTTPS.
2. Use the included multi-resolution generator (`utils/multires/generate.py`), the configuration tool (`utils/config/configuration.htm`), or create a configuration from scratch or based on an [example](https://pannellum.org/documentation/examples/simple-example/).
3. Insert the generated `<iframe>` code into a page, or create a more advanced configuration with [JSON](https://pannellum.org/documentation/reference) or the [API](https://pannellum.org/documentation/api/).

Configuration parameters, including this fork's `dynamicRange` option, are documented in [doc/json-config-parameters.md](doc/json-config-parameters.md). The [upstream reference](https://pannellum.org/documentation/reference) covers the original parameters. API methods are documented inline with [JSDoc](https://jsdoc.app/) comments, and generated documentation is available at [pannellum.org/documentation/api/](https://pannellum.org/documentation/api/). For the standalone viewer, configuration parameters are preferably specified using a location hash instead of a location search query, e.g., `pannellum.htm#panorama=...` instead of `pannellum.htm?panorama=...`, since this does not unnecessarily send the query parameters to the server.

### Using a minified copy

Build the minified files from this repository. Upstream Pannellum releases do
not include this fork's HDR additions. Deploy either:

- `build/pannellum.htm` together with the complete `build/hdr/` directory for
  an `<iframe>` viewer; or
- `build/pannellum.js`, `build/pannellum.css`, and the complete `build/hdr/`
  directory for JavaScript integration.

Keep `hdr/` beside the viewer file. Serve `.mjs` files as JavaScript and `.wasm`
files as `application/wasm`. If using a Content Security Policy, allow the local
module worker and decoder modules, WASM compilation, and panorama requests.
The standalone HTML includes the viewer's JavaScript and CSS; its HDR decoder
files remain external.

For example, after deploying the standalone files:

```html
<iframe width="960" height="480" allowfullscreen
    src="pannellum.htm#panorama=panorama.avif&amp;autoLoad=true&amp;dynamicRange=auto"></iframe>
```

For JavaScript integration, load the CSS and script, give the container an
explicit size, and create the viewer:

```html
<link rel="stylesheet" href="pannellum.css">
<div id="panorama" style="width: 100%; height: 480px;"></div>
<script src="pannellum.js"></script>
<script>
const viewer = pannellum.viewer('panorama', {
    type: 'equirectangular',
    panorama: 'panorama.avif',
    autoLoad: true,
    dynamicRange: 'auto'
});
</script>
```

After the viewer loads, `viewer.getRenderer().getDynamicRange()` reports the
active range (`high` or `standard`). On that renderer, `getHDRInfo()` describes
the custom PQ decoder pipeline and returns `null` for native image uploads or
WebGL rendering. `getHDRDiagnostics()` reports WebGPU initialization, decoder,
upload, and fallback details; it returns `null` if no WebGPU attempt was made.

### Using `generate.py` to create multires panoramas
To be able to create multiresolution panoramas, you need to have the `nona` program installed, which is available as part of [Hugin](http://hugin.sourceforge.net/), as well as Python 3 with the [Pillow](https://pillow.readthedocs.org/) and [NumPy](https://numpy.org/) packages. The [pyshtools](https://shtools.github.io/SHTOOLS/) Python package is also recommended. Then, run

```
python3 generate.py pano_image.jpg
```

in the `utils/multires` directory. This will generate all the image tiles and the `config.json` file in the `./output` folder by default. For this to work, `nona` needs to be on the system path; otherwise, the location of `nona` can be specified using the `-n` flag. On a Unix-like platform, with `nona` already on the system path use:

```bash
$ cd utils/multires
$ python3 generate.py pano_image.jpg
```

where `pano_image.jpg` is the filename of your equirectangular panorama. If `nona` is not on the system path, use:

```bash
$ cd utils/multires
$ python3 generate.py -n /path/to/nona pano_image.jpg
```

For a complete list of options, run:

```bash
$ python3 generate.py --help
```

To view the generated configuration, run:

```bash
$ cd ../..
$ python3 -m http.server
```

This goes back to the root directory of the repository and starts a local development web server. Then open http://localhost:8000/src/standalone/pannellum.htm#config=../../utils/multires/output/config.json in your web browser of choice.


## Bundled examples

Examples using both the minified version and the version in the `src` directory are included in the `examples` directory. These can be viewed by starting a local web server in the root of the repository, e.g., by running:
```bash
$ python3 -m http.server
```
in the directory containing this readme file, and then navigating to the hosted HTML files using a web browser; note that the examples use files from the `src` directory, so **the web server must be started from the repository root, not the `examples` directory**. For the `example-minified.htm` example to work, a minified copy of Pannellum must first be built; see the _Building_ section below for details.

The HDR example is `examples/example-hdr.htm`. Additional upstream examples are available at [pannellum.org](https://pannellum.org/documentation/examples/simple-example/).

## Browser Compatibility

The WebGL fallback retains the original viewer's browser compatibility goals.
The upstream feature-based minimums were Firefox 40, Chrome 41, Safari 9, and
Edge 12; these are not HDR support claims or a verified compatibility matrix
for this fork.

HDR requires the capabilities listed above and should be checked on the target
browser, operating system, GPU, and display. Automated Chromium tests verify
rendering and fallback behavior, but cannot prove physical HDR presentation.
Mobile devices and embedded app browsers require separate device testing.

## Translations

All user-facing strings can be changed using the `strings` configuration parameter. There exists a [third-party respository of user-contributed translations](https://github.com/DanielBiegler/pannellum-translation) that can be used with this configuration option.

## Building
The `utils` folder contains the required build tools, with the exception of Python 3.8+ and Java installations. To build a minified version of Pannellum, run either `build.sh` or `build.bat` depending on your platform. On a Unix-like platform:

```bash
$ cd utils/build
$ ./build.sh
```

If successful, this creates `build/pannellum.htm`, `build/pannellum.js`,
`build/pannellum.css`, and `build/hdr/`, relative to the repository root. Build
output is ignored by Git and must be generated after cloning. Java must be on
`PATH`; no Node.js or Emscripten installation is needed to build the viewer.

The compiled WASM decoders and their license notices are included in
`src/js/hdr/vendor/`. Rebuilding the custom decoder is a separate, optional
step documented in [utils/hdr/README.md](utils/hdr/README.md).

## Tests

### HDR checks

With Node.js 22.7+ (or Node.js 24), run from the repository root:

```bash
npm run test:hdr
```

This checks ICC metadata, streaming decoder output against the independent
reference decoder, worker transfers, and bounded strip uploads. Test fixtures
are included; no external panoramas are required.

For browser integration and GPU regression checks, install the pinned test
runner and its Chromium browser:

```bash
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
HDR_FULL_REGRESSION=1 npm run test:hdr:browser
PANNELLUM_BUILD=1 npm run test:hdr:browser
```

Build the viewer before running the last command. On Linux, use
`npx playwright install --with-deps chromium` to install browser dependencies
as well. `CHROME_EXECUTABLE` selects an existing Chrome executable, and
`PLAYWRIGHT_MODULE_PATH` selects a Playwright module outside this repository.
The `HDR_FULL_REGRESSION=1` and `PANNELLUM_BUILD=1` prefixes use shell environment
variable syntax; on Windows, set these variables using your shell's syntax.

The browser suite covers HDR and SDR output, WebGPU failure fallback, and,
with `HDR_FULL_REGRESSION=1`, GPU readback and pixel stability. The source and
built viewer are checked in CI. Physical display brightness and mobile memory
behavior still require device testing. See [decoder testing details](utils/hdr/README.md)
for optional local 8K / 10K fixtures.

With the local server running, open
[the independent HDR ramp](http://localhost:8000/tests/hdr-ramp.html) to inspect
browser / display presentation, or
[the GPU regression page](http://localhost:8000/tests/hdr-regression.html) for
pixel checks. These pages use source files; the regression page requires WebGPU.

### Original viewer checks

A minimal [Selenium](https://www.seleniumhq.org/)-based test suite is located in the `tests` directory. The tests can be executed by running:

```bash
python3 tests/run_tests.py
```

A Selenium-driven web browser (with a Chrome driver, by default) is created, and screenshots are generated
and compared against previously generated ones in [tests](tests). For example, to regenerate the screenshots
one can run:

```bash
$ python3 tests/run_tests.py --create-ref
```

And to simply run the tests to compare to, eliminate that argument. By default, a random
port is selected, along with other arguments. One can see usage via:

```bash
$ python3 tests/run_tests.py --help
```

Continuous integration tests are run via [GitHub Actions](https://github.com/urix/pannellumhdr/actions/workflows/ci.yaml). Running the tests locally requires Python 3, the Selenium Python bindings, [Pillow](https://pillow.readthedocs.io/), [NumPy](https://www.numpy.org/), and either Firefox & [geckodriver](https://github.com/mozilla/geckodriver) or Chrome & [ChromeDriver](https://chromedriver.chromium.org/).

## Seeking support

Report issues with this fork at [urix/pannellumhdr/issues](https://github.com/urix/pannellumhdr/issues).
For HDR reports, include the browser and OS versions, GPU / display information,
`dynamicRange` setting, a reproducible sample when possible, and renderer
information from `getHDRInfo()` / `getHDRDiagnostics()`. State whether the issue
concerns pixel values, visible display presentation, or fallback behavior.

## Contributing

Development of this fork takes place at [urix/pannellumhdr](https://github.com/urix/pannellumhdr).
See [the contribution guide](.github/CONTRIBUTING.md) for validation and reporting
requirements. The original Pannellum project retains its own contribution and
communication policies; follow those when submitting work upstream.

## License
Pannellum and this fork's viewer / streaming-wrapper changes are distributed
under the MIT License; see [COPYING](COPYING). Original copyright notices are
preserved. Bundled decoder components have their own notices in
[src/js/hdr/vendor](src/js/hdr/vendor); keep these with redistributed decoder files.

In the past, parts of Pannellum were based on [three.js](https://github.com/mrdoob/three.js) r40, which is licensed under the [MIT License](https://github.com/mrdoob/three.js/blob/44a8652c37e576d51a7edd97b0f99f00784c3db7/LICENSE).

Example panorama attribution and CC BY-SA 3.0 terms are recorded in
[example-image-copying.txt](examples/example-image-copying.txt) and
[test-hdr-copying.txt](examples/test-hdr-copying.txt). The HDR test panorama is
by Yury Golubinsky.

## Credits

* [Matthew Petroff](http://mpetroff.net/), Original Pannellum author
* Yury Golubinsky, HDR fork and HDR test panorama
* [three.js](https://github.com/mrdoob/three.js) r40, Former Underlying Framework

If used as part of academic research, please cite:

> Petroff, Matthew A. "Pannellum: a lightweight web-based panorama viewer." _Journal of Open Source Software_ 4, no. 40 (2019): 1628. [doi:10.21105/joss.01628](https://doi.org/10.21105/joss.01628)
