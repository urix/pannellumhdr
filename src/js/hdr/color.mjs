// HDR AVIF utilities. RGB from libavif still uses the source transfer function.
// PQ: ITU-R BT.2100. SDR reference white: 203 cd/m² (ITU-R BT.2408).
export function pqToLinear(value) {
    const p = Math.pow(value, 32 / 2523);
    return Math.pow(Math.max(p - 3424 / 4096, 0) /
        (2413 / 128 - 2392 / 128 * p), 16384 / 2610) * (10000 / 203);
}

const float = new Float32Array(1);
const bits = new Uint32Array(float.buffer);
export function float16(value) {
    float[0] = value;
    const b = bits[0], sign = (b >>> 16) & 0x8000;
    const exponent = ((b >>> 23) & 255) - 127;
    let mantissa = b & 0x7fffff;
    if (exponent > 15) return sign | 0x7c00;
    if (exponent < -25) return sign;
    if (exponent < -14) {
        mantissa |= 0x800000;
        const shift = -exponent - 1;
        const half = 1 << (shift - 1);
        return sign | ((mantissa + half - 1 + ((mantissa >>> shift) & 1)) >>> shift);
    }
    return sign | (((exponent + 15) << 10) +
        ((mantissa + 0xfff + ((mantissa >>> 13) & 1)) >>> 13));
}

