import {
    ByteStringField,
    fields,
    type ImageFileHeader,
    type ObjectParsedFromFormat,
    type ParseFromFormatResult,
    parseFromFormat,
} from './parse-image';

export const imageHeaderFormat = {
    name: new ByteStringField(16), // 16 bytes
    flags: fields.int16,
    xOffset: fields.int16,
    yOffset: fields.int16,
    xSize: fields.uint16,
    ySize: fields.uint16,
    palette: fields.int16,
    imageDataOffset: fields.int32,
    dataPointer: fields.uint32,
    unused: fields.uint16,
    damageTable0: fields.int8,
    damageTable1: fields.int8,
    damageTable2: fields.int8,
    damageTable3: fields.int8,
    damageTable4: fields.int8,
    damageTable5: fields.int8,
    frameNumber: fields.int16,
    ptTable: fields.int16,
    otherPalettes: fields.int16,
} as const;

export const oldImageHeaderFormat = {
    name: new ByteStringField(16), // 16 bytes
    xOffset: fields.int16,
    yOffset: fields.int16,
    xSize: fields.uint16,
    ySize: fields.uint16,
    palette: fields.int8,
    flags: fields.int8,
    imageDataOffset: fields.int32,
    dataPointer: fields.uint32,
    unused: fields.int16,
    collisionBox1: fields.int16,
    collisionBox2: fields.int16,
    collisionBox3: fields.int16,
} as const;

export interface ImageHeader {
    name: string;
    flags: number;
    xOffset: number;
    yOffset: number;
    xSize: number;
    ySize: number;
    palette: number;
    imageDataOffset: number;
    dataPointer: number;
    unused: number;
    damageTable0: number;
    damageTable1: number;
    damageTable2: number;
    damageTable3: number;
    damageTable4: number;
    damageTable5: number;
    damageTable: number[];
    frameNumber: number;
    ptTable: number; // point table FIXME: rename
    otherPalettes: number;
}

export interface Image {
    imageHeader: ImageHeader;
    imageData: DataView<ArrayBufferLike>;
}

export const versions = {
    PointTable: 0x60a,
    AltPalettes: 0x61d,
    LargeModelsAndDamageTables: 0x632,
    Revert: 0x634,
} as const;

// Mk2 files seem to be 0x63c and 0x62e

export function parseImageHeader(
    buffer: ArrayBufferLike,
    offset: number,
    imageFileHeader: ImageFileHeader,
) {
    if (offset > buffer.byteLength) {
        console.warn('offset %d is out of range of buffer', offset, buffer);
        return {
            result: {} as unknown as ImageHeader,
            offset: 0,
            imageData: new DataView(new ArrayBuffer()),
        };
    }
    const view = new DataView(buffer, offset);
    const { version } = imageFileHeader;

    let rv: ParseFromFormatResult<
        | ObjectParsedFromFormat<typeof imageHeaderFormat>
        | ObjectParsedFromFormat<typeof oldImageHeaderFormat>
    >;
    let damageTable: number[] = [];
    if (imageFileHeader.format === 0xabcd) {
        const parseFromFormatResult = parseFromFormat(view, imageHeaderFormat);
        const { result } = parseFromFormatResult;
        rv = parseFromFormatResult;
        damageTable = [
            result.damageTable0,
            result.damageTable0,
            result.damageTable1,
            result.damageTable2,
            result.damageTable3,
            result.damageTable4,
            result.damageTable5,
        ];

        if (version === 0x632 || version === 0x633) {
            offset = 56;
        } else {
            offset = 50;
        }
    } else {
        console.log('parsing as oldImg...');
        rv = parseFromFormat(view, oldImageHeaderFormat);
        //offset = 28;
        offset = 42;
    }
    rv.result.xSize = (rv.result.xSize + 3) & ~3;

    let imageData: DataView<ArrayBufferLike> | undefined;
    try {
        imageData = new DataView(
            buffer,
            rv.result.imageDataOffset,
            rv.result.xSize * rv.result.ySize,
        );
    } catch (e) {
        console.error('failed to create dataview of image data', e, rv);
        imageData = new DataView(new ArrayBuffer());
    }

    return {
        ...rv,
        result: {
            ...(rv.result as unknown as ImageHeader),
            palette: rv.result.palette - 3,
            damageTable,
        },
        imageData,
        offset,
    };
}

