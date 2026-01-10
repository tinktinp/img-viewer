import type { BufferPtr } from '../asm/BufferPtr';

export function processOnePalette(
    ptr: BufferPtr,
    id = '',
) {
    const rgb: number[][] = [];
    const paletteSize = ptr.getAndInc16Le();
    if (paletteSize === 0) {
        return { id, paletteSize, rgb };
    }

    for (let counter = paletteSize; counter > 0; counter--) {
        const color = ptr.getAndInc16Le();

        // const g = (color & 0x3e0) >> 5;
        // const b = color & 0x1f;
        // const r = (color & 0x7c00) >> 10;
        // rgb.push([8 * r, 8 * g, 8 * b, 255]);
        rgb.push([
            8 * ((color >> 0) & 31),
            8 * ((color >> 5) & 31),
            8 * ((color >> 10) & 31),
            255,
        ]);
    }
    rgb[0][3] = 0; // index zero is transparent
    return { id, paletteSize, rgb };
}

export function processPaletteInFormatWithSize(
    paletteSize: number,
    ptr: BufferPtr,
    id = '',
    format: PaletteFormat,
) {
    const rgb: number[][] = [];
    if (paletteSize === 0) {
        return { id, paletteSize, rgb };
    }

    for (let counter = paletteSize; counter > 0; counter--) {
        const color = ptr.getAndInc16();

        const entry = paletteEntrytoRGB(color, format);
        entry.push(255);
        rgb.push(entry);
    }
    rgb[0][3] = 0; // index zero is transparent
    return { id, paletteSize, rgb };
}

export function processPaletteInFormat(
    ptr: BufferPtr,
    id = '',
    format: PaletteFormat,
) {
    const rgb: number[][] = [];
    const paletteSize = ptr.getAndInc16Le();
    if (paletteSize === 0) {
        return { id, paletteSize, rgb };
    }

    for (let counter = paletteSize; counter > 0; counter--) {
        const color = ptr.getAndInc16Le();

        const entry = paletteEntrytoRGB(color, format);
        entry.push(255);
        rgb.push(entry);
    }
    rgb[0][3] = 0; // index zero is transparent
    return { id, paletteSize, rgb };
}

// trying to understand what is different between the .rgb and .pal files
// looks like pal right shifted compared to rgb, and always has the highest bit zero
// also I'm reading it in as a big endian 16 bit word in both cases
// RGB 0xFF39 = 0b   11111 11100 111001
// PAL 0x7F9C = 0b 0 11111 11100 11100
// RGB 0xFCA5 = 0b   11111 10010 10010 1
// PAL 0x7E52 = 0b 0 11111 10010 10010
// for some of these, they are not the same even with the shifting:
// rgb 0x5801 = 0b   10110 00000 0000 1
// pal 0x2C21 = 0b 0 10110 00010 0001

export function mktN64PaletteEntryToRGB(
    paletteData: DataView<ArrayBufferLike>,
    indexColor: number,
    paletteFormat: string,
) {
    const paletteColor = paletteData.getUint16(indexColor * 2, false);
    return paletteEntrytoRGB(paletteColor, paletteFormat as PaletteFormat);
}

export type PaletteFormat =
    | 'RGBX5551'
    | 'XRGB1555'
    | 'RGB565'
    | 'RGB655'
    | 'RGB556'
    | 'BGRX5551'
    | 'XBGR1555'
    | 'BGR565'
    | 'BGR655'
    | 'BGR556';

export function paletteEntrytoRGB(
    paletteColor: number,
    paletteFormat: PaletteFormat,
): [number, number, number] {
    if (paletteFormat === 'RGBX5551') {
        const red = 8 * ((paletteColor >> 11) & 31);
        const green = 8 * ((paletteColor >> 6) & 31);
        const blue = 8 * ((paletteColor >> 1) & 31);
        return [red, green, blue];
    } else if (paletteFormat === 'XRGB1555') {
        const red = 8 * ((paletteColor >> 10) & 31);
        const green = 8 * ((paletteColor >> 5) & 31);
        const blue = 8 * ((paletteColor >> 0) & 31);
        return [red, green, blue];
    } else if (paletteFormat === 'RGB565') {
        const red = 8 * ((paletteColor >> 11) & 31);
        const green = 4 * ((paletteColor >> 5) & 63);
        const blue = 8 * ((paletteColor >> 0) & 31);
        return [red, green, blue];
    } else if (paletteFormat === 'RGB655') {
        const red = 4 * ((paletteColor >> 10) & 63);
        const green = 8 * ((paletteColor >> 5) & 31);
        const blue = 8 * ((paletteColor >> 0) & 31);
        return [red, green, blue];
    } else if (paletteFormat === 'RGB556') {
        const red = 8 * ((paletteColor >> 11) & 31);
        const green = 8 * ((paletteColor >> 6) & 31);
        const blue = 4 * ((paletteColor >> 0) & 63);
        return [red, green, blue];
    } else if (paletteFormat === 'BGRX5551') {
        const blue = 8 * ((paletteColor >> 11) & 31);
        const green = 8 * ((paletteColor >> 6) & 31);
        const red = 8 * ((paletteColor >> 1) & 31);
        return [red, green, blue];
    } else if (paletteFormat === 'XBGR1555') {
        const blue = 8 * ((paletteColor >> 10) & 31);
        const green = 8 * ((paletteColor >> 5) & 31);
        const red = 8 * ((paletteColor >> 0) & 31);
        return [red, green, blue];
    } else if (paletteFormat === 'BGR565') {
        const blue = 8 * ((paletteColor >> 11) & 31);
        const green = 4 * ((paletteColor >> 5) & 63);
        const red = 8 * ((paletteColor >> 0) & 31);
        return [red, green, blue];
    } else if (paletteFormat === 'BGR655') {
        const blue = 4 * ((paletteColor >> 10) & 63);
        const green = 8 * ((paletteColor >> 5) & 31);
        const red = 8 * ((paletteColor >> 0) & 31);
        return [red, green, blue];
    } else if (paletteFormat === 'BGR556') {
        const blue = 8 * ((paletteColor >> 11) & 31);
        const green = 8 * ((paletteColor >> 6) & 31);
        const red = 4 * ((paletteColor >> 0) & 63);
        return [red, green, blue];
    } else {
        throw new Error(`Unknown palette format ${paletteFormat}!`);
    }
}
export function paletteToActNumberArray(rgb: number[][]) {
    // const buffer = new Uint8Array(data.length * 3 + 2);
    const buffer = new Uint8Array(256 * 3 + 4);
    rgb.forEach(([r, g, b], i) => {
        buffer[i * 3] = r;
        buffer[i * 3 + 1] = g;
        buffer[i * 3 + 2] = b;
    });
    buffer[256 * 3] = rgb.length & 0xff;
    return buffer;
}
