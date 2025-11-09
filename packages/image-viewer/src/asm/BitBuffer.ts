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