export interface PaletteHeader {
    name: string;
    flags: number;
    dataPointer: number;
    unused: number;
    bitsPerPixel: number;
    numberOfColors: number;
    offset: number;
    colorIndicator: number;
    colorMap: number;
    _unused: number;
}

export interface Palettes {
    paletteHeader: PaletteHeader;
    paletteData: DataView<ArrayBufferLike>;
}

export const paletteHeaderFormat = {
    name: new ByteStringField(10),
    flags: fields.uint8,
    bitsPerPixel: fields.uint8,
    numberOfColors: fields.int16,
    offset: fields.int32,
    dataPointer: fields.uint16,
    unused: fields.uint16,
    colorIndicator: fields.uint8,
    colorMap: fields.int8,
    _unused: fields.uint16,
} as const;

export function sizesFromVersion(version: number) {
    return {
        oldImage: 28, // 42?
        image:
            version < versions.LargeModelsAndDamageTables ||
            version >= versions.Revert
                ? 50
                : 56,
        palette:
            version < versions.LargeModelsAndDamageTables ||
            version >= versions.Revert
                ? 26
                : 30,
        //sequenceScript: 98,
        sequenceScriptFormat: 0x3a,
        entry: version < versions.LargeModelsAndDamageTables ? 16 : 18,
    } as const;
}

export function parsePaletteHeader(
    buffer: ArrayBufferLike,
    offset: number,
    _imageFileHeader: ImageFileHeader,
): {
    result: PaletteHeader;
    paletteData: DataView<ArrayBufferLike>;
    offset: number;
} {
    if (offset > buffer.byteLength) {
        return {
            offset: 0,
            result: {} as PaletteHeader,
            paletteData: new DataView(new ArrayBuffer()),
        };
    }
    const view = new DataView(buffer, offset);

    const rv = parseFromFormat(view, paletteHeaderFormat);
    let paletteData: DataView<ArrayBufferLike> | undefined;
    try {
        paletteData = new DataView(
            buffer,
            rv.result.offset,
            rv.result.numberOfColors * 2,
        );
    } catch (e) {
        console.warn('failed to create dataview of palette data', e);
        paletteData = new DataView(new ArrayBuffer());
    }
    return {
        ...rv,
        result: {
            ...rv.result,
        } as unknown as PaletteHeader,
        paletteData,
    };
}

export function imageAndPaletteToImageData(
    imageHeader: ImageHeader,
    imageData: DataView<ArrayBufferLike> | undefined,
    _paletteHeader: unknown,
    paletteData: DataView<ArrayBufferLike> | undefined,
): ImageData {
    if (!imageData || !paletteData) {
        throw new Error('missing image or palette data!');
    }
    const pixelCount = imageHeader.xSize * imageHeader.ySize;
    const buffer = new Uint8ClampedArray(pixelCount * 4);
    try {
        for (let i = 0; i < pixelCount; i++) {
            const ri = i * 4;
            const gi = ri + 1;
            const bi = ri + 2;
            const ai = ri + 3;

            const indexColor = imageData.getUint8(i);
            const paletteColor = paletteData.getUint16(indexColor * 2, true);
            buffer[ri] = 8 * ((paletteColor >> 10) & 0b11111);
            buffer[gi] = 8 * ((paletteColor >> 5) & 0b11111);
            buffer[bi] = 8 * ((paletteColor >> 0) & 0b11111);
            if (indexColor !== 0) buffer[ai] = 255;
        }
    } catch (e) {
        console.warn('failed to get pixel:', e);
    }
    return new ImageData(buffer, imageHeader.xSize, imageHeader.ySize);
}

/**
 * Creates an image to visualize a palette
 */