// Known Adobe Rec.2020 PQ ICC profile. Match the complete profile rather than
// trusting its editable description; unknown ICC transfer curves need color management.
const rec2020PQICC = atob('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2eTaq9ty3DrdAt3L3pTfXeAm4PDhuuKF41DkG+Tn5bLmf+dL6Bjo5emz6oHrT+we7O3tvO6M71zwLPD98c7yn/Nx9EP1FfXo9rv3j/hj+Tf6C/rg+7b8i/1h/jj/Dv/l/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////2N1cnYAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAQABAAEAAQABAAEAAQACAAIAAgACAAIAAwADAAMAAwAEAAQABAAFAAUABQAGAAYABgAHAAcACAAIAAkACQAJAAoACgALAAwADAANAA0ADgAPAA8AEAARABEAEgATABQAFAAVABYAFwAYABkAGgAbABwAHQAeAB8AIAAhACIAIwAkACUAJwAoACkAKgAsAC0ALgAwADEAMwA0ADYANwA5ADsAPAA+AEAAQgBDAEUARwBJAEsATQBPAFEAUwBVAFcAWgBcAF4AYABjAGUAaABqAG0AbwByAHUAdwB6AH0AgACDAIYAiQCMAI8AkgCVAJgAnACfAKIApgCpAK0AsQC0ALgAvADAAMQAyADMANAA1ADYAN0A4QDlAOoA7gDzAPgA/QEBAQYBCwEQARUBGwEgASUBKwEwATYBPAFBAUcBTQFTAVkBXwFlAWwBcgF5AX8BhgGNAZQBmwGiAakBsAG3Ab8BxgHOAdYB3gHmAe4B9gH+AgYCDwIXAiACKQIyAjsCRAJNAlcCYAJqAnQCfgKIApICnAKmArECuwLGAtEC3ALnAvMC/gMKAxUDIQMtAzoDRgNSA18DbAN5A4YDkwOgA64DvAPKA9gD5gP0BAMEEQQgBC8EPwROBF4EbgR+BI4EngSvBL8E0AThBPMFBAUWBSgFOgVMBV8FcgWFBZgFqwW/BdMF5wX7Bg8GJAY5Bk4GZAZ5Bo8Gpga8BtMG6gcBBxgHMAdIB2AHeAeRB6oHwwfdB/cIEQgrCEYIYQh8CJgItAjQCOwJCQkmCUQJYQl/CZ4JvAnbCfsKGgo6CloKewqcCr4K3wsBCyQLRgtqC40LsQvVC/oMHwxEDGoMkAy3DN4NBQ0tDVUNfg2nDdAN+g4lDk8Oew6mDtIO/w8sD1kPhw+2D+QQFBBEEHQQpRDWEQgROhFtEaAR1BIIEj0ScxKoEt8TFhNOE4YTvhP4FDEUbBSnFOIVHxVbFZkV1xYVFlQWlBbVFxYXWBeaF90YIRhlGKoY8Bk2GX0ZxRoNGlcaoRrrGzcbgxvPHB0caxy6HQodWx2sHf8eUh6lHvofTx+mH/0gVSCuIQchYiG9IhkidiLUIzMjkyP0JFYkuCUcJYAl5iZMJrQnHCeFJ/AoWyjHKTUpoyoTKoQq9StoK9wsUSzHLT4tti4vLqovJi+jMCEwoDEfMZ8yHzKgMyAzoTQiNKM1JTWmNig2qjcsN684MTi0OTc5uzo+OsI7RjvKPE480z1YPd0+Yj7oP20/80B5QQBBhkINQpRDG0OjRCpEskU6RcNGS0bUR11H5khwSPlJg0oNSphLIkutTDhMw01OTdpOZk7yT39QC1CYUSVRslJAUs5TW1PqVHhVB1WWViVWtFdEV9NYZFj0WYRaFVqmWzdbyVxbXOxdf14RXqRfN1/KYF1g8WGFYhlirWNCY9dkbGUBZZZmLGbCZ1ln72iGaR1ptGpMauRrfGwUbK1tRW3ebnhvEW+rcEVw33F6chVysHNLc+d0gnUedbt2V3b0d5F4L3jMeWp6CHqne0Z75HyEfSN9w35jfwN/pIBEgOWBh4IogsqDbIQPhLGFVIX3hpuHP4fjiIeJK4nQinWLG4vAjGaNDI2zjlmPAI+okE+Q95GfkkiS8JOZlEKU7JWWlkCW6peVmECY65mWmkKa7pubnEec9J2hnk+e/Z+roFmhCKG3omajFaPFpHWlJqXWpoenOKfqqJypTqoBqrOrZqwarM2tga41ruqvn7BUsQmxv7J1syyz4rSZtVC2CLbAt3i4MLjpuaK6XLsVu8+8ir1Evf++u792wDLA7sGrwmjDJcPixKDFXsYcxtvHmshayRnJ2cqZy1rMG8zczZ7OYM8iz+XQqNFr0i7S8tO21HvVQNYF1srXkNhW2R3Z5Nqr23LcOt0C3cvelN9d4Cbg8OG64oXjUOQb5OflsuZ/50voGOjl6bPqgetP7B7s7e287ozvXPAs8P3xzvKf83H0Q/UV9ej2u/eP+GP5N/oL+uD7tvyL/WH+OP8O/+X/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////Y3VydgAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQABAAEAAQABAAEAAQABAAIAAgACAAIAAgADAAMAAwADAAQABAAEAAUABQAFAAYABgAGAAcABwAIAAgACQAJAAkACgAKAAsADAAMAA0ADQAOAA8ADwAQABEAEQASABMAFAAUABUAFgAXABgAGQAaABsAHAAdAB4AHwAgACEAIgAjACQAJQAnACgAKQAqACwALQAuADAAMQAzADQANgA3ADkAOwA8AD4AQABCAEMARQBHAEkASwBNAE8AUQBTAFUAVwBaAFwAXgBgAGMAZQBoAGoAbQBvAHIAdQB3AHoAfQCAAIMAhgCJAIwAjwCSAJUAmACcAJ8AogCmAKkArQCxALQAuAC8AMAAxADIAMwA0ADUANgA3QDhAOUA6gDuAPMA+AD9AQEBBgELARABFQEbASABJQErATABNgE8AUEBRwFNAVMBWQFfAWUBbAFyAXkBfwGGAY0BlAGbAaIBqQGwAbcBvwHGAc4B1gHeAeYB7gH2Af4CBgIPAhcCIAIpAjICOwJEAk0CVwJgAmoCdAJ+AogCkgKcAqYCsQK7AsYC0QLcAucC8wL+AwoDFQMhAy0DOgNGA1IDXwNsA3kDhgOTA6ADrgO8A8oD2APmA/QEAwQRBCAELwQ/BE4EXgRuBH4EjgSeBK8EvwTQBOEE8wUEBRYFKAU6BUwFXwVyBYUFmAWrBb8F0wXnBfsGDwYkBjkGTgZkBnkGjwamBrwG0wbqBwEHGAcwB0gHYAd4B5EHqgfDB90H9wgRCCsIRghhCHwImAi0CNAI7AkJCSYJRAlhCX8Jngm8CdsJ+woaCjoKWgp7CpwKvgrfCwELJAtGC2oLjQuxC9UL+gwfDEQMagyQDLcM3g0FDS0NVQ1+DacN0A36DiUOTw57DqYO0g7/DywPWQ+HD7YP5BAUEEQQdBClENYRCBE6EW0RoBHUEggSPRJzEqgS3xMWE04ThhO+E/gUMRRsFKcU4hUfFVsVmRXXFhUWVBaUFtUXFhdYF5oX3RghGGUYqhjwGTYZfRnFGg0aVxqhGusbNxuDG88cHRxrHLodCh1bHawd/x5SHqUe+h9PH6Yf/SBVIK4hByFiIb0iGSJ2ItQjMyOTI/QkViS4JRwlgCXmJkwmtCccJ4Un8ChbKMcpNSmjKhMqhCr1K2gr3CxRLMctPi22Li8uqi8mL6MwITCgMR8xnzIfMqAzIDOhNCI0ozUlNaY2KDaqNyw3rzgxOLQ5Nzm7Oj46wjtGO8o8TjzTPVg93T5iPug/bT/zQHlBAEGGQg1ClEMbQ6NEKkSyRTpFw0ZLRtRHXUfmSHBI+UmDSg1KmEsiS61MOEzDTU5N2k5mTvJPf1ALUJhRJVGyUkBSzlNbU+pUeFUHVZZWJVa0V0RX01hkWPRZhFoVWqZbN1vJXFtc7F1/XhFepF83X8pgXWDxYYViGWKtY0Jj12RsZQFllmYsZsJnWWfvaIZpHWm0akxq5Gt8bBRsrW1Fbd5ueG8Rb6twRXDfcXpyFXKwc0tz53SCdR51u3ZXdvR3kXgveMx5anoIeqd7RnvkfIR9I33DfmN/A3+kgESA5YGHgiiCyoNshA+EsYVUhfeGm4c/h+OIh4kridCKdYsbi8CMZo0MjbOOWY8Aj6iQT5D3kZ+SSJLwk5mUQpTslZaWQJbql5WYQJjrmZaaQprum5ucR5z0naGeT579n6ugWaEIobeiZqMVo8WkdaUmpdamh6c4p+qonKlOqgGqs6tmrBqsza2BrjWu6q+fsFSxCbG/snWzLLPitJm1ULYItsC3eLgwuOm5orpcuxW7z7yKvUS9/767v3bAMsDuwavCaMMlw+LEoMVexhzG28eayFrJGcnZypnLWswbzNzNns5gzyLP5dCo0WvSLtLy07bUe9VA1gXWyteQ2FbZHdnk2qvbctw63QLdy96U313gJuDw4briheNQ5Bvk5+Wy5n/nS+gY6OXps+qB60/sHuzt7bzujO9c8Czw/fHO8p/zcfRD9RX16Pa794/4Y/k3+gv64Pu2/Iv9Yf44/w7/5f////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////9kZXNjAAAAAAAAAA1SZWMuIDIwMjAgUFEAAAAAdGV4dAAAAABDb3B5cmlnaHQgMjAyMiBBZG9iZSBTeXN0ZW1zIEluY29ycG9yYXRlZAAAAA==');
function isRec2020PQICC(buffer, start, end) {
    if (end - start !== rec2020PQICC.length) return false;
    const bytes = new Uint8Array(buffer, start, end - start);
    for (let i = 0; i < bytes.length; i++) {
        // Creation date and profile ID do not change the color transform.
        if ((i >= 24 && i < 36) || (i >= 84 && i < 100)) continue;
        if (bytes[i] !== rec2020PQICC.charCodeAt(i)) return false;
    }
    return true;
}

