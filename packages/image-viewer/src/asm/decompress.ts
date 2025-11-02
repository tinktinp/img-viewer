import type { ImageMetaData } from './filterFiles';

/**
 * Low level functions to decompression images.
 *
 * For the most part, I've preferred to use `0b` prefixed
 * base two literals instead of hex, for literals involved
 * in bitwise operations.
 *
 * As long as the `_` digit separator is used, the binary
 * is more clear. E.g. `0b11_1111` is obviously all ones,
 * but `0x3F` is less obvious, at least if you don't do
 * this sort of thing on a daily basis.
 *
 */
const typeToFunction = {
    0: alreadyDecompressed,
    7: decompress64,
    8: decompress32WithDictType8,
    // 9 and 18 use inflate
    13: decompressMethod13,
    14: decompress32WithDictType14And19,
    15: decompress8,
    16: decompress16,
    19: decompress32WithDictType14And19,
    20: decompressMethod20,
    22: decompress32WithDict,
    23: decompress32WithDict,
    24: decompress32WithDict,
    25: decompressMethod25,
} as const;

const typeNeedsDict = {
    7: true,
    22: true,
    23: true,
    24: true,
};

type TypeToFunction = typeof typeToFunction;

function isKnownType(type: number): type is keyof TypeToFunction {
    return type in typeToFunction;
}

function getImageType(buffer: Uint8Array) {
    return buffer[0] & 0b11_1111; // type is only 6 bits
}

export function decompress_image(
    buffer: Uint8Array,
    dictionary: Uint8Array | undefined,
    meta: ImageMetaData,
): Uint8Array {
    if (buffer.byteLength < 1) {
        throw new Error(`decompress_image: ${meta.name}: buffer is empty!`);
    }

    const type = getImageType(buffer);
    if (isKnownType(type)) {
        const fn = typeToFunction[type];
        if (!dictionary && type in typeNeedsDict) {
            console.warn(
                'no dictionary for %s type %s which needs it!',
                meta.name,
                type,
            );
        }
        return fn(buffer, dictionary || new Uint8Array(), meta);
    }

    throw new Error(`image '${meta.name}' is of unknown type '${type}'`);
}

interface Indexable {
    [index: number]: number;
}

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
        this.buffer[this.offset++] = data & 0xFF;
        this.buffer[this.offset++] = (data >>> 8) & 0xFF;
    }
    fill(data: number, count: number) {
        for (let i = 0; i < count; i++) {
            this.putAndInc(data);
        }
    }
    atEnd() {
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
}

function alreadyDecompressed(
    buffer: Uint8Array,
    _dictionary: Uint8Array,
    _meta: ImageMetaData,
) {
    return buffer.slice(0);
}

/**
 * RLE (Run Length Encoding) decompression with or without a dictionary.
 *
 */