export function paletteToImageData(
    paletteHeader: PaletteHeader,
    paletteData: DataView<ArrayBufferLike> | undefined,
): ImageData {
    if (!paletteData) {
        throw new Error('missing palette data!');
    }
    const pixelCount = paletteHeader.numberOfColors;
    const width = 16;
    const height = Math.ceil(pixelCount / 16);

    const buffer = new Uint8ClampedArray(width * height * 4);
    try {
        for (let i = 0; i < pixelCount; i++) {
            const ri = i * 4;
            const gi = ri + 1;
            const bi = ri + 2;
            const ai = ri + 3;

            const indexColor = i;
            const paletteColor = paletteData.getUint16(indexColor * 2, true);
            buffer[ri] = 8 * ((paletteColor >> 10) & 0b11111);
            buffer[gi] = 8 * ((paletteColor >> 5) & 0b11111);
            buffer[bi] = 8 * ((paletteColor >> 0) & 0b11111);
            buffer[ai] = 255;
        }
        return new ImageData(buffer, width, height);
    } catch (e) {
        console.warn('failed to get pixel:', e);
        return new ImageData(new Uint8ClampedArray(4), 1, 1); // dummy image
    }
}

export function paletteToRgbArray(
    paletteHeader: PaletteHeader,
    paletteData: DataView<ArrayBufferLike> | undefined,
    alphaIndex?: number,
): number[][] {
    if (!paletteData) {
        throw new Error('missing palette data!');
    }
    const colorsCount = paletteHeader.numberOfColors;
    const buffer: number[][] = [];
    try {
        for (let i = 0; i < colorsCount; i++) {
            const indexColor = i;
            const paletteColor = paletteData.getUint16(indexColor * 2, true);
            const red = 8 * ((paletteColor >> 10) & 0b11111);
            const green = 8 * ((paletteColor >> 5) & 0b11111);
            const blue = 8 * ((paletteColor >> 0) & 0b11111);
            buffer.push([red, green, blue]);
        }
        if (alphaIndex !== undefined) {
            for (let i = 0; i < colorsCount; i++) {
                if (i === alphaIndex) {
                    buffer[i].push(0);
                } else {
                    buffer[i].push(255);
                }
            }
        }
    } catch (e) {
        console.warn('failed to get palette entry:', e);
    }
    return buffer;
}

export const animationEntryFormat = {
    itemPointer: fields.uint16,
    itemIndex: fields.uint8,
    ticks: fields.uint8,
    deltaX: fields.int16,
    deltaY: fields.int16,
    spare0: fields.int16,
    spare1: fields.int16,
    spare2: fields.int16,
    spare3: fields.int16,
} as const;

export const animationSequenceFormat = {
    number: fields.int16,
    entryPointers: new ByteStringField(32),
    name: new ByteStringField(16),
    spare1: fields.uint16,
    spare2: fields.uint16,
} as const;

export const bufferEntryFormat = {
    animationSequencePointer: fields.uint16,
    deltaX: fields.int16,
    deltaY: fields.int16,
    sequenceIndex: fields.int8,
    spare0: fields.int8,
    spare1: fields.int16,
    spare2: fields.int16,
} as const;

export const animationBufferFormat = {
    numberOfSequences: fields.int16,
    entryPointers: new ByteStringField(32), // FIXME
    startX: fields.int16,
    startY: fields.int16,
    spare1: fields.int16,
    spare2: fields.int16,
} as const;

export const genericEntryFormat = {
    itemPointer: fields.uint32,
    itemIndex: fields.int16,
    ticks: fields.uint8,
    padding: fields.uint8,
    deltaX: fields.int16,
    deltaY: fields.int16,
    spare1: fields.int16,
    spare2: fields.int16,
    spare3: fields.int16,
} as const;

export const smallGenericEntryFormat = {
    itemPointer: fields.uint16,
    itemIndex: fields.int16,
    ticks: fields.uint8,
    padding: fields.uint8,
    deltaX: fields.int16,
    deltaY: fields.int16,
    spare1: fields.int16,
    spare2: fields.int16,
    spare3: fields.int16,
    //spare4: fields.int8,
} as const;

export interface Entry {
    itemPointer: number;
    itemIndex: number;
    ticks: number;
    deltaX: number;
    deltaY: number;
    spare1: number;
    spare2: number;
    spare3: number;
    image?: Image;
    sequence?: SequenceScript;
}

