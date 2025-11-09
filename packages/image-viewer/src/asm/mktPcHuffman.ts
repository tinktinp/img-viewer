import { BitBuffer } from './BitBuffer';
import { BufferPtr } from './BufferPtr';

export function HuffmanDecode(
    tablesBuffer: Uint8Array,
    inputBuffer: Uint8Array,
    width: number,
    height: number,
) {
    /** little endian */
    const le = true;
    const outBuffer = new Uint8Array(new ArrayBuffer(width * height));
    const outPtr = new BufferPtr(outBuffer);

    // initialization
    let tables = new BufferPtr(tablesBuffer);
    const tablesDataOffset = tables.getAndInc32Le();
    // -6 looks promising actually
    tablesBuffer = new Uint8Array(
        tablesBuffer.buffer,
        tablesBuffer.byteOffset + tablesDataOffset,
    );
    tables = new BufferPtr(tablesBuffer);

    const inputPtr = new BufferPtr(inputBuffer);
    const input = new BitBuffer(inputPtr, 32);

    // let bitnum = 0x20;
    let prevByte = 0;
    let doRun = false;

    // let currInput = inputPtr.getAndInc32Le();
    // let nextInput = inputPtr.getAndInc32Le();

    /** number of words */
    const nTerminators_tablesZero = tables.getAndInc16Le();
    tables.offset = 4;
    const nColors = tables.getAndInc16Le();

    const nHalf = (nColors - (nColors >>> 0x1f)) >>> 1;

    let myedx = nTerminators_tablesZero * 2;

    tables.offset = 2;
    const matchupCount = tables.getAndInc16Le();
    myedx += matchupCount;

    tables.offset = 6;
    const bitgrabCount = tables.getAndInc16Le();
    myedx += bitgrabCount;

    let bytesLeftTmp = nTerminators_tablesZero;

    bytesLeftTmp--;
    bytesLeftTmp += myedx;
    bytesLeftTmp *= 2;

    let bytesLeft = bytesLeftTmp;

    // was + 8
    const terminatorBuf = new Uint8Array(
        tablesBuffer.buffer,
        tablesBuffer.byteOffset + 8,
        bytesLeft,
    );
    const terminator = new DataView(
        terminatorBuf.buffer,
        terminatorBuf.byteOffset,
    );

    const offset = new DataView(
        terminatorBuf.buffer,
        terminatorBuf.byteOffset + nTerminators_tablesZero * 2,
    );

    const matchup = new DataView(
        offset.buffer,
        offset.byteOffset + nTerminators_tablesZero * 2,
    );

    const bitgrab = new DataView(
        matchup.buffer,
        matchup.byteOffset + matchupCount * 2,
    );

    const graboff = new DataView(
        bitgrab.buffer,
        bitgrab.byteOffset + bitgrabCount * 2,
    );

    bytesLeft = width * height;

    // console.log('huffman:', {
    //     tablesZero: nTerminators_tablesZero,
    //     nColors,
    //     nHalf,
    //     terminator: terminatorBuf.byteOffset,
    //     matchupCount,
    //     bytesLeft,
    //     offset,
    //     matchup,
    //     bitgrabCount,
    //     bitgrab,
    //     graboff,
    // });

    let match = 0;

    while (bytesLeft > 0) {
        let treeLevel: number = bitgrab.getUint16(0, le);

        if (
            (input.currInput >>> 31 ||
                input.currInput < 0 ||
                input.currInput > 0x7fffffff) &&
            treeLevel === 1
        ) {
            match = offset.getInt16(treeLevel * 2, le) + 3;

            input.readBits(1); // we peaked at this bit  in the `if`, now discard it
        } else {
            let currTerminator = terminator.getUint16(treeLevel * 2, le);
            let nodeNumber = 1;

            nodeNumber <<= treeLevel;

            nodeNumber |= input.readBits(treeLevel);

            let currGrabOffset = graboff.getInt16(treeLevel * 2, le);

            match = offset.getInt16(treeLevel * 2, le);

            while (nodeNumber < currTerminator) {
                currGrabOffset += nodeNumber;
                const shiftAmount = bitgrab.getUint16(
                    (Math.abs(currGrabOffset) % bitgrabCount) * 2,
                    le,
                );
                treeLevel += shiftAmount;

                nodeNumber <<= shiftAmount;

                nodeNumber |= input.readBits(shiftAmount);

                currTerminator = terminator.getUint16(treeLevel * 2, le); // ptr[treeLevel * 2 + terminator]; // 8-bit

                match = offset.getInt16(treeLevel * 2, le); //ptr[treeLevel * 2 + offset];

                currGrabOffset = graboff.getInt16(treeLevel * 2, le); // ptr[treeLevel * 2 + graboff];
            }

            match += nodeNumber;
        }

        // hack: mod by matchupCount
        let currByte = matchup.getUint8((match % matchupCount) * 2); // ptr[match * 2 + matchup];

        currByte -= nHalf;
        currByte = prevByte - currByte;
        if (currByte < 0) {
            currByte += nColors;
        } else if (nColors <= currByte) {
            currByte -= nColors;
        }

        if (doRun !== false) {
            doRun = false;
            prevByte = currByte;
            bytesLeft -= currByte;

            outPtr.fill(0, currByte);
            currByte = 0;
        } else if (currByte === 0) {
            prevByte = currByte;
            doRun = true;
        } else {
            doRun = false;
            prevByte = currByte;

            outPtr.putAndInc(currByte);

            bytesLeft--;
        }
    }
    return outBuffer;
}