function decompress32WithDict(
    buffer: Uint8Array,
    dictionary: Uint8Array,
    _meta: ImageMetaData,
): Uint8Array {
    const view = new DataView(buffer.buffer, buffer.byteOffset);
    const size = view.getUint32(0, false) & 0x00ffffff; // size is 24 bits
    const outBuffer = new Uint8Array(new ArrayBuffer(size));
    const outPtr = new BufferPtr(outBuffer);

    const type = getImageType(buffer);

    // console.log('decompress32WithDict', { size, type });

    let topFourMini: Uint8Array | undefined;
    const flipData = new BufferPtr(buffer);
    let miniPix: number | undefined;

    // type specific initialization
    if (type === 24) {
        topFourMini = new Uint8Array(buffer.buffer, buffer.byteOffset + 4);
        flipData.offset = 8;
    } else if (type === 23) {
        topFourMini = undefined;
        miniPix = view.getUint8(4);
        flipData.offset = 5;
    } else {
        topFourMini = undefined;
        miniPix = 0;
        flipData.offset = 4;
    }

    // type agnostic setup and initialization

    let flipLen = flipData.getAndInc();
    if (u8HighBitSet(flipLen)) {
        flipLen = (u8ClearHighBit(flipLen) << 8) | flipData.getAndInc();
    }
    const inPtr = new BufferPtr(buffer, flipData.offset + flipLen);
    let bitCount = 8;
    let flip = flipData.getAndInc();

    function isDictNeeded(byte: number) {
        return u8HighBitSet(byte);
    }

    // main loop
    while (outPtr.offset < outBuffer.byteLength) {
        let byte = inPtr.getAndInc();

        if (isDictNeeded(byte)) {
            // console.log('decompress32WithDict: dict needed');
            const dictPtr = new BufferPtr(dictionary);
            if (u8HighBitSet(flip)) {
                dictPtr.offset = (u8ClearHighBit(byte) << 1) + 1;

                outPtr.putAndInc(dictPtr.getAndDec());
                outPtr.putAndInc(dictPtr.get());
            } else {
                dictPtr.offset = u8ClearHighBit(byte) << 1;
                outPtr.putAndInc(dictPtr.getAndInc());
                outPtr.putAndInc(dictPtr.get());
            }
            if (--bitCount === 0) {
                flip = flipData.getAndInc();
                bitCount = 8;
            } else {
                flip <<= 1;
            }
        } else {
            // the bits are laid out like this:
            // |---|----|-------|
            // | 7 | 65 | 43210 |
            // |---|----|-------|
            // | d | sw | byte  |
            // |---|----|-------|

            let sw: number;
            sw = byte >>> 5; // `sw` is packed into bits 6 and 5 of `byte`, controls the 4 modes
            byte &= 0b1_1111; // byte is only 5 bits (bits 0 through 4), values 0-31, mask out `sw`'s bits

            switch (sw) {
                case 3:
                    for (let cnt = inPtr.getAndInc(); cnt > 0; cnt--) {
                        outPtr.putAndInc(byte);
                    }
                    break;
                case 2:
                    if (topFourMini === undefined && miniPix !== undefined) {
                        for (let cnt = byte + 3; cnt > 0; cnt--) {
                            outPtr.putAndInc(miniPix);
                        }
                    } else if (topFourMini !== undefined) {
                        let cnt = (byte & 0x07) + 3; //
                        byte = topFourMini[(byte >>> 3) & 0x03];
                        for (; cnt > 0; cnt--) {
                            outPtr.putAndInc(byte);
                        }
                    }

                    break;
                case 1:
                    outPtr.putAndInc(byte);
                    outPtr.putAndInc(byte);
                    break;
                case 0:
                    outPtr.putAndInc(byte);
                    break;
                default:
                    throw new Error('unreachable switch branch reached!');
            }
        }
    }

    return outBuffer;
}

function u8ClearHighBit(byte: number) {
    return byte & 0b111_1111; // 7 1's
}

function u8HighBitSet(byte: number) {
    return byte & 0b1000_0000; // 1 followed by 7 zeros
}

/**
 * RLE decompression for type 15, which uses 8 color Run Length Encoding
 */
function decompress8(
    buffer: Uint8Array,
    _dict: unknown,
    _meta: ImageMetaData,
): Uint8Array {
    const view = new DataView(buffer.buffer, buffer.byteOffset);
    const size = view.getUint32(0, false) & 0x00ff_ffff; // size is 24 bits
    const outBuffer = new Uint8Array(new ArrayBuffer(size));
    const outPtr = new BufferPtr(outBuffer);

    const inPtr = new BufferPtr(buffer, 4);

    while (outPtr.offset < outBuffer.byteLength) {
        const byte = inPtr.getAndInc();

        if (u8HighBitSet(byte)) {
            outPtr.fill(0, u8ClearHighBit(byte) + 1);
        } else if (byte & 0b100_0000) {
            outPtr.putAndInc((byte >>> 3) & 0b0111);
            if (outPtr.offset < outBuffer.byteLength) {
                outPtr.putAndInc(byte & 0b0111);
            }
        } else {
            let pixel = byte & 0b0111;
            if (pixel === 0) {
                pixel = (byte >>> 3) & 0b0111;
                outPtr.fill(pixel, inPtr.getAndInc());
            } else {
                const count = ((byte >>> 3) & 0b0111) + 3; // fixed paren
                outPtr.fill(pixel, count);
            }
        }
    }
    return outBuffer;
}

