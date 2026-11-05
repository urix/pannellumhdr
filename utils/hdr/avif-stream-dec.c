/* Minimal libavif decoder with explicitly owned RGBA memory.
 * Pixel memory stays in WASM until release(), with no JS-sized RGBA copy.
 * libavif / libaom / libyuv license notices ship beside the WASM binary. */
#include <avif/avif.h>
#include <stdint.h>
#include <string.h>
static avifDecoder *decoder;
static avifRGBImage rgb;
static avifResult result;
void panorama_release(void) {
    if (rgb.pixels) avifRGBImageFreePixels(&rgb);
    memset(&rgb, 0, sizeof(rgb));
    if (decoder) avifDecoderDestroy(decoder);
    decoder = 0;
}
int panorama_decode(const uint8_t *data, size_t length) {
    panorama_release();
    decoder = avifDecoderCreate();
    if (!decoder) { result = AVIF_RESULT_OUT_OF_MEMORY; return result; }
    decoder->maxThreads = 1;
    result = avifDecoderSetIOMemory(decoder, data, length);
    if (result != AVIF_RESULT_OK) return result;
    result = avifDecoderParse(decoder);
    if (result != AVIF_RESULT_OK) return result;
    result = avifDecoderNextImage(decoder);
    if (result != AVIF_RESULT_OK) return result;
    avifRGBImageSetDefaults(&rgb, decoder->image);
    result = avifRGBImageAllocatePixels(&rgb);
    if (result != AVIF_RESULT_OK) return result;
    result = avifImageYUVToRGB(decoder->image, &rgb);
    // Only the owned RGBA pixels are needed during strip conversion.
    avifDecoderDestroy(decoder);
    decoder = 0;
    return result;
}
uint8_t *panorama_pixels(void) { return rgb.pixels; }
uint32_t panorama_width(void) { return rgb.width; }
uint32_t panorama_height(void) { return rgb.height; }
uint32_t panorama_depth(void) { return rgb.depth; }
uint32_t panorama_stride(void) { return rgb.rowBytes; }
const char *panorama_error(void) { return avifResultToString(result); }
