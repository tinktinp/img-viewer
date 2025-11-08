import type { Indexable } from './decompress';

/**
 * a buffer and an "offset".
 *
 * In C, folks often use a pointer and increment the pointer as you go instead of using a subscript and indexing it.
 * You might see something like `*ptr++ = 5;` for writing or `value = *ptr++;` for reading.
 *
 * This class is designed to implement a similar pattern by bundling together a buffer and an offset into it,
 * and proving read and write methods that increment.
 */

export class BufferPtr<
    T extends Indexable & {
        length: number;
        fill: (value: number, start?: number, end?: number) => T;
    },
> {
    buffer: T;
    offset: number;

    constructor(buffer: T, offset: number = 0) {
        this.buffer = buffer;
        this.offset = offset;
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
    putAndInc16(data: number) {
        this.buffer[this.offset++] = data & 0xff;
        this.buffer[this.offset++] = (data >>> 8) & 0xff;
    }
    fill(data: number, count: number) {
        for (let i = 0; i < count; i++) {
            this.putAndInc(data);
        }
    }
    atEnd() {
        if (this.offset < 0) return true;
        return this.offset >= this.buffer.length;
    }

    get16Le() {
        return this.buffer[this.offset] | (this.buffer[this.offset + 1] << 8);
    }
    get32Le() {
        return (
            this.buffer[this.offset] |
            (this.buffer[this.offset + 1] << 8) |
            (this.buffer[this.offset + 2] << 16) |
            (this.buffer[this.offset + 3] << 24)
        );
    }
    getAndInc16Le() {
        const rv = this.get16Le();
        this.offset += 2;
        return rv;
    }
    getAndInc32Le() {
        const rv = this.get32Le();
        this.offset += 4;
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
    getAndIncS16Le() {
        const rv = this.getAndInc16Le();
        return BufferPtr.toSigned(rv, 15);
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
