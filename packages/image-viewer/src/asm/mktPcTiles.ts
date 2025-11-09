import { BufferPtr } from './BufferPtr';
import type { MktPcImage } from './mktPcImageFile';

export function TilesDecode(
    inputBuffer: Uint8Array,
    image: Omit<MktPcImage, 'data'>,
) {
    if (image.isFloor) {
        return floorDecode(inputBuffer, image);
    }
    const { width, height } = image;
    const outBuffer = new Uint8Array(new ArrayBuffer(width * height));
    const tileWidth = image.type === -64 ? 0x80 : 0x100;
    const tileHeight = 0x100;
    // const tileStartOffset = image.dataOffset % tileWidth;

    // u32 palettes_offset;
    // u32 tables_offset;
    // u16 unknown1;
    // u16 unknown2;
    // u32 endOfImageHeaders;

    const tablesPtr = new BufferPtr(inputBuffer, 12);
    let endOfImageHeaders = tablesPtr.get32Le();
    if (endOfImageHeaders > inputBuffer.byteLength) {
        const ptr = new BufferPtr(inputBuffer, 0);

        const headersOffset = ptr.get32Le() + 4;
        ptr.offset = headersOffset;
        const nextHeaders = ptr.getAndInc32Le();
        ptr.offset += nextHeaders;
        const v1 = ptr.getAndInc32Le(); // 0x00050624
        const v2 = ptr.getAndInc32Le(); // 0x0000_0004
        const v3 = ptr.getAndInc32Le(); // 0x0000_0002
        const imageHeadersLen = ptr.getAndInc32Le(); // 0x0000_0624
        endOfImageHeaders = 4 + imageHeadersLen + nextHeaders + headersOffset;
    }
    // console.log('endOfImageHeaders: 0x%o', endOfImageHeaders.toString(16));

    // const dataOffset = image.dataOffset & 0xffff;
    const tileNumber = image.dataOffset >>> 16;
    const row = (image.dataOffset >> 0) & 0xff;
    const col = (image.dataOffset >> 8) & 0xff;

    // let inOffset = 4 + endOfImageHeaders + image.dataOffset;
    // the high word is already the tile size, so pulling it out and multiplying it by the tileSize does nothing
    // but we are starting to the right instead of down
    // 0x 02 B2 01
    //    tn ?? ??

    let inOffset =
        4 +
        endOfImageHeaders +
        tileNumber * tileWidth * tileHeight +
        row * tileWidth +
        col;
    let outOffset = 0;
    let rowsLeft = height;
    // I overcomplicated this to try to get misc.dat to load correctly. It seems to use half the normal block size.
    const blockWidth = Math.min(width, tileWidth);

    if (image.type === -64) {
        while (rowsLeft--) {
            const copyLen = Math.floor(width / 2);
            const startOffset = inOffset;
            const inSubarray = inputBuffer.subarray(
                startOffset,
                startOffset + copyLen,
            );
            for (let i = 0; i < inSubarray.byteLength; i++) {
                const byte = inSubarray[i];
                outBuffer[outOffset++] = byte & 0xf;
                outBuffer[outOffset++] = byte >> 4;
            }
            inOffset += tileWidth;
        }
    } else {
        while (rowsLeft--) {
            let widthRemaining = width;
            for (let blockNo = 0; widthRemaining > 0; blockNo++) {
                const copyLen = Math.min(blockWidth, widthRemaining);
                const startOffset = inOffset + blockNo * tileWidth * tileHeight;
                const inSubarray = inputBuffer.subarray(
                    startOffset,
                    startOffset + copyLen,
                );
                outBuffer.set(inSubarray, outOffset);

                widthRemaining -= copyLen;
                outOffset += copyLen;
            }
            inOffset += tileWidth;
        }
    }

    return outBuffer;
}
function floorDecode(
    inputBuffer: Uint8Array<ArrayBufferLike>,
    image: Omit<MktPcImage, 'data'>,
) {
    const { width, height } = image;
    const outBuffer = new Uint8Array(new ArrayBuffer(width * height));

    const inSubarray = inputBuffer.subarray(
        image.dataOffset,
        image.dataOffset + width * height,
    );
    outBuffer.set(inSubarray, 0);

    return outBuffer;
}
