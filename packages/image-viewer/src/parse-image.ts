export interface ImageFileHeader {
    imageCount: number;
    paletteCount: number;
    offset: number;
    version: number;
    sequenceCount: number;
    scriptCount: number;
    damageTableCount: number;
    format: number;
    // bufferScripts: number[];
    bufferScripts: [number, number, number, number];
}

export const int8 = Symbol('int8');
export const int16 = Symbol('int16');
export const int32 = Symbol('int32');
export const uint8 = Symbol('uint8');
export const uint16 = Symbol('uint16');
export const uint32 = Symbol('uint32');
export const fields = {
    int8,
    int16,
    int32,
    uint8,
    uint16,
    uint32,
} as const;

export interface ParseResult<T> {
    value: T;
    size: number;
}

export abstract class ClassField<T> {
    abstract parse(
        view: DataView<ArrayBufferLike>,
        bufferOffset: number,
    ): ParseResult<T>;
}

export class ByteStringField extends ClassField<string> {
    size: number;
    constructor(size: number) {
        super();
        this.size = size;
    }

    parse(view: DataView<ArrayBufferLike>, bufferOffset: number) {
        try {
            const codePoints = [];
            for (let i = 0; i < this.size; i++) {
                const byte = view.getUint8(bufferOffset + i);
                if (byte === 0) {
                    break;
                }
                codePoints.push(byte);
            }
            // console.log('codepoints', codePoints);
            return {
                value: String.fromCodePoint(...codePoints),
                size: this.size,
            };
        } catch (e) {
            console.warn('failed to parse!', e);
            return { value: '', size: this.size };
        }
    }
}

export type Fields = typeof fields;

const fileHeaderFormat = {
    imageCount: fields.uint16,
    paletteCount: fields.uint16,
    offset: fields.uint32,
    version: fields.uint16,
    sequenceCount: fields.uint16,
    scriptCount: fields.uint16,
    damageTableCount: fields.uint16,
    // 0xabcd: 16
    format: fields.uint16,
    // bufferScripts: [fields.int8, fields.int8, fields.int8, fields.int8],
    bufferScripts0: fields.uint8,
    bufferScripts1: fields.uint8,
    bufferScripts2: fields.uint8,
    bufferScripts3: fields.uint8,
    _padding2: fields.uint16,
    _padding3: fields.uint16,
    _padding4: fields.uint16,
} as const;
// const fileHeaderSize = 28;

export type FormatFields =
    | (typeof fields)[keyof typeof fields]
    | ByteStringField;
// type Format<T extends string> = Record<T, FormatFields>;
type Format<T extends string> = {
    [P in T]: FormatFields;
};

export type FormatSpecObject<O extends Record<string, FormatFields>> = {
    [Prop in keyof O as Prop]: O[Prop];
};

const formatLookupTable = {
    [int8]: {
        func: 'getInt8',
        size: 1,
    },
    [uint8]: {
        func: 'getUint8',
        size: 1,
    },
    [int16]: {
        func: 'getInt16',
        size: 2,
    },
    [uint16]: {
        func: 'getUint16',
        size: 2,
    },
    [int32]: {
        func: 'getInt32',
        size: 4,
    },
    [uint32]: {
        func: 'getUint32',
        size: 4,
    },
} as const;

export type FormatLookupTableKey = keyof typeof formatLookupTable;
export function isFormatLookupTableKey(
    value: unknown,
): value is FormatLookupTableKey {
    return typeof value === 'symbol' && value in formatLookupTable;
}

export interface ParseFromFormatResult<T> {
    result: T;
    offset: number;
}

export type FormatFieldReturn<T> = T extends ClassField<infer RT> ? RT : number;

export type ObjectParsedFromFormat<FieldObj> = {
    -readonly [Property in keyof FieldObj as Property]: FormatFieldReturn<
        FieldObj[Property]
    >;
};

export type FormatSpecEntries<T, K extends keyof T> = [K, T[K]][];

export function parseFromFormat<
    F extends FormatSpecObject<F>,
    T extends ObjectParsedFromFormat<F>,
    K extends string & keyof F & keyof T,
>(view: DataView<ArrayBufferLike>, format: F): ParseFromFormatResult<T> {
    let bufferOffset = 0;
    const result: Partial<T> = {};

    const entries = Object.entries(format) as FormatSpecEntries<T, K>;

    entries.forEach(([fieldName, fieldType]) => {
        if (fieldType instanceof ClassField) {
            const { value, size } = (fieldType as ClassField<F[K]>).parse(
                view,
                bufferOffset,
            );
            bufferOffset += size;
            result[fieldName] = value;
        } else if (isFormatLookupTableKey(fieldType)) {
            const tableEntry = formatLookupTable[fieldType];
            try {
                if (tableEntry.size === 1) {
                    result[fieldName] = view[tableEntry.func](
                        bufferOffset,
                    ) as (typeof result)[typeof fieldName];
                } else {
                    result[fieldName] = view[tableEntry.func](
                        bufferOffset,
                        true,
                    ) as (typeof result)[typeof fieldName];
                }
            } catch (e) {
                console.log('failed to parse!', e);
            }
            bufferOffset += tableEntry.size;
        }
    });

    return {
        result: result as T,
        offset: bufferOffset,
    };
}

export function parseImageFileHeader(
    buffer: ArrayBufferLike,
): ParseFromFormatResult<ImageFileHeader> {
    const view = new DataView(buffer);
    // const data: Partial<Image> = {};

    // data.imageCount = view.getInt16(fileHeaderOffsets.imageCount);
    // data.paletteCount = view.getInt16(fileHeaderOffsets.paletteCount);
    // data.offset = view.getInt32(4);

    const rv = parseFromFormat(view, fileHeaderFormat);
    return {
        ...rv,
        result: {
            ...rv.result,
            paletteCount: rv.result.paletteCount - 3,
            bufferScripts: [
                rv.result.bufferScripts0,
                rv.result.bufferScripts1,
                rv.result.bufferScripts2,
                rv.result.bufferScripts3,
            ],
        },
    };
}
