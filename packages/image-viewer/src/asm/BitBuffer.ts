import type { BufferPtr } from './BufferPtr';
import {
    type ReadMethod,
    type UnitSize,
    unitSizeToMethod,
    unitSizeToMask,
} from './mktPcPovBq';

export class BitBuffer {
    input: BufferPtr<Uint8Array>;
    currInput: number;
    nextInput: number;
    bitNum: number = 0x20;
    readonly unitSize: number;
    readonly readMethod: ReadMethod;
    readonly unitMask: number;

    constructor(input: BufferPtr<Uint8Array>, unitSize: UnitSize) {
        this.unitSize = unitSize;
        this.readMethod = unitSizeToMethod[unitSize];
        this.unitMask = unitSizeToMask[unitSize];

        this.input = input;
        this.bitNum = this.unitSize;
        this.currInput = input[this.readMethod]();
        this.nextInput = input[this.readMethod]();
    }

    readBits(nBits: number) {
        let bitsToPullCount = nBits;

        const mask = (1 << nBits) - 1;
        let currCode = 0;

        if (this.bitNum < nBits) {
            // Reloading!
            currCode = this.currInput >>> (this.unitSize - nBits);

            this.currInput = this.nextInput;
            this.nextInput = this.input[this.readMethod]();
            bitsToPullCount -= this.bitNum;
            this.bitNum = this.unitSize;
        }

        currCode |=
            (this.currInput >>> (this.unitSize - bitsToPullCount)) &
            this.unitMask;
        this.bitNum -= bitsToPullCount;
        this.currInput <<= bitsToPullCount;
        this.currInput &= this.unitMask;
        return currCode & mask;
    }
}

/**
 * This one works for the arcade roms.
 * Was going to call it the "LE" variant but I
 * don't think that's correct. Regardless of what
 * it is called, it unpacks the bits off the other end,
 * compared to the other version used for MKT N64 and PC.
 */
export class BitBufferRom {
    input: BufferPtr<Uint8Array>;
    currInput: number;
    nextInput: number;
    bitNum: number = 0x20;
    readonly unitSize: number;
    readonly readMethod: ReadMethod;
    readonly unitMask: number;

    constructor(input: BufferPtr<Uint8Array>, unitSize: UnitSize) {
        this.unitSize = unitSize;
        this.readMethod = unitSizeToMethod[unitSize];
        this.unitMask = unitSizeToMask[unitSize];

        this.input = input;
        this.bitNum = this.unitSize;
        this.currInput = input[this.readMethod]();
        this.nextInput = input[this.readMethod]();
    }

    readBits(nBits: number) {
        let bitsToPullCount = nBits;

        const mask = (1 << nBits) - 1;
        let currCode = 0;

        if (this.bitNum < nBits) {
            // Reloading!
            currCode = this.currInput;

            this.currInput = this.nextInput;
            this.nextInput = this.input[this.readMethod]();
            bitsToPullCount -= this.bitNum;
            this.bitNum = this.unitSize;
        }

        const mask2 = (1 << bitsToPullCount) - 1;

        currCode |= (this.currInput & mask2) << (nBits - bitsToPullCount);
        this.bitNum -= bitsToPullCount;
        this.currInput >>>= bitsToPullCount;
        this.currInput &= this.unitMask;
        // console.log(
        //     'currCode: %s    currInput: %s ',
        //     currCode.toString(2).padStart(8, '0'),
        //     this.currInput.toString(2).padStart(8, '0'),
        // );
        return currCode & mask;
    }
}
