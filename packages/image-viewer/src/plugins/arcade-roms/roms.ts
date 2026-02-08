import { encode, type ImageData as PngImageData } from 'fast-png';
import { BitBufferRom } from '../../asm/BitBuffer';
import { BufferPtr } from '../../asm/BufferPtr';
import { dummyPalette } from './dummyPalette';

const littleEndian = true;

const palBaseAddr = 0xff80_0000;

interface Ctrl {
    zcom: boolean; // zero compression
    bpp: number;
    lmult: number;
    tmult: number;
}

export interface Metadata extends Ctrl {
    metaAddr: number;
    width: number;
    paddedWidth: number;
    height: number;
    xOffset: number;
    yOffset: number;
    pointer: number;
    paletteAddr?: number;
}

function parseCtrl(ctrl: number): Ctrl {
    const zcom = Boolean(ctrl & 0x80);
    const lmult = (ctrl & 0x300) >>> 8;
    const tmult = (ctrl & 0xc00) >>> 10;
    const bpp = (ctrl & 0x7000) >>> 12;

    return {
        zcom,
        bpp,
        lmult,
        tmult,
    };
}

function getMeta(
    dataView: DataView,
    offset: number,
    mk1?: boolean,
): Omit<Metadata, 'pointer'> {
    const metaAddr = offset - 8;
    const width = dataView.getUint16(offset - 8, littleEndian);
    const paddedWidth = (width + 3) & ~0x3;
    const height = (dataView.getUint16(offset - 6, littleEndian) + 3) & ~0x3;
    const xOffset = dataView.getInt16(offset - 4, littleEndian);
    const yOffset = dataView.getInt16(offset - 2, littleEndian);

    let ctrl: Ctrl;
    if (mk1) {
        ctrl = {
            bpp: 6,
            zcom: false,
            lmult: 0,
            tmult: 0,
        };
    } else {
        ctrl = parseCtrl(dataView.getUint16(offset + 4, littleEndian));
    }
    const paletteOffset = 4 + (mk1 ? 0 : 2);

    let paletteAddr: number | undefined = dataView.getUint32(
        offset + paletteOffset,
        littleEndian,
    );
    if (paletteAddr > palBaseAddr) {
        paletteAddr -= palBaseAddr;
        if (paletteAddr % 8) {
            // console.log(
            //     'warning: palette not on byte boundary! ',
            //     toHex(paletteAddr),
            // );
        }
        paletteAddr = Math.floor(paletteAddr / 8);
    } else {
        paletteAddr = undefined;
    }

    return {
        metaAddr,
        width,
        paddedWidth,
        height,
        xOffset,
        yOffset,
        ...ctrl,
        paletteAddr,
    };
}

export function scanForSprites(
    buffer: Uint8Array | ArrayBufferLike,
    start: number,
    gfxromLenInBits: number,
    mk1: boolean = false,
) {
    const end = start + gfxromLenInBits;
    const dataView = ArrayBuffer.isView(buffer)
        ? new DataView(buffer.buffer, buffer.byteOffset)
        : new DataView(buffer);
    const results: Metadata[] = [];
    for (let i = 8; i < buffer.byteLength - 4; i++) {
        const value = dataView.getUint32(i, littleEndian); // buffer[i];
        if (value >= start && value <= end) {
            // now check previous two longs for width/height and offsets that make sense
            const meta = getMeta(dataView, i, mk1);
            const { width, height, xOffset, yOffset } = meta;
            if (
                width < 300 &&
                width > 0 &&
                height < 300 &&
                height > 0 &&
                Math.abs(xOffset) < 100 &&
                Math.abs(yOffset) < 100
            ) {
                results.push({
                    ...meta,
                    pointer: value - start,
                });
            }
        }
    }

    return results;
}

/**
 * Extend the palette with the dummy palette to get it up to 256 bytes,
 * just in case that matters (and we're using the wrong palette).
 *
 * This is just for debugging.
 */