export const sequenceScriptFormat = {
    name: new ByteStringField(16),
    flags: fields.int16,
    number: fields.int16,
    entryPointers: new ByteStringField(64), // FIXME
    startX: fields.int16,
    startY: fields.int16,
    damageTable0: fields.int8,
    damageTable1: fields.int8,
    damageTable2: fields.int8,
    damageTable3: fields.int8,
    damageTable4: fields.int8,
    damageTable5: fields.int8,
    spare1: fields.int16,
    spare2: fields.int16,
} as const;

export const smallSequenceScriptFormat = {
    name: new ByteStringField(16),
    flags: fields.int16,
    number: fields.int16,
    entryPointers: new ByteStringField(16 * 2), // FIXME
    startX: fields.int16,
    startY: fields.int16,
    spare1: fields.int16,
} as const;

export interface SequenceScript {
    name: string;
    flags: number;
    number: number;
    entryPointers: number[];
    startX: number;
    startY: number;
    damageTable0: number;
    damageTable1: number;
    damageTable2: number;
    damageTable3: number;
    damageTable4: number;
    damageTable5: number;
    spare1: number;
    spare2: number;
    entries: Entry[];
}

export function parseSequenceHeaders(
    buffer: ArrayBufferLike,
    fileHeader: ImageFileHeader,
    offset: number,
) {
    const sequenceScripts = [];

    for (let i = 0; i < fileHeader.sequenceCount; i++) {
        const { offset: newOffset, sequenceScript } = parseSequenceScriptHeader(
            buffer,
            offset,
            fileHeader,
        );
        sequenceScripts.push(sequenceScript);
        offset += newOffset;
    }
    return {
        offset,
        sequenceScripts,
    };
}

export function parseBufferScriptHeaders(
    buffer: ArrayBufferLike,
    fileHeader: ImageFileHeader,
    offset: number,
) {
    const sequenceScripts = [];

    for (let i = 0; i < fileHeader.scriptCount; i++) {
        const { offset: newOffset, sequenceScript } = parseSequenceScriptHeader(
            buffer,
            offset,
            fileHeader,
        );
        sequenceScripts.push(sequenceScript);
        offset += newOffset;
    }
    return {
        offset,
        sequenceScripts,
    };
}

function getSequenceFormats(fileHeader: ImageFileHeader) {
    if (fileHeader.format !== 0xabcd) {
        return {
            sequenceFormat: animationSequenceFormat,
            entryFormat: animationEntryFormat,
        };
    }

    const sequenceFormat =
        fileHeader.version < versions.LargeModelsAndDamageTables
            ? smallSequenceScriptFormat
            : sequenceScriptFormat;

    const entryFormat =
        fileHeader.version < versions.LargeModelsAndDamageTables
            ? smallGenericEntryFormat
            : genericEntryFormat;

    return {
        sequenceFormat,
        entryFormat,
    };
}

export function parseSequenceScriptHeader(
    buffer: ArrayBufferLike,
    offset: number,
    fileHeader: ImageFileHeader,
) {
    const originalOffset = offset;
    const view = new DataView(buffer, offset);

    const { sequenceFormat, entryFormat } = getSequenceFormats(fileHeader);

    const { offset: newOffset, result } = parseFromFormat(view, sequenceFormat);
    const sequenceScript = result as unknown as SequenceScript;

    const entries = [];

    let entryOffset = offset + newOffset;
    for (let i = 0; i < sequenceScript.number; i++) {
        const entryView = new DataView(buffer, entryOffset);
        const { result: entry, offset: entryOffsetDelta } = parseFromFormat(
            entryView,
            entryFormat,
        );
        entries.push(entry as Entry);
        entryOffset += entryOffsetDelta;
    }

    sequenceScript.entries = entries.reverse();
    // console.log(sequenceScript);
    sequenceScript.startX = sequenceScript.startX ?? 0;
    sequenceScript.startY = sequenceScript.startY ?? 0;

    return {
        sequenceScript,
        offset: entryOffset - originalOffset,
    };
}
