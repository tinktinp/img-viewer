import fs from 'node:fs';
import path from 'node:path';

import {
    encode,
    type IndexedColors,
    type ImageData as PngImageData,
} from 'fast-png';
import { BufferPtr } from '../asm/BufferPtr';
import {
    paletteToActNumberArray,
    processPaletteInFormat,
} from '../palettes/palettes';

// this maps fileId numbers to filenames
import graphicsFilesMap from './graphics-files-map.json';

// TODO: replace these hard coded files, scan the binary instead

// import spirteHeaders from './sprite-headers.json';
// import newPals from './pals.json';
// the headers for all the sprites
const spriteHeaders: Record<string, SpriteHeader> = {};
// palette symbol information
const newPals: PaletteInfo[] = [];

const segment2base = 0x8ca54;

export interface DumpMk1PcOptions {
    outdir: string;
    indir: string;
}

interface PaletteInfo {
    name: string;
    offset: number;
}

export function encodePaletteAsPng(
    numberOfColors: number,
    pngPalette: IndexedColors,
) {
    const pixelCount = numberOfColors;
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
        palette: pngPalette,
    };

    const result = encode(pngImageData);

    return result;
}

interface Palette {
    id: string;
    paletteSize: number;
    rgb: number[][];
}

function extractPalette(
    buffer: Uint8Array,
    { name, offset }: PaletteInfo,
): Palette {
    const ptr = new BufferPtr(buffer, offset);

    const palette = processPaletteInFormat(ptr, name, 'XRGB1555');
    if (palette.rgb.length > 0) {
        palette.rgb[0][3] = 255;
        palette.rgb.unshift([0, 0, 0, 0]);
    }
    return palette;
}

export interface SpriteHeader {
    name: string;
    offset: number;
    width: number;
    height: number;
    xOffset: number;
    yOffset: number;
    dataOffset: number;
    fileId: number;
    palette?: number;
}

export function encodeAsPng(
    metadata: { width: number; height: number },
    data: Uint8Array,
    palette: number[][],
) {
    const { width, height } = metadata;

    // console.log(metadata);
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

const traceDecoding = false;

function loadGfxFile(spriteHeader: SpriteHeader, indir: string) {
    traceDecoding &&
        console.log(
            'loading sprite from %s',
            graphicsFilesMap[spriteHeader.fileId],
        );
    const gfxFilename = graphicsFilesMap[spriteHeader.fileId].split('/');
    const gfxFile = new Uint8Array(
        fs.readFileSync(path.join(indir, ...gfxFilename)).buffer,
    );
    return gfxFile;
}

/**
 * Decode / uncompress the run-length encoded (RLE) pixel data.
 *
 * Based on description given here http://blog.rewolf.pl/blog/?p=1982
 *
 */
function mk1DosRleDecode(
    outByteLength: number,
    inPtr: BufferPtr,
) {
    const outBuf = new Uint8Array(new ArrayBuffer(outByteLength));
    const outPtr = new BufferPtr(outBuf);

    const startOffset = inPtr.offset;

    traceDecoding && console.log('outByteLength', outByteLength);

    // This is a `while (true)` so that we can optionally log *why* we broke out of the loop.
    // If we ran out of input, that is most likely a bug (or a bad file).
    // Normally we should exactly fill up the output buffer.
    while (true) {
        if (outPtr.atEnd()) {
            traceDecoding &&
                console.log(
                    'ran out of outBuf space! relative inPtr.offset: %s, outPtr.offset: %s',
                    inPtr.offset - startOffset,
                    outPtr.offset,
                );
            break;
        }
        if (inPtr.atEnd()) {
            traceDecoding &&
                console.log(
                    'ran off the end of inbuf!! relative inPtr.offset: %s, outPtr.offset: %s',
                    inPtr.offset - startOffset,
                    outPtr.offset,
                );
            break;
        }

        const dword = inPtr.getAndInc32Le();
        if (dword & 0b1) {
            const zeros = dword >>> 1;
            traceDecoding &&
                console.log('hit zeros case: %s outPtr.offset', {
                    zeros,
                    'outPtr.offset': outPtr.offset,
                });
            outPtr.fill(0, zeros);
        } else if (dword & 0b10) {
            const pixel = (dword >>> 2) & 0xff;
            const repeats = dword >>> 10;
            traceDecoding &&
                console.log('hit run length case:', {
                    pixel,
                    repeats,
                    'outPtr.offset': outPtr.offset,
                });
            outPtr.fill(pixel, repeats);
        } else {
            const literalRunLenOrig = dword >>> 2;
            const literalRunLenAligned = (literalRunLenOrig + 3) & ~3;
            traceDecoding &&
                console.log('hit literal case:', {
                    literalRunLenOrig,
                    literalRunLenAligned,
                    'outPtr.offset': outPtr.offset,
                });
            for (let i = 0; i < literalRunLenOrig; i++) {
                outPtr.putAndInc(inPtr.getAndInc());
            }
            inPtr.offset += literalRunLenAligned - literalRunLenOrig;
        }
    }
    return outBuf;
}

function extractSprite(
    _buffer: Uint8Array,
    indir: string,
    spriteHeader: SpriteHeader,
) {
    const gfxFile = loadGfxFile(spriteHeader, indir);

    const outByteLength = spriteHeader.width * spriteHeader.height;
    const inPtr = new BufferPtr(gfxFile, spriteHeader.dataOffset);
    const outBuf = mk1DosRleDecode(outByteLength, inPtr);

    return outBuf;
}

export function dumpMk1Pc({ outdir, indir }: DumpMk1PcOptions) {
    indir = path.normalize(path.resolve(indir));
    outdir = path.normalize(path.resolve(outdir));

    const paletteMap: Record<string, Palette> = {};
    const paletteOffsetMap: Record<string, Palette> = {};

    if (!fs.existsSync(outdir)) {
        console.log('Error! outdir "%s" does not exist!', outdir);
        return 1;
    }

    const mk1exe = new Uint8Array(
        fs.readFileSync(path.join(indir, 'MK1.EXE')).buffer,
    );

    fs.mkdirSync(path.join(outdir, 'act'), { recursive: true });
    fs.mkdirSync(path.join(outdir, 'palette-png'), { recursive: true });
    fs.mkdirSync(path.join(outdir, 'image'), { recursive: true });

    for (const paletteInfo of newPals) {
        const palette = extractPalette(mk1exe, paletteInfo);
        paletteMap[palette.id] = palette;
        paletteOffsetMap[paletteInfo.offset] = palette;
        const act = paletteToActNumberArray(palette.rgb);
        const png = encodePaletteAsPng(palette.paletteSize, palette.rgb);
        fs.writeFileSync(path.join(outdir, 'act', `${palette.id}.act`), act);
        fs.writeFileSync(
            path.join(outdir, 'palette-png', `${palette.id}.png`),
            png,
        );
    }

    // arbitrarily chosen starting default palette
    let lastPalette = paletteMap['LUKANG_P'];

    for (const [name, spriteHeader] of Object.entries(spriteHeaders)) {
        const pixelData = extractSprite(mk1exe, indir, {
            ...spriteHeader,
            name,
            offset: spriteHeader.dataOffset,
        });
        if (typeof spriteHeader.palette === 'number') {
            const switchTo =
                paletteOffsetMap[spriteHeader.palette + segment2base];
            if (switchTo) {
                lastPalette = switchTo;
            }
        }
        const png = encodeAsPng(spriteHeader, pixelData, lastPalette.rgb);
        fs.writeFileSync(path.join(outdir, 'image', `${name}.png`), png);
    }
}