// Read only bounded ISO BMFF boxes; never search compressed image bytes for tags.
export function avifColor(buffer) {
    const view = new DataView(buffer);
    const text = offset => String.fromCharCode(...new Uint8Array(buffer, offset, 4));
    function boxes(start, end) {
        const result = [];
        while (start < end) {
            if (start + 8 > end) throw new Error('Truncated AVIF box.');
            let size = view.getUint32(start), header = 8;
            if (size === 1) {
                if (start + 16 > end) throw new Error('Truncated AVIF box.');
                size = view.getUint32(start + 8) * 4294967296 + view.getUint32(start + 12);
                header = 16;
            } else if (size === 0) size = end - start;
            if (!Number.isSafeInteger(size) || size < header || start + size > end)
                throw new Error('Invalid AVIF box size.');
            result.push({type:text(start + 4), start:start + header, end:start + size});
            start += size;
        }
        return result;
    }
    if (buffer.byteLength < 16 || text(4) !== 'ftyp') return null;
    const top = boxes(0, buffer.byteLength), ftyp = top[0];
    let avif = text(ftyp.start) === 'avif';
    for (let p = ftyp.start + 8; p + 4 <= ftyp.end; p += 4) avif ||= text(p) === 'avif';
    if (!avif) return null;
    const meta = top.find(b => b.type === 'meta');
    if (!meta) return null;
    const children = boxes(meta.start + 4, meta.end);
    const pitm = children.find(b => b.type === 'pitm');
    const iprp = children.find(b => b.type === 'iprp');
    if (!pitm || !iprp) return null;
    const primary = view.getUint8(pitm.start) === 0 ? view.getUint16(pitm.start + 4) : view.getUint32(pitm.start + 4);
    const properties = boxes(iprp.start, iprp.end);
    const ipco = properties.find(b => b.type === 'ipco');
    if (!ipco) return null;
    const entries = boxes(ipco.start, ipco.end), selected = [];
    for (const ipma of properties.filter(b => b.type === 'ipma')) {
        let p = ipma.start;
        const version = view.getUint8(p), wide = view.getUint32(p) & 1;
        const count = view.getUint32(p + 4); p += 8;
        function read(n) {
            if (p + n > ipma.end) throw new Error('Truncated AVIF property association.');
            const value = n === 1 ? view.getUint8(p) : n === 2 ? view.getUint16(p) : view.getUint32(p);
            p += n; return value;
        }
        for (let i = 0; i < count; i++) {
            const item = read(version === 0 ? 2 : 4), associations = read(1);
            for (let j = 0; j < associations; j++) {
                const index = read(wide ? 2 : 1) & (wide ? 0x7fff : 0x7f);
                if (item === primary && index) {
                    if (!entries[index - 1]) throw new Error('Invalid AVIF property index.');
                    selected.push(entries[index - 1]);
                }
            }
        }
    }
    const icc = selected.filter(b => b.type === 'colr' && b.end - b.start >= 4 &&
        ['prof', 'rICC'].includes(text(b.start)));
    // ICC takes precedence over nclx: never interpret an unknown ICC as PQ.
    if (icc.some(b => !isRec2020PQICC(buffer, b.start + 4, b.end)))
        throw new Error('HDR AVIF ICC profile is not supported.');
    const colr = selected.find(b => b.type === 'colr' && b.end - b.start >= 11 && text(b.start) === 'nclx');
    const color = icc.length ? {primaries: 9, transfer: 16} : colr ?
        {primaries:view.getUint16(colr.start + 4), transfer:view.getUint16(colr.start + 6)} : null;
    if (!color || color.transfer !== 16) return null;
    if (color.primaries !== 9) throw new Error('HDR AVIF currently requires Rec.2020 primaries.');
    // Some encoders include an explicit zero-degree rotation. It leaves the
    // decoded pixels unchanged and does not require transform support.
    if (selected.some(b => b.type === 'imir' || b.type === 'clap' ||
        (b.type === 'irot' && (b.end - b.start !== 1 || view.getUint8(b.start) !== 0))))
        throw new Error('HDR AVIF image transforms are not supported.');
    const ispe = selected.find(b => b.type === 'ispe' && b.end - b.start >= 12);
    if (ispe) {
        color.width = view.getUint32(ispe.start + 4);
        color.height = view.getUint32(ispe.start + 8);
    }
    return color;
}

