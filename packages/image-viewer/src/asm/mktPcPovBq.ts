import { BitBuffer } from './BitBuffer';
import { BufferPtr } from './decompress';

// this doesn't make typescript treat these any different, but it serves as a reminder for the reader
type uint = number;
type ushort = number;

interface BQHeader {
    sYSize: ushort;
    sGroups: ushort;
}

interface BQGroupHeader {
    lVectorOffset: uint;
    sBPP: ushort;
    asCodeBits: [ushort, ushort, ushort, ushort, ushort, ushort, ushort];
    asCodeOffset: [ushort, ushort, ushort, ushort, ushort, ushort, ushort];
    asZeroBits: [ushort, ushort];
    sFiller: ushort;
}

function getBqHeader(tables: BufferPtr<Uint8Array<ArrayBufferLike>>) {
    const bqHeader: BQHeader = {
        sYSize: tables.getAndInc16Le(),
        sGroups: tables.getAndInc16Le(),
    };
    return bqHeader;
}

type TupleOf<T, N extends number, R extends T[] = []> = R['length'] extends N
    ? R
    : TupleOf<T, N, [...R, T]>;

function times<T, N extends number>(n: N, f: () => T): TupleOf<T, N> {
    const rv: T[] = [];
    while (n-- > 0) {
        rv.push(f());
    }
    return rv as TupleOf<T, N>;
}

function getBQGroupHeaderAt(
    tablesBuffer: Uint8Array<ArrayBufferLike>,
    offset: number,
): BQGroupHeader {
    const ptr = new BufferPtr(tablesBuffer, offset);
    const bqGroupHeader: BQGroupHeader = {
        lVectorOffset: ptr.getAndInc32Le(),
        sBPP: ptr.getAndInc16Le(),
        asCodeBits: times(7, () => ptr.getAndInc16Le()),
        asCodeOffset: times(7, () => ptr.getAndInc16Le()),
        asZeroBits: times(2, () => ptr.getAndInc16Le()),
        sFiller: ptr.getAndInc16Le(),
    };
    return bqGroupHeader;
}

export const unitSizeToMethod = {
    8: 'getAndInc',
    16: 'getAndInc16Le',
    32: 'getAndInc32Le',
} as const;
export type UnitSize = keyof typeof unitSizeToMethod;
export type ReadMethod = (typeof unitSizeToMethod)[UnitSize];

export const unitSizeToMask = {
    8: 0xff,
    16: 0xffff,
    32: 0xffff_ffff,
} as const;

const testZeros = false;
const testCols = false;

// const sizeOfBqHeader = 4;
const sizeOfBqHeaderGroup = 0x28;

