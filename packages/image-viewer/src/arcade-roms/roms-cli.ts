import fs from 'node:fs';
import path from 'node:path';

import { BufferPtr } from '../asm/BufferPtr';
import { processPaletteInFormat } from '../palettes/palettes';
import { toHex } from '../utils/toHex';
import { dummyPalette } from './dummyPalette';
import {
    decodeAsRaw,
    dumpRomMetadata,
    encodeAsPng,
    extendPalette,
    type Metadata,
    scanForSprites,
} from './roms';

export interface DumpRomCliOptions {
    outdir: string;
    gfxrom: string;
    maincpu: string;
    mk1?: boolean;
}

export function dumpRomNode({
    outdir: outFolder,
    gfxrom: gfxRomPath,
    maincpu: mainCpuPath,
    mk1 = false,
}: DumpRomCliOptions) {
    gfxRomPath = path.normalize(path.resolve(gfxRomPath));
    mainCpuPath = path.normalize(path.resolve(mainCpuPath));
    outFolder = path.normalize(path.resolve(outFolder));

    if (!fs.existsSync(outFolder)) {
        console.log('Error! outdir "%s" does not exist!', outFolder);
        return 1;
    }

    const gfxrom = new Uint8Array(fs.readFileSync(gfxRomPath).buffer);
    const maincpu = new Uint8Array(fs.readFileSync(mainCpuPath).buffer);

    const results: (Metadata & {
        outFilename?: string;
    })[] = dumpRomMetadata({
        maincpu: maincpu.buffer,
        gfxrom: gfxrom.buffer,
        mk1Mode: mk1
    });

    // const gfxLenInBits = gfxrom.byteLength * 8;
    // const baseGfxAddr = mk1 ? 0x0200_0000 : 0;

    // const results: (Metadata & {
    //     outFilename?: string;
    // })[] = scanForSprites(maincpu, baseGfxAddr, gfxLenInBits, mk1);

    let palette = dummyPalette;
    results.forEach((r) => {
        if (r.paletteAddr) {
            const { rgb } = processPaletteInFormat(
                new BufferPtr(maincpu, r.paletteAddr),
                '',
                'XRGB1555',
            );
            if (
                rgb &&
                rgb.length > 0 &&
                rgb.length < 255 &&
                rgb?.[0]?.length === 4
            ) {
                palette = extendPalette(
                    rgb as [number, number, number, number][],
                );
                // console.log('palette was %s is %s', rgb.length, palette.length);
            }
        }
        const rawData = decodeAsRaw(r, gfxrom);
        if (rawData) {
            const outFilename = `${toHex(r.metaAddr)}-${toHex(r.pointer)}-${r.paddedWidth}x${r.height}.png`;
            r.outFilename = outFilename;
            const outPathAndFilename = `${outFolder}${path.sep}${outFilename}`;
            if (fs.existsSync(outPathAndFilename)) {
                console.warn(
                    `Error already exists! Skipping "${outPathAndFilename}"!`,
                );
            }

            const png = encodeAsPng(r, rawData, palette);
            fs.writeFileSync(outPathAndFilename, png);
        }
    });

    const outPathAndFilename = `${outFolder}${path.sep}meta.json`;
    if (fs.existsSync(outPathAndFilename)) {
        console.warn(`Error already exists! Skipping "${outPathAndFilename}"!`);
    }
    const meta = JSON.stringify(results, null, 4);
    fs.writeFileSync(outPathAndFilename, meta);

    return 0;
}
