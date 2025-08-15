import { Writer } from 'ts-gif';

import type { ImageLibrary } from './useImageLibrary';
import {
    paletteToRgbArray,
    type Entry,
    type Palettes,
    type SequenceScript,
} from './parse-image-header';

export function encodeAsGif(
    imageLibrary: ImageLibrary,
    imageIndex: number,
    paletteIndex: number,
) {
    const image = imageLibrary.images[imageIndex];
    const palette = imageLibrary.palettes[paletteIndex];
    const width = image.imageHeader.xSize;
    const height = image.imageHeader.ySize;
    const name = image.imageHeader.name;

    const data = new Uint8Array(
        image.imageData.buffer,
        image.imageData.byteOffset,
        width * height,
    );

    const gifPalette = toGifPalette(palette);

    const { writer, resultBuffer } = createGifWriter(width, height, gifPalette);

    // Add frames
    writer.addFrame(0, 0, width, height, data, {
        delay: 100, // 100ms delay
        disposal: 2, // Clear frame before next
        transparent: 0,
        palette: gifPalette,
    });

    const len = writer.end();

    // if (name === 'DOT')
    const finalResult = new Uint8Array(resultBuffer.buffer.slice(0, len));
    // console.log({ name, width, height, len }, finalResult);
    return finalResult;
}

function calculateDimsAndPadding(sequence: SequenceScript) {
    let paddingLeft = 0;
    let paddingTop = 0;
    let width = 0;
    let height = 0;

    sequence.entries.forEach((entry) => {
        const h = entry.image?.imageHeader;
        if (!h) return;

        const cumX = sequence.startX + entry.deltaX;
        const cumY = sequence.startY + entry.deltaY;

        const xOffset = -h.xOffset + cumX;
        const yOffset = -h.yOffset + cumY;

        if (-xOffset > paddingLeft) paddingLeft = -xOffset;
        if (-yOffset > paddingTop) paddingTop = -yOffset;

        if (h.xSize + xOffset > width) width = h.xSize + xOffset;
        if (h.ySize + yOffset > height) height = h.ySize + yOffset;
    });

    return {
        paddingLeft,
        paddingTop,
        width,
        height,
    };
}

export function encodeSequenceAsGif(
    imageLibrary: ImageLibrary,
    sequence: SequenceScript,
) {
    const dims = calculateDimsAndPadding(sequence);

    const width = dims.paddingLeft + dims.width;
    const height = dims.paddingTop + dims.height;
    const { name } = sequence;

    const firstEntry = sequence.entries[0];
    const firstPalette =
        imageLibrary.palettes[firstEntry.image!.imageHeader.palette];
    const gifPalette = toGifPalette(firstPalette);

    const { writer, resultBuffer } = createGifWriter(width, height, gifPalette);

    sequence.entries.forEach((entry) => {
        appendEntryToGif(
            imageLibrary,
            sequence,
            entry,
            writer,
            dims.paddingLeft,
            dims.paddingTop,
        );
    });

    const len = writer.end();

    const finalResult = new Uint8Array(resultBuffer.buffer.slice(0, len));
    //console.log({ name, width, height, len }, finalResult);
    return { data: finalResult, width, height };
}

function appendEntryToGif(
    imageLibrary: ImageLibrary,
    sequence: SequenceScript,
    entry: Entry,
    writer: Writer,
    totalXOffset: number,
    totalYOffset: number,
) {
    const image = entry.image!;
    const palette = imageLibrary.palettes[image.imageHeader.palette];
    const gifPalette = toGifPalette(palette);
    const { xOffset, yOffset, xSize: width, ySize: height } = image.imageHeader;
    const { startX, startY } = sequence;

    const { deltaX, deltaY } = entry;
    const x = -xOffset + startX + deltaX;
    const y = -yOffset + startY + deltaY;

    const data = new Uint8Array(
        image.imageData.buffer,
        image.imageData.byteOffset,
        width * height,
    );
    // apparently gifs use 1/100th of a second instead of ms (1/1000 of a second) that most things use
    // const fps = 54; // too fast
    const fps = 10;
    const delay = Math.ceil((100 * entry.ticks) / fps);
    console.log(image.imageHeader.name, { ticks: entry.ticks, delay});

    writer.addFrame(totalXOffset + x, totalYOffset + y, width, height, data, {
        delay,
        disposal: 2,
        transparent: 0,
        palette: gifPalette,
    });
}

function createGifWriter(width: number, height: number, gifPalette: number[]) {
    const maxByteLength = 100 * 1024 * 1024; // 100MB

    const resultBuffer = new Uint8Array(
        new ArrayBuffer(width * height * 4, { maxByteLength }),
    ); // TODO: come up with a better initial size
    const writer = new Writer(
        resultBuffer as Buffer<ArrayBufferLike>,
        width,
        height,
        {
            palette: gifPalette,
            loop: 0, // 0 = loop forever
        },
    );
    return { writer, resultBuffer };
}

function toGifPalette(palette: Palettes) {
    const gifPalette = paletteToRgbArray(
        palette.paletteHeader,
        palette.paletteData,
        0,
    ).map(([r, g, b]) => (r << 16) | (g << 8) | b);
    while (true) {
        const logb2 = Math.log2(gifPalette.length);
        if (Math.floor(logb2) === logb2) break;
        gifPalette.push(0);
    }
    return gifPalette;
}
