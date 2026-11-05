#!/bin/sh
# Dependencies must already be unpacked and built; no downloads or global installs.
set -eu
if [ "$#" -ne 3 ]; then
    echo 'Usage: build-stream-dec.sh LIBAVIF_SOURCE LIBAVIF_BUILD AOM_BUILD' >&2
    exit 2
fi
avif_source=$1
avif_build=$2
aom_build=$3
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_dir=$(CDPATH= cd -- "$script_dir/../.." && pwd)
emcc "$script_dir/avif-stream-dec.c" "$avif_build/libavif_internal.a" \
    "$aom_build/libaom.a" "$avif_build/_deps/libyuv-build/libyuv.a" \
    -I"$avif_source/include" -O3 -msimd128 --no-entry \
    -sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=web,worker,node \
    -sALLOW_MEMORY_GROWTH=1 -sMEMORY_GROWTH_GEOMETRIC_STEP=0 \
    -sMAXIMUM_MEMORY=2147483648 \
    '-sEXPORTED_FUNCTIONS=["_malloc","_free","_panorama_decode","_panorama_release","_panorama_pixels","_panorama_width","_panorama_height","_panorama_depth","_panorama_stride","_panorama_error"]' \
    '-sEXPORTED_RUNTIME_METHODS=["HEAPU8","UTF8ToString"]' \
    -o "$repo_dir/src/js/hdr/vendor/avif-stream-dec.js"
