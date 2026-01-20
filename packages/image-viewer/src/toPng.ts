import {
    encode,
    type IndexedColors,
    type ImageData as PngImageData,
} from 'fast-png';
import {
    type Palettes,
    paletteBufferToRgbArray,
    paletteToRgbArray,
} from './parse-image-header';
import type { ImageLibrary } from './useImageLibrary';

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

export function encodeRgba32AsPng(
    data: Uint8Array,
    width: number,
    height: number,
) {
    const pngImageData: PngImageData = {
        width,
        height,
        data,
        depth: 8,
        channels: 4,
    };

    const result = encode(pngImageData);

    return result;
}

export function encodeRgb32AsPng(
    data: Uint8Array,
    width: number,
    height: number,
) {
    const pngImageData: PngImageData = {
        width,
        height,
        data,
        depth: 8,
        channels: 3,
    };

    const result = encode(pngImageData);

    return result;
}

export function encodeBufferAndPaletteArrayAsPng(
    data: Uint8Array,
    palette: number[][],
    width: number,
    height: number,
) {
    const widthXheight = width * height;

    if (data.byteLength < widthXheight) {
        console.warn(
            'width*height is %o but only got %o bytes! padding...',
            widthXheight,
            data.byteLength,
        );
        const data2 = new Uint8Array(widthXheight);
        data2.set(data);
        data = data2;
    }

    const pngImageData: PngImageData = {
        width,
        height,
        data,
        depth: 8,
        channels: 1,
        palette,
    };

    const result = encode(pngImageData);

    return result;
}

export function encodeBuffersAsPng(
    data: Uint8Array,
    palette: Uint8Array | IndexedColors,
    paletteFormat: string,
    width: number,
    height: number,
) {
    const pngPalette: IndexedColors = palette instanceof Uint8Array ? paletteBufferToRgbArray(
        new DataView(palette.buffer, palette.byteOffset),
        palette.byteLength / 2,
        0,
        paletteFormat,
    ) : palette;

    const widthXheight = width * height;

    if (data.byteLength < widthXheight) {
        console.warn(
            'width*height is %o but only got %o bytes! padding...',
            widthXheight,
            data.byteLength,
        );
        const data2 = new Uint8Array(widthXheight);
        data2.set(data);
        data = data2;
    }

    const pngImageData: PngImageData = {
        width,
        height,
        data,
        depth: 8,
        channels: 1,
        palette: pngPalette,
    };

    try {
        const result = encode(pngImageData);
        return result;
    } catch (e) {
        console.error('abc: failed to create png!', pngImageData, e);
        throw e;
    }
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

export function encodeRgbArrayPaletteAsPng(rgba: IndexedColors) {
    const pixelCount = rgba.length;
    const width = 16;
    const height = Math.ceil(pixelCount / 16);

    const data = new Uint8ClampedArray(width * height);
    for (let i = 0; i < pixelCount; i++) {
        data[i] = i;
    }

    const pngImageData: PngImageData = {
        width,
        height,
        data,
        depth: 8,
        channels: 1,
        palette: rgba,
    };

    const result = encode(pngImageData);

    return result;
}