export function POVBQDecode(
    tablesBuffer: Uint8Array,
    inputBuffer: Uint8Array,
    width: number,
    height: number,
) {
    const outBuffer = new Uint8Array(new ArrayBuffer(width * height));
    const outPtr = new BufferPtr(outBuffer);

    // initialization
    const tables = new BufferPtr(tablesBuffer);
    const tablesDataOffset = tables.getAndInc32Le();
    tables.offset = tablesDataOffset;

    const inputPtr = new BufferPtr(inputBuffer);
    const input = new BitBuffer(inputPtr, 32);

    const bqHeader: BQHeader = getBqHeader(tables);

    let currCode = input.readBits(6);
    const nGroup = currCode;

    const bqGroupHeader: BQGroupHeader = getBQGroupHeaderAt(
        tablesBuffer,
        tables.offset + nGroup * sizeOfBqHeaderGroup,
    );

    const nYSize = bqHeader.sYSize;

    const nBPP = bqGroupHeader.sBPP;
    const sCodeBits = bqGroupHeader.asCodeBits;
    const sCodeOffset = bqGroupHeader.asCodeOffset;
    const sZeroBits = bqGroupHeader.asZeroBits;

    const sizeOfAllBqHeaderGroups = bqHeader.sGroups * sizeOfBqHeaderGroup;
    const vectorSectionOffset =
        tablesDataOffset + /* sizeOfBqHeader +*/ sizeOfAllBqHeaderGroups;
    const vectorsOffset = vectorSectionOffset + bqGroupHeader.lVectorOffset;

    let blocksLeft = (width / 4) * (height / nYSize); // TODO: not sure if I rounded the height part correctly / at all

    const nCols = width / 4;

    const rowSize = width;

    let medx = nYSize;
    medx <<= 2;
    medx *= nBPP;
    let meax = medx;
    medx >>>= 0x1f;
    medx <<= 3;
    meax -= medx;
    meax >>>= 3;
    const nVectorSize = meax;

    let currCol = 0;

    // console.log(
    //     'width=%s, currCode=%s, nGroup=%s,  nCols=%s, vectorsOffset=0x%s, blocksLeft=%s, nVectorSize=%s, bqHeader=%o, bqGroupHeader=%o',
    //     width,
    //     currCode,
    //     nGroup,
    //     nCols,
    //     vectorsOffset.toString(16),
    //     blocksLeft,
    //     nVectorSize,
    //     bqHeader,
    //     bqGroupHeader,
    // );
    // console.log(
    //     'vectorBufferPtr first byte = 0x%s',
    //     tablesBuffer[vectorsOffset],
    // );

    label_0: while (blocksLeft > 0) {
        currCode = input.readBits(3);
        // console.log('outer loop: currCode=0x%s', currCode.toString(16));

        // this is the zeros case
        if (currCode === 7) {
            currCode = input.readBits(1);

            const nIndex = currCode;
            const nBits_t3 = sZeroBits[nIndex];
            currCode = input.readBits(nBits_t3);
            //console.log('0 blocks: %s, nIndex: %s', currCode, nIndex);

            while (currCode-- >= 0) {
                blocksLeft--;

                testCols && console.log('currCol[184]: ', currCol);

                outPtr.fill(testZeros ? currCol + 1 : 0, 4);
                outPtr.offset -= 4;
                outPtr.offset += rowSize;

                outPtr.fill(testZeros ? currCol + 1 : 0, 4);
                outPtr.offset -= rowSize;

                currCol++;
                if (currCol === nCols) {
                    outPtr.offset += rowSize;
                    currCol = 0;
                }
            }

            continue label_0;
            // we could put the rest in an `else` block instead of this `continue;`
        }

        // this is the non-zero case

        const nIndex = currCode;

        //currCode * 2 + sCodeBits(basePtr)
        //console.log('reading %s more bits', sCodeBits[nIndex]);
        const nBits_t4 = sCodeBits[nIndex];
        currCode = 0;
        currCode = input.readBits(nBits_t4);
        currCode += sCodeOffset[nIndex];

        const fullOffsetForVector =
            tablesBuffer.byteOffset + vectorsOffset + currCode * nVectorSize;
        const vectorBufferPtr = new BufferPtr(
            tablesBuffer,
            fullOffsetForVector,
        );

        // const firstByte = vectorBufferPtr.get();
        // console.log(
        //     'nBits_t4 = 0x%s, nIndex: %s, vectorOffset 0x%s, currCode: 0x%s, nVectorSize: 0x%s, fullOffsetForVector: 0x%s, firstByte: %o',
        //     nBits_t4.toString(16),
        //     nIndex,
        //     vectorsOffset.toString(16),
        //     currCode.toString(16),
        //     nVectorSize.toString(16),
        //     fullOffsetForVector.toString(16),
        //     firstByte,
        // );

        const vectorPtr = new BitBuffer(vectorBufferPtr, 8);
        // console.log('currCol[233]: ', currCol);

        currCode = vectorPtr.readBits(nBPP);
        // console.log('currCode=0b%s', currCode.toString(2).padStart(8, '0'))
        outPtr.putAndInc(testCols ? currCol + 1 : currCode);
        currCode = vectorPtr.readBits(nBPP);
        outPtr.putAndInc(testCols ? currCol + 1 : currCode);
        currCode = vectorPtr.readBits(nBPP);
        outPtr.putAndInc(testCols ? currCol + 1 : currCode);
        currCode = vectorPtr.readBits(nBPP);
        outPtr.putAndInc(testCols ? currCol + 1 : currCode);
        outPtr.offset -= 4;
        outPtr.offset += rowSize;

        currCode = vectorPtr.readBits(nBPP);
        outPtr.putAndInc(testCols ? currCol + 1 : currCode);
        currCode = vectorPtr.readBits(nBPP);
        outPtr.putAndInc(testCols ? currCol + 1 : currCode);
        currCode = vectorPtr.readBits(nBPP);
        outPtr.putAndInc(testCols ? currCol + 1 : currCode);
        currCode = vectorPtr.readBits(nBPP);
        outPtr.putAndInc(testCols ? currCol + 1 : currCode);

        outPtr.offset -= rowSize;

        currCol++;
        if (currCol === nCols) {
            outPtr.offset += rowSize;
            currCol = 0;
        }
        blocksLeft--;
    } // end of while

    return outBuffer;
}
