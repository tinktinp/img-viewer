/** biome-ignore-all lint/complexity/noUselessLoneBlockStatements: <explanation> */
import { BufferPtr } from './decompress';
import { HuffmanDecode } from './mktPcHuffman';
import type { MktPcImage } from './mktPcImageFile';
import { POVBQDecode } from './mktPcPovBq';
import { TilesDecode } from './mktPcTiles';

export function uncompressImage(
    image: Omit<MktPcImage, 'data'>,
    buffer: Uint8Array,
    tables: number[],
) {
    const compressionType: CompressionType = getCompressionType(image);

    if (compressionType === 'Raw') {
        return TilesDecode(buffer, image);
    }

    const input = new Uint8Array(
        buffer.buffer,
        buffer.byteOffset + 4 + image.dataOffset,
    );

    switch (compressionType) {
        case 'RLE':
            return RLEDecode(tables, input, image.width * image.height);
        case 'POVBQ':
        case 'BQ':
            return POVBQDecode(
                new Uint8Array(buffer.buffer, buffer.byteOffset + 4),
                input,
                image.width,
                image.height,
            );
        case 'Huffman':
            return HuffmanDecode(
                new Uint8Array(buffer.buffer, buffer.byteOffset + 4),
                input,
                image.width,
                image.height,
            );
        default:
            throw new Error(`Unsupported type: ${compressionType}`);
    }
}

export type CompressionType = 'Huffman' | 'POVBQ' | 'BQ' | 'RLE' | 'Raw';
export function getCompressionType({
    fileId,
    type,
}: {
    fileId: number;
    type: number;
}): CompressionType {
    // console.log(
    //     'fileId is 0x%s, type is 0x%s',
    //     fileId.toString(16),
    //     type.toString(16),
    // );
    if (fileId === 0x1f || fileId === 0 || type === 0x81 || type === -0x7f)
        return 'Raw';
    if ((type & 0x20) === 0) {
        if ((type & 0x40) === 0) {
            return 'Huffman';
        } else {
            if (fileId !== 0x1e) {
                return 'POVBQ';
            } else {
                // Pack8To4
                return 'BQ';
            }
        }
    } else {
        return 'RLE';
    }
}

interface RLEState {
    bitNum: number;
    currByte: number;
    currInput: number;
    nextInput: number;
    readonly inPtr: BufferPtr<Uint8Array>;
    readonly nBitsPerPixel: number;
    readonly nRLEBits: number;
}

class BitBuffer {
    buffer: Uint8Array;
    bitOffset: number;
    byteOffset: number;

    constructor(buffer: Uint8Array) {
        this.buffer = buffer;
        this.bitOffset = 0;
        this.byteOffset = 0;
    }

    getBits(count: number) {
        let rv = 0;
        while (count > 0 && this.byteOffset < this.buffer.byteLength) {
            const bits = Math.min(count, 8 - this.bitOffset);
            rv = (rv << bits) | (this.buffer[this.byteOffset] >>> (8 - bits));
            this.bitOffset += bits;
            count -= bits;
            if (this.bitOffset === 8) {
                this.bitOffset = 0;
                this.byteOffset++;
            }
        }
        return rv;
    }
}

function rleHelper(s: RLEState, nBits: number) {
    let bitsToPullCount = nBits;

    if (s.bitNum < nBits) {
        // Reloading!

        s.currByte = s.currInput >>> (32 - nBits);

        s.currInput = s.nextInput;
        s.nextInput = s.inPtr.getAndInc32Le();
        bitsToPullCount -= s.bitNum;
        s.bitNum = 32;
    }

    s.currByte |= s.currInput >>> (32 - bitsToPullCount);
    s.bitNum -= bitsToPullCount;
    s.currInput <<= bitsToPullCount;
    if (s.currByte > 0xff || s.currByte < 0) {
        console.error('s.currByte over/under!', s.currByte);
    }
}

