import {
    encode,
    type IndexedColors,
    type ImageData as PngImageData,
} from 'fast-png';
import type { ImageLibrary } from './useImageLibrary';
import { paletteToRgbArray, type Palettes } from './parse-image-header';

export function encodeAsPng(
    imageLibrary: ImageLibrary,
    imageIndex: number,
    paletteIndex: number,
) {
    const image = imageLibrary.images[imageIndex];
    const palette = imageLibrary.palettes[paletteIndex];
    const width = image.imageHeader.xSize;
    const height = image.imageHeader.ySize;

    const data = new Uint8Array(
        image.imageData.buffer,
        image.imageData.byteOffset,
        width * height,
    );

    const pngPalette: IndexedColors = paletteToRgbArray(
        palette.paletteHeader,
        palette.paletteData,
        0,
    );

    const pngImageData: PngImageData = {
        width,
        height,
        data,
        depth: 8,
        channels: 1,
        palette: pngPalette,
    };

    const result = encode(pngImageData);

    return result;
}

export function encodePaletteAsPng({ paletteHeader, paletteData }: Palettes) {
    const pixelCount = paletteHeader.numberOfColors;
    const width = 16;
    const height = Math.ceil(pixelCount / 16);

    const data = new Uint8ClampedArray(width * height);
    for (let i = 0; i < pixelCount; i++) {
        data[i] = i;
    }

    const pngPalette: IndexedColors = paletteToRgbArray(
        paletteHeader,
        paletteData,
        0,
    );

    const pngImageData: PngImageData = {
        width,
        height,
        data,
        depth: 8,
        channels: 1,
        palette: pngPalette,
    };

    const result = encode(pngImageData);

    return result;
}