/**
 * RLE decompression for type 7, which uses 64 color Run Length Encoding
 */
function decompress64(
    buffer: Uint8Array,
    dictionary: Uint8Array,
    meta: ImageMetaData,
): Uint8Array {
    const view = new DataView(buffer.buffer, buffer.byteOffset);
    const size = (view.getUint32(0, false) & 0x00ffffff) - 4; // size is 24 bits
    const wxhSize = meta.width * meta.height; // it seems like the encoded size is wrong?
    const outBuffer = new Uint8Array(new ArrayBuffer(Math.max(size, wxhSize)));
    const outPtr = new BufferPtr(outBuffer);
    const inPtr = new BufferPtr(buffer, 4);

    while (!inPtr.atEnd()) {
        let byte = inPtr.getAndInc();
        const sw = byte >>> 6;
        byte &= 0b11_1111;
        switch (sw) {
            case 1:
                outPtr.fill(byte, 2);
                break;
            case 0:
                outPtr.putAndInc(byte);
                break;
            case 2:
                {
                    const dictPtr = new BufferPtr(
                        dictionary,
                        (byte & 0b11_1111) << 1,
                    );
                    outPtr.putAndInc(dictPtr.getAndInc());
                    outPtr.putAndInc(dictPtr.get());
                }
                break;
            case 3:
                outPtr.fill(byte, inPtr.getAndInc());
                break;
        }
    }

    return outBuffer;
}

/**
 * RLE decompression for type 16, which uses 8 color Run Length Encoding
 */
function decompress16(
    buffer: Uint8Array,
    _dict: unknown,
    _meta: ImageMetaData,
): Uint8Array {
    const view = new DataView(buffer.buffer, buffer.byteOffset);
    const size = view.getUint32(0, false) & 0x00ff_ffff; // size is 24 bits
    const outBuffer = new Uint8Array(new ArrayBuffer(size));
    const outPtr = new BufferPtr(outBuffer);

    const inPtr = new BufferPtr(buffer, 4);

    while (outPtr.offset < outBuffer.byteLength) {
        const byte = inPtr.getAndInc();
        if (u8HighBitSet(byte)) {
            outPtr.fill(0, u8ClearHighBit(byte) + 7);
        } else {
            const sw = byte >>> 4;
            const pixel = byte & 0b0000_1111;

            if (sw === 0) {
                const count = inPtr.getAndInc();
                outPtr.fill(pixel, count);
            } else if (sw === 7) {
                for (let count = pixel + 3; count > 0; ) {
                    const pixel2 = inPtr.getAndInc();
                    outPtr.putAndInc(pixel2 >>> 4);
                    count--;
                    if (!count) break;
                    outPtr.putAndInc(pixel2 & 0b1111);
                    count--;
                }
            } else {
                outPtr.fill(pixel, sw);
            }
        }
    }
    return outBuffer;
}

/**
 * Run Length Encoding decompression for type 8 with dict
 */