export function RLEDecode(
    tables: number[],
    input: Uint8Array,
    size: number,
): Uint8Array {
    // console.log(
    //     'processing image with size: %d, tables: %o, and first 4 bytes: %s%s%s%s',
    //     size,
    //     tables,
    //     input[0].toString(16).padStart(2, '0'),
    //     input[1].toString(16).padStart(2, '0'),
    //     input[2].toString(16).padStart(2, '0'),
    //     input[3].toString(16).padStart(2, '0'),
    // );
    const s: RLEState = {
        inPtr: new BufferPtr(input),
        currInput: 0,
        nextInput: 0,
        bitNum: 32,
        currByte: 0,
        nBitsPerPixel: tables[0],
        nRLEBits: tables[1],
    };

    const outBuffer = new Uint8Array(new ArrayBuffer(size));
    const outPtr = new BufferPtr(outBuffer);

    s.currInput = s.inPtr.getAndInc32Le();
    s.nextInput = s.inPtr.getAndInc32Le();

    const nRLEBits = tables[1];
    //console.log('nRLEBits: %d, nBitsPerPixel: %d', nRLEBits, s.nBitsPerPixel);

    let nMaxZeros = 1 << (nRLEBits & 0xff);
    nMaxZeros -= 1; // Now it's (nRELBits - 1) 1's, instead of just a single 1

    //let bytesLeft = size; //imageSize.width * imageSize.height;

    while (!outPtr.atEnd()) {
        s.currByte = 0;

        rleHelper(s, s.nBitsPerPixel);
        // let local_44 = nBitsPerPixel;

        // if (bitNum < local_44) {
        //     currByte = currInput >> (32 - nBitsPerPixel);

        //     currInput = nextInput;
        //     nextInput = inPtr.getAndInc32Le();
        //     // input += 4;
        //     local_44 -= bitNum;
        //     bitNum = 32;
        // }

        // currByte |= currInput >> (32 - local_44);
        // bitNum -= local_44;
        // currInput <<= local_44;

        if (s.currByte === 0) {
            let nZeros = 0;
            {
                // let local_48 = nRLEBits;
                s.currByte = 0;
                rleHelper(s, s.nRLEBits);

                // if (bitNum < local_48) {
                //     currByte = currInput >> (32 - nRLEBits);
                //     currInput = nextInput;
                //     nextInput = inPtr.getAndInc32Le();
                //     local_48 -= bitNum;
                //     bitNum = 32;
                // }

                // currByte |= currInput >> (32 - local_48);
                // bitNum -= local_48;
                // currInput <<= local_48;
            }

            while (s.currByte === 0) {
                nZeros += nMaxZeros;
                // let local_4c = nRLEBits;
                s.currByte = 0;

                rleHelper(s, s.nRLEBits);
                // if (bitNum < local_4c) {
                //     currByte = currInput >> (32 - nRLEBits);
                //     currInput = nextInput;
                //     nextInput = inPtr.getAndInc32Le(); // *input;
                //     // input += 4;
                //     local_4c -= bitNum;
                //     bitNum = 32;
                // }

                // currByte |= currInput >> (32 - local_4c);
                // bitNum -= local_4c;
                // currInput <<= local_4c;
            }

            nZeros += s.currByte & nMaxZeros;
            // bytesLeft -= nZeros;

            outPtr.fill(0, nZeros);
            nZeros = 0;
            // {
            //     const unalignedBytes = outPtr.offset & 0x3;
            //     // checking the address of output buffer
            //     outPtr.fill(0, unalignedBytes);
            //     nZeros -= unalignedBytes;
            // }

            // for (; nZeros > 0; nZeros -= 4) {
            //     outPtr.fill(0, 4);
            // }
            //if (nZeros !== 0)
            //    throw new Error('unexpected nonzero nZeros! ' + nZeros);
            // outPtr.offset += nZeros; // this should only ever move backwards...
        } else {
            outPtr.putAndInc(s.currByte /*& nMaxZeros*/);
        }
    }

    return outBuffer;
}