export function extendPalette(
    palette: [number, number, number, number][],
): [number, number, number, number][] {
    if (palette.length < 255) {
        const filler = dummyPalette.slice(palette.length);
        return [...palette, ...filler];
    }
    return palette.slice(0);
}

function decodeZcom(metadata: Metadata, buffer: Uint8Array) {
    const ptr = new BufferPtr(buffer, Math.floor(metadata.pointer / 8));
    const bitBuffer = new BitBufferRom(ptr, 8);
    const { width, paddedWidth, height, lmult, tmult, bpp } = metadata;
    const outBuf = new Uint8Array(paddedWidth * height);
    const outPtr = new BufferPtr(outBuf);
    const padding = paddedWidth - width;

    // if we're starting partly into a byte, read and discard the "remainder" bits
    const bitOffset = metadata.pointer % 8;
    bitBuffer.readBits(bitOffset);

    for (let row = 0; row < height; row++) {
        const leadTrail = bitBuffer.readBits(8);
        const lead = (leadTrail & 0xf) << lmult;
        const trail = ((leadTrail & 0xf0) >>> 4) << tmult;
        const middlePixelCount = width - (lead + trail);
        // console.log({ row, lead, trail, middlePixelCount });

        outPtr.fill(0, lead);

        for (let pixelsLeft = middlePixelCount; pixelsLeft > 0; pixelsLeft--) {
            outPtr.putAndInc(bitBuffer.readBits(bpp));
        }

        outPtr.fill(0, trail + padding);
    }
    return outBuf;
}

function unpackBits(metadata: Metadata, buffer: Uint8Array) {
    const ptr = new BufferPtr(buffer, Math.floor(metadata.pointer / 8));
    const bitBuffer = new BitBufferRom(ptr, 8);
    const { width, paddedWidth, height, bpp } = metadata;
    const padding = paddedWidth - width;
    const outBuf = new Uint8Array(paddedWidth * height);
    const outPtr = new BufferPtr(outBuf);

    // if we're starting partly into a byte, read and discard the "remainder" bits
    const bitOffset = metadata.pointer % 8;
    bitBuffer.readBits(bitOffset);

    for (let row = 0; row < height; row++) {
        for (let pixelsCopied = 0; pixelsCopied < width; pixelsCopied++) {
            outPtr.putAndInc(bitBuffer.readBits(bpp));
        }
        outPtr.fill(0, padding);
    }
    return outBuf;
}

export function decodeAsRaw(metadata: Metadata, buffer: Uint8Array) {
    // console.log(metadata, buffer.buffer);
    let data: Uint8Array;

    try {
        if (metadata.zcom) {
            data = decodeZcom(metadata, buffer);
        } else {
            data = unpackBits(metadata, buffer);
        }
    } catch (e) {
        console.log('skipping image due to error', e);
        return;
    }
    return data;
}

export function encodeAsPng(
    metadata: Metadata,
    data: Uint8Array,
    palette: number[][],
) {
    const { paddedWidth, height } = metadata;

    // console.log(metadata);
    const pngImageData: PngImageData = {
        width: paddedWidth,
        height,
        data,
        depth: 8,
        channels: 1,
        palette,
    };

    const result = encode(pngImageData);

    return result;
}

export interface DumpRomOptions {
    maincpu: ArrayBufferLike;
    gfxrom: ArrayBufferLike;
    mk1Mode?: boolean;
}

export function dumpRomMetadata({
    gfxrom,
    maincpu,
    mk1Mode = false,
}: DumpRomOptions): Metadata[] {
    const gfxLenInBits = gfxrom.byteLength * 8;
    const baseGfxAddr = mk1Mode ? 0x0200_0000 : 0;

    const results: Metadata[] = scanForSprites(
        maincpu,
        baseGfxAddr,
        gfxLenInBits,
        mk1Mode,
    );
    return results;
}