function decompress32WithDictType8(
    buffer: Uint8Array,
    dict: Uint8Array,
    meta: ImageMetaData,
): Uint8Array {
    const view = new DataView(buffer.buffer, buffer.byteOffset);
    const size = (view.getUint32(0, false) & 0x00ffffff) - 4; // size is 24 bits
    const wxhSize = meta.width * meta.height; // it seems like the encoded size is wrong?
    const outBuffer = new Uint8Array(new ArrayBuffer(Math.max(size, wxhSize)));
    const outPtr = new BufferPtr(outBuffer);
    const inPtr = new BufferPtr(buffer, 4);

    while (!inPtr.atEnd()) {
        const byte = inPtr.getAndInc();
        if (u8HighBitSet(byte)) {
            const dictPtr = new BufferPtr(dict, u8ClearHighBit(byte) << 1);
            outPtr.putAndInc(dictPtr.getAndInc());
            outPtr.putAndInc(dictPtr.getAndInc());
        } else {
            const sw = byte >>> 5;
            const pixel = byte & 0b0001_1111;

            if (sw === 3) {
                const count = inPtr.getAndInc();
                outPtr.fill(pixel, count);
            } else if (sw === 2) {
                const count = pixel + 3; // `pixel` is not actually a pixel for type 2
                outPtr.fill(0, count);
            } else {
                outPtr.fill(pixel, sw + 1);
            }
        }
    }
    return outBuffer;
}

/**
 * Run Length Encoding decompression for type 14 and 19 (and 22?) with dict
 */
function decompress32WithDictType14And19(
    buffer: Uint8Array,
    dict: Uint8Array,
    meta: ImageMetaData,
): Uint8Array {
    const view = new DataView(buffer.buffer, buffer.byteOffset);
    const size = view.getUint32(0, false) & 0x00ffffff; // size is 24 bits
    const wxhSize = meta.width * meta.height; // it seems like the encoded size is wrong?
    const outBuffer = new Uint8Array(new ArrayBuffer(Math.max(size, wxhSize)));
    const outPtr = new BufferPtr(outBuffer);
    const inPtr = new BufferPtr(buffer, 4);

    let topFourMini: Uint8Array | undefined;
    //const flipData = new BufferPtr(buffer);
    let miniPix: number | undefined;

    const type = view.getUint8(0);

    // type specific initialization
    if (type === 22) {
        topFourMini = new Uint8Array(buffer.buffer, buffer.byteOffset + 4);
        inPtr.offset = 8;
    } else if (type === 19) {
        topFourMini = undefined;
        miniPix = view.getUint8(4);
        inPtr.offset = 5;
    } /* type 14 */ else {
        topFourMini = undefined;
        miniPix = 0;
        inPtr.offset = 4;
    }

    while (!inPtr.atEnd()) {
        let byte = inPtr.getAndInc();

        if (u8HighBitSet(byte)) {
            const dictPtr = new BufferPtr(dict, u8ClearHighBit(byte) << 1);
            outPtr.putAndInc(dictPtr.getAndInc());
            outPtr.putAndInc(dictPtr.get());
        } else {
            const sw = byte >>> 5;
            byte &= 0b1_1111;
            if (sw === 3) {
                outPtr.fill(byte, inPtr.getAndInc());
            } else if (sw === 2) {
                if (topFourMini === undefined && miniPix !== undefined) {
                    outPtr.fill(miniPix, byte + 3);
                } else if (topFourMini !== undefined) {
                    const count = (byte & 0b0111) + 3;
                    byte = topFourMini[(byte >>> 3) & 0b11];
                    outPtr.fill(byte, count);
                }
            } else {
                outPtr.fill(byte, sw + 1);
            }
        }
    }
    return outBuffer;
}

/**
 * RLE decompression for type 20. Why are there so many?!
 */
function decompressMethod20(
    buffer: Uint8Array,
    _dict: unknown,
    meta: ImageMetaData,
): Uint8Array {
    const view = new DataView(buffer.buffer, buffer.byteOffset);
    const size = view.getUint32(0, false) & 0x00ff_ffff; // size is 24 bits
    const wxhSize = meta.width * meta.height; // it seems like the encoded size the input and not the output
    const outBuffer = new Uint8Array(new ArrayBuffer(Math.max(size, wxhSize)));
    const outPtr = new BufferPtr(outBuffer);
    const inPtr = new BufferPtr(buffer, 4);

    while (inPtr.offset < buffer.byteLength) {
        let count = view.getInt8(inPtr.offset);
        inPtr.getAndInc(); // for side effect

        if (count < 0) {
            const pixel = inPtr.getAndInc();
            for (; count <= 0; count++) {
                outPtr.putAndInc(pixel);
            }
        } else {
            for (; count >= 0; count--) {
                outPtr.putAndInc(inPtr.getAndInc());
            }
        }
    }

    return outBuffer;
}

