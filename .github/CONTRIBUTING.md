# Contributing to Pannellum HDR

This fork is maintained at [urix/pannellumhdr](https://github.com/urix/pannellumhdr).
Open issues and pull requests here for HDR additions and other fork changes.
The original [Pannellum project](https://github.com/mpetroff/pannellum) has its
own contribution and communication policies for work submitted upstream.

For bug reports, include a minimal reproducible example, browser and operating
system versions, and relevant console errors. For HDR issues, include the
`dynamicRange` setting, GPU / display details, and output from the loaded
viewer's `getRenderer().getHDRInfo()` and `getRenderer().getHDRDiagnostics()`.
Distinguish rendering errors from physical HDR display presentation.

Keep patches focused and follow the surrounding code style, including four
space indentation in viewer source. Document new configuration parameters in
`doc/json-config-parameters.md` and, when applicable, `doc/url-config-parameters.md`.
Preserve upstream copyright notices and bundled third-party license notices.

Run `npm run test:hdr` for HDR changes. Build the viewer and run relevant browser
checks as described in the root [README](../readme.md#tests). Include the commands
and results in the pull request, and state which browser / device checks remain
unverified. Generated `build/` files are ignored by Git; commit the source and
required worker, decoder, license, example, and test files instead.
