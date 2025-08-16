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

    const processEntry = (entry: Entry) => {
        if (entry.sequence) {
            entry.sequence.entries.forEach((entry2) => {
                processEntry(entry2);
            });
            return;
        }
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
    };

    sequence.entries.forEach((entry) => {
        processEntry(entry);
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
    options: ConstructorParameters<typeof GifBuildingState>[0],
) {
    const dims = calculateDimsAndPadding(sequence);

    const width = dims.paddingLeft + dims.width;
    const height = dims.paddingTop + dims.height;
    const { name } = sequence;

    let firstEntry = sequence.entries[0];
    if (firstEntry?.sequence) {
        firstEntry = firstEntry.sequence.entries[0];
    }
    if (!firstEntry?.image) {
        return { data: new Uint8Array(), width: 0, height: 0 };
    }

    const firstPalette =
        imageLibrary.palettes[firstEntry.image.imageHeader.palette];
    const gifPalette = toGifPalette(firstPalette);

    const { writer, resultBuffer, state } = createGifWriter(
        width,
        height,
        gifPalette,
        options,
    );

    sequence.entries.forEach((entry) => {
        if (entry.image) {
            appendEntryToGif(
                imageLibrary,
                sequence,
                entry,
                writer,
                dims.paddingLeft,
                dims.paddingTop,
                state,
            );
        } else if (entry.sequence) {
            entry.sequence.entries.forEach((entry) => {
                appendEntryToGif(
                    imageLibrary,
                    sequence,
                    entry,
                    writer,
                    dims.paddingLeft,
                    dims.paddingTop,
                    state,
                );
            });
        }
    });

    const len = writer.end();

    const finalResult = new Uint8Array(resultBuffer.buffer.slice(0, len));
    //console.log({ name, width, height, len }, finalResult);
    return { data: finalResult, width, height };
}

class GifBuildingState {
    cumulativeTicks: number;
    secondsPerFrame: number;
    ticksPerFrame: number;

    constructor({ fps = 54.70684, ticksPerFrame = 5 } = {}) {
        this.cumulativeTicks = 0;
        this.secondsPerFrame = 1 / fps;
        this.ticksPerFrame = ticksPerFrame;
    }
}

function appendEntryToGif(
    imageLibrary: ImageLibrary,
    sequence: SequenceScript,
    entry: Entry,
    writer: Writer,
    totalXOffset: number,
    totalYOffset: number,
    state: GifBuildingState,
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

    // nacho tells me each "tick" should be 16ms
    // leanyy mentions 1/54.70684 = 0.0183 (18.3ms)
    // gifs delay is in 1/100th of a second, so increments of 10ms
    // nacho's frame # = # of ticks gif has:
    //  1:  10ms
    //  2:  30ms
    //  3:  50ms
    //  4:  60ms
    //  5:  80ms
    //  6: 100ms
    //  7: 110ms
    //  8: 130ms
    //  9: 150ms
    // 10: 160ms
    //
    // For an animation who's IMG file has 1 tick in each frame, nacho's file has 80ms (5 ticks)
    // If you used 18.3ms per frame, it would work out to 93ms

    const previousTicks = state.cumulativeTicks;
    state.cumulativeTicks += entry.ticks;

    const { ticksPerFrame, secondsPerFrame, cumulativeTicks } = state;
    const previousTotalTime = Math.round(
        100 * ticksPerFrame * previousTicks * secondsPerFrame,
    );
    const newTotalTime = Math.round(
        100 * ticksPerFrame * cumulativeTicks * secondsPerFrame,
    );
    const delay = newTotalTime - previousTotalTime;

    // console.log(image.imageHeader.name, { ticks: entry.ticks, delay });

    writer.addFrame(totalXOffset + x, totalYOffset + y, width, height, data, {
        delay,
        disposal: 2,
        transparent: 0,
        palette: gifPalette,
    });
}

function createGifWriter(
    width: number,
    height: number,
    gifPalette: number[],
    options?: ConstructorParameters<typeof GifBuildingState>[0],
) {
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
    return { writer, resultBuffer, state: new GifBuildingState(options) };
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
