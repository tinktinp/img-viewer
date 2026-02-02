import { toHex } from '../utils/toHex';

export type BufferOrView<
    TArrayBuffer extends ArrayBufferLike = ArrayBufferLike,
> = ArrayBufferView<TArrayBuffer> | TArrayBuffer;

export interface BufferPtrOptions {
    defaultEndianness: 'be' | 'le';
}

export interface BufferPtrParamsArrayBufferLike<
    TArrayBuffer extends ArrayBufferLike = ArrayBufferLike,
> {
    buffer: TArrayBuffer;
    bufferByteOffset?: number;
    bufferByteLength?: number;
}
export interface BufferPtrParamsArrayBufferView<
    TArrayBuffer extends ArrayBufferLike = ArrayBufferLike,
> {
    buffer: ArrayBufferView<TArrayBuffer>;
}
export type BufferPtrParamsBufferVariants<
    TArrayBuffer extends ArrayBufferLike = ArrayBufferLike,
> =
    | BufferPtrParamsArrayBufferLike<TArrayBuffer>
    | BufferPtrParamsArrayBufferView<TArrayBuffer>;

export type BufferPtrParams<
    TArrayBuffer extends ArrayBufferLike = ArrayBufferLike,
> = BufferPtrParamsBufferVariants<TArrayBuffer> & {
    offset?: number;
    defaultEndianness?: 'be' | 'le';
};

// biome-ignore lint/suspicious/noShadowRestrictedNames: shadow it withitself or a placeholder
const SharedArrayBuffer = globalThis.SharedArrayBuffer
    ? globalThis.SharedArrayBuffer
    : globalThis.ArrayBuffer;

const textDecoder = new TextDecoder('iso-8859-1');

/**
 * a buffer and an "offset".
 *
 * In C, folks often use a pointer and increment the pointer as you go instead of using a subscript and indexing it.
 * You might see something like `*ptr++ = 5;` for writing or `value = *ptr++;` for reading.
 *
 * This class is designed to implement a similar pattern by bundling together a buffer and an offset into it,
 * and proving read and write methods that increment.
 */
export class BufferPtr<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike> {
    offset: number;
    buffer: Uint8Array<TArrayBuffer>;
    dataView: DataView<TArrayBuffer>;
    /** default endianness */
    le: boolean = true;

    constructor(params: BufferPtrParams<TArrayBuffer>);
    constructor(
        buffer: TArrayBuffer | ArrayBufferView<TArrayBuffer>,
        offset?: number,
        options?: Partial<BufferPtrOptions>,
    );
    constructor(
        bufferOrParams:
            | TArrayBuffer
            | ArrayBufferView<TArrayBuffer>
            | BufferPtrParams<TArrayBuffer>,
        offsetParam: number = 0,
        {
            defaultEndianness: defaultEndiannessParam = 'le',
            ...restOfOptions
        }: Partial<BufferPtrOptions> = {},
    ) {
        const params = getArgs<TArrayBuffer>(
            bufferOrParams,
            offsetParam,
            defaultEndiannessParam,
            restOfOptions,
        );
        const { buffer, offset, defaultEndianness } = params;

        this.offset = offset;
        this.le = defaultEndianness === 'le';

        if (ArrayBuffer.isView(buffer)) {
            this.buffer = new Uint8Array(
                buffer.buffer,
                buffer.byteOffset,
                buffer.byteLength,
            );
            this.dataView = new DataView(
                buffer.buffer,
                buffer.byteOffset,
                buffer.byteLength,
            );
        } else if (
            buffer instanceof ArrayBuffer ||
            buffer instanceof SharedArrayBuffer
        ) {
            const { bufferByteOffset, bufferByteLength } = params;
            this.dataView = new DataView<TArrayBuffer>(
                buffer,
                bufferByteOffset,
                bufferByteLength,
            );
            this.buffer = new Uint8Array<TArrayBuffer>(
                buffer,
                bufferByteOffset,
                bufferByteLength,
            );
        } else {
            throw new Error('buffer is not an ArrayBuffer or a Uint8Array!');
        }
    }

    get() {
        return this.buffer[this.offset];
    }
    getAndInc() {
        return this.buffer[this.offset++];
    }
    getAndDec() {
        return this.buffer[this.offset--];
    }
    putAndInc(data: number) {
        this.buffer[this.offset++] = data;
    }
    // putAndInc16(data: number) {
    //     this.buffer[this.offset++] = data & 0xff;
    //     this.buffer[this.offset++] = (data >>> 8) & 0xff;
    // }

    putAndInc16(data: number, le: boolean = this.le) {
        this.dataView.setUint16(this.offset, data, le);
        this.offset += 2;
    }
    putAndInc16Le(data: number) {
        this.putAndInc16(data, true);
    }
    putAndInc16Be(data: number) {
        this.putAndInc16(data, false);
    }

    fill(data: number, count: number) {
        if (!count) return;
        for (let i = 0; i < count; i++) {
            this.putAndInc(data);
        }
    }
    atEnd() {
        if (this.offset < 0) return true;
        return this.offset >= this.buffer.length;
    }
    get16(le: boolean = this.le) {
        return this.dataView.getUint16(this.offset, le);
    }
    get16Le() {
        return this.buffer[this.offset] | (this.buffer[this.offset + 1] << 8);
    }
    get32(le: boolean = this.le) {
        return this.dataView.getUint32(this.offset, le);
    }
    get32Le() {
        return (
            this.buffer[this.offset] |
            (this.buffer[this.offset + 1] << 8) |
            (this.buffer[this.offset + 2] << 16) |
            (this.buffer[this.offset + 3] << 24)
        );
    }

    getFloat32(le: boolean = this.le) {
        return this.dataView.getFloat32(this.offset, le);
    }

