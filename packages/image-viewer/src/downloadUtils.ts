import { paletteToActNumberArray } from './palettes/palettes';
import { type Palettes, paletteToRgbArray } from './parse-image-header';

export function downloadFile({
    name,
    type,
    data,
}: {
    name: string;
    type: string;
    data: BlobPart | Uint8Array | ArrayBufferLike;
}) {
    const blob = new Blob([data as BlobPart], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();

    URL.revokeObjectURL(url);
}

export function paletteToAct(palette: Palettes | number[][]) {
    if (Array.isArray(palette)) {
        return paletteToActNumberArray(palette);
    }
    return paletteToActPalette(palette);
}

export function paletteToActPalette(palette: Palettes) {
    const data = paletteToRgbArray(palette.paletteHeader, palette.paletteData);
    // const buffer = new Uint8Array(data.length * 3 + 2);
    const buffer = new Uint8Array(256 * 3 + 4);
    data.forEach(([r, g, b], i) => {
        buffer[i * 3] = r;
        buffer[i * 3 + 1] = g;
        buffer[i * 3 + 2] = b;
    });
    buffer[256 * 3] = data.length & 0xff;
    return buffer;
}