// Converts only one rectangular strip; the input may be a borrowed WASM view.
export function linearP3Strip(image, sourceX, tileWidth, sourceY, rows) {
    const {width, height, depth, data} = image;
    if (![8, 10, 12].includes(depth) || data.byteLength !== width * height * 4 * (depth > 8 ? 2 : 1))
        throw new Error('Unexpected AVIF pixel layout.');
    if (sourceX < 0 || sourceY < 0 || tileWidth < 1 || rows < 1 ||
        sourceX + tileWidth > width || sourceY + rows > height)
        throw new Error('Invalid AVIF strip dimensions.');
    const input = depth > 8 ? new Uint16Array(data.buffer, data.byteOffset, data.byteLength / 2) : data;
    const maximum = (1 << depth) - 1;
    const lut = new Float32Array(maximum + 1);
    for (let i = 0; i <= maximum; i++) lut[i] = pqToLinear(i / maximum);
    const output = new Uint16Array(tileWidth * rows * 4);
    let peak = 0;
    for (let y = 0; y < rows; y++) {
        let src = ((sourceY + y) * width + sourceX) * 4, dst = y * tileWidth * 4;
        for (let x = 0; x < tileWidth; x++, src += 4, dst += 4) {
            const r = lut[input[src]], g = lut[input[src + 1]], b = lut[input[src + 2]];
            // Rec.2020 linear -> Display-P3 linear, both D65.
            const pr = 1.343578252*r - 0.282179670*g - 0.061398582*b;
            const pg = -0.065297452*r + 1.075787916*g - 0.010490464*b;
            const pb = 0.002821787*r - 0.019598495*g + 1.016776708*b;
            output[dst] = float16(pr);
            output[dst + 1] = float16(pg);
            output[dst + 2] = float16(pb);
            output[dst + 3] = float16(input[src + 3] / maximum);
            peak = Math.max(peak, pr, pg, pb);
        }
    }
    return {width: tileWidth, height: rows, data: output, peak};
}

export function linearP3Tiles(image, widths) {
    let sourceX = 0, peak = 0;
    const tiles = widths.map(tileWidth => {
        const tile = linearP3Strip(image, sourceX, tileWidth, 0, image.height);
        sourceX += tileWidth;
        peak = Math.max(peak, tile.peak);
        return tile;
    });
    if (sourceX !== image.width) throw new Error('AVIF texture widths do not match the image.');
    return {tiles, peak, depth: image.depth, width: image.width, height: image.height};
}