    get64(le: boolean = this.le) {
        return this.dataView.getBigUint64(this.offset, le);
    }

    getAndInc16(le: boolean = this.le) {
        const rv = this.get16(le);
        this.offset += 2;
        return rv;
    }
    getAndInc16Le() {
        const rv = this.get16Le();
        this.offset += 2;
        return rv;
    }
    getAndInc32(le: boolean = this.le) {
        const rv = this.get32(le);
        this.offset += 4;
        return rv;
    }
    getAndInc32Le() {
        const rv = this.get32Le();
        this.offset += 4;
        return rv;
    }

    getAndIncFloat32(le: boolean = this.le) {
        const rv = this.getFloat32(le);
        this.offset += 4;
        return rv;
    }

    getAndInc64(le: boolean = this.le) {
        const rv = this.get64(le);
        this.offset += 8;
        return rv;
    }

    static toSigned(input: number, bits: number) {
        const signBit = 1 << bits;
        const mask = signBit - 1;
        if (input >= signBit) {
            input = -((~input & mask) + 1);
        }
        return input;
    }

    getAndIncS8Le() {
        const rv = this.getAndInc();
        return BufferPtr.toSigned(rv, 7);
    }

    getAndIncS16(le: boolean = this.le) {
        const rv = this.dataView.getInt16(this.offset, le);
        this.offset += 2;
        return rv;
    }
    getAndIncS16Le() {
        const rv = this.getAndInc16Le();
        return BufferPtr.toSigned(rv, 15);
    }

    getAndIncS32(le: boolean = this.le) {
        const rv = this.dataView.getInt32(this.offset, le);
        this.offset += 4;
        return rv;
    }
    getAndIncS32Le() {
        const rv = this.getAndInc32Le();
        return BufferPtr.toSigned(rv, 31);
    }

    getStaticStr(size: number): string {
        const chars: number[] = [];
        for (let i = 0; i < size; i++) {
            const c = this.buffer[this.offset + i];
            if (c === 0) break;
            chars.push(c);
        }
        return String.fromCharCode(...chars);
    }

    getAndIncStaticStr(size: number): string {
        const ret = this.getStaticStr(size);
        this.offset += size;
        return ret;
    }

    getAsBuffer(size: number) {
        if (isTypedArray(this.buffer)) {
            const byteOffset = this.offset + this.buffer.byteOffset;
            const newBuffer = this.buffer.buffer.slice(
                byteOffset,
                byteOffset + size,
            );
            return newBuffer;
        }
        throw new Error('This method is not supported by current buffer type');
    }

    getAndIncAsBuffer(size: number) {
        if (size < 0)
            throw new Error(
                `Invalid 'size' of '${size}', 'size' must be positive`,
            );
        const ret = this.getAsBuffer(size);
        this.offset += size;
        return ret;
    }

    /**
     * Parses an array of C strings (null terminated char arrays). The strings
     * must by one after another in memory and separated by nul bytes.
     *
     * The offset of `this` will be after the last byte.
     *
     * @returns array of strings, strings do not include the null byte
     */
    getCStringArray(len?: number) {
        const start = this.offset;
        const rv: string[] = [];
        let strbuf = '';

        while (
            !this.atEnd() &&
            (len === undefined || this.offset <= start + len)
        ) {
            const char = this.getAndInc();
            if (char === 0) {
                rv.push(strbuf);
                strbuf = '';
            } else {
                strbuf += String.fromCharCode(char);
            }
        }

        return rv;
    }

    getCString(len?: number) {
        let nulByteIdx = this.buffer.indexOf(0, this.offset);
        if (len !== undefined && len < (nulByteIdx - this.offset)) {
            nulByteIdx = len + this.offset;
        }
        const buffy = this.buffer.slice(this.offset, nulByteIdx);
        this.offset = nulByteIdx + 1;
        return textDecoder.decode(buffy as unknown as Uint8Array);
    }

    getPascalString() {
        const len = this.getAndInc();
        const buffy = this.buffer.slice(this.offset, this.offset + len);
        this.offset += len;
        return textDecoder.decode(buffy as unknown as Uint8Array);
    }
}

interface BufferPtrArgs<
    TArrayBuffer extends ArrayBufferLike = ArrayBufferLike,
> {
    buffer: BufferOrView<TArrayBuffer>;
    bufferByteOffset?: number;
    bufferByteLength?: number;
    offset: number;
    defaultEndianness: 'be' | 'le';
}

function getArgs<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(
    bufferOrParams:
        | ArrayBufferView<TArrayBuffer>
        | BufferPtrParams<TArrayBuffer>
        | TArrayBuffer,
    offset: number,
    defaultEndianness: 'be' | 'le',
    restOfOptions: Omit<BufferPtrOptions, 'defaultEndianness'>,
): BufferPtrArgs<TArrayBuffer> {
    if (
        !ArrayBuffer.isView(bufferOrParams) &&
        !(bufferOrParams instanceof ArrayBuffer) &&
        !(bufferOrParams instanceof SharedArrayBuffer) &&
        'buffer' in bufferOrParams
    ) {
        const { buffer, ...params }: BufferPtrParams<TArrayBuffer> =
            bufferOrParams;
        return {
            offset: 0,
            defaultEndianness: 'le',
            buffer,
            ...params,
        };
    } else {
        return {
            ...restOfOptions,
            buffer: bufferOrParams,
            offset,
            defaultEndianness,
        };
    }
}

type TypedArray = Uint8Array | Uint16Array | Uint32Array;

function isTypedArray<T extends {}>(obj: T): obj is T & TypedArray {
    Uint8Array;
    return (
        'buffer' in obj &&
        'byteOffset' in obj &&
        obj.buffer instanceof ArrayBuffer
    );
}