/**
 * RLE decompression for type 13. Why are there so many?!
 */
function decompressMethod13(
    buffer: Uint8Array,
    dict: Uint8Array,
    meta: ImageMetaData,
): Uint8Array {
    const view = new DataView(buffer.buffer, buffer.byteOffset);
    const size = view.getUint32(0, false) & 0x00ff_ffff; // size is 24 bits
    const wxhSize = meta.width * meta.height; // it seems like the encoded size the input and not the output
    const outBuffer = new Uint8Array(new ArrayBuffer(Math.max(size, wxhSize)));
    const outPtr = new BufferPtr(outBuffer);
    const inPtr = new BufferPtr(buffer, 4);

    while (inPtr.offset < buffer.byteLength) {
        let byte = inPtr.getAndInc();
        const sw = byte >>> 6; // high two bits
        byte = byte & 0b0011_1111; // low 6 bits
        if (sw === 3) {
            const count = inPtr.getAndInc();
            outPtr.fill(byte, count);
        } else if (sw === 2) {
            const dictPtr = new BufferPtr(dict, (byte & 0x3f) << 1);
            outPtr.putAndInc(dictPtr.getAndInc());
            outPtr.putAndInc(dictPtr.get());
        } else {
            outPtr.fill(byte, sw + 1);
        }
    }

    return outBuffer;
}

/**
 * RLE decompression for type 25.
 */
function decompressMethod25(
    buffer: Uint8Array,
    dict: Uint8Array,
    meta: ImageMetaData,
): Uint8Array {
    const view = new DataView(buffer.buffer, buffer.byteOffset);
    const size = view.getUint32(0, false) & 0x00ff_ffff; // size is 24 bits
    const wxhSize = meta.width * meta.height; // it seems like the encoded size the input and not the output
    const outBuffer = new Uint8Array(new ArrayBuffer(Math.max(size, wxhSize)));
    const outPtr = new BufferPtr(outBuffer);
    const inPtr = new BufferPtr(buffer, 4);

    let flipLen = inPtr.getAndInc();
    if (u8HighBitSet(flipLen)) {
        flipLen = (u8ClearHighBit(flipLen) << 8) | inPtr.getAndInc();
    }
    const flipData = new BufferPtr(buffer, inPtr.offset);
    inPtr.offset += +flipLen;

    let bitCount = 4;
    let flip = flipData.getAndInc();

    while (inPtr.offset < buffer.byteLength) {
        let byte = inPtr.getAndInc();
        const sw = byte >>> 6; // high two bits
        byte = byte & 0b0011_1111; // low 6 bits
        if (sw === 3) {
            const count = inPtr.getAndInc();
            outPtr.fill(byte, count);
        } else if (sw === 2) {
            const dictOffset = ((byte & 0b11_1111) | (flip & 0b0100_0000)) << 1;
            if (u8HighBitSet(flip)) {
                const dictPtr = new BufferPtr(dict, dictOffset + 1);
                outPtr.putAndInc(dictPtr.getAndDec());
                outPtr.putAndInc(dictPtr.get());
            } else {
                const dictPtr = new BufferPtr(dict, dictOffset);
                outPtr.putAndInc(dictPtr.getAndInc());
                outPtr.putAndInc(dictPtr.get());
            }
            if (--bitCount === 0) {
                flip = flipData.getAndInc();
                bitCount = 4;
            } else {
                flip <<= 2;
            }
        } else {
            outPtr.fill(byte, sw + 1);
        }
    }

    return outBuffer;
}
