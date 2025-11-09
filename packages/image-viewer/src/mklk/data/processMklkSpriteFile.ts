import * as lz4 from '@nick/lz4';

import { BufferPtr } from '../../asm/BufferPtr';
import type {
    MklkFileHeader,
    MklkImage,
    SpriteHeader,
    SpriteSectionHeader,
    UploadedFile,
} from '../MklkTypes';

export function processMklkSpriteFile(selectedFile: UploadedFile): {
    fileHeader: MklkFileHeader;
    images: MklkImage[];
    spriteSection: ProcessSpriteDataSectionResult;
} {
    const { fileHeader, offset: fileHeaderLen } =
        processFileHeader(selectedFile);
    const ptr = new BufferPtr(
        new Uint8Array(selectedFile.buffer, fileHeaderLen),
    );
    const blocks: MklkImage[] = [];
    while (!ptr.atEnd()) {
        try {
            blocks.push(processBlock(ptr));
        } catch (e) {
            console.log('Failed to process block', e);
            break;
        }
    }

    const spritePtr = new BufferPtr(fileHeader.spriteData);
    const spriteSection = processSpriteDataSection(
        spritePtr,
        fileHeader.spriteSize,
    );

    spriteSection.sprites = spriteSection.sprites.map((s, idx) => {
        try {
            const data = extractOneSprite(s, blocks);
            return {
                ...s,
                data,
            };
        } catch (e) {
            console.warn('exception while extracting sprite %s:', idx, e);
            return s;
        }
    });

    return {
        fileHeader,
        images: blocks,
        spriteSection,
    };
}

function processFileHeader(file: UploadedFile): {
    fileHeader: MklkFileHeader;
    offset: number;
} {
    const ptr = new BufferPtr(new Uint8Array(file.buffer));
    const riff = ptr.getAndIncStaticStr(4);
    const totalSize = ptr.getAndInc32Le();
    const spriteHeader = ptr.getAndIncStaticStr(4);
    const spriteHeader2 = ptr.getAndIncStaticStr(4);
    // TODO add checks that riff is riff, spriteHeaders have the right magic values, etc

    const spriteSize = ptr.getAndInc32Le();
    const spriteData = ptr.buffer.subarray(ptr.offset, ptr.offset + spriteSize);
    ptr.offset += spriteSize;
    // TODO: actually parse the spriteData

    const listHeader = ptr.getAndIncStaticStr(4);
    const listSize = ptr.getAndInc32Le();
    const listTypeHeader = ptr.getAndIncStaticStr(4);
    // TODO: validate these magics too

    return {
        fileHeader: {
            riff,
            totalSize,
            spriteHeader,
            spriteHeader2,
            spriteSize,
            spriteData,
            listHeader,
            listSize,
            listTypeHeader,
        },
        offset: ptr.offset,
    };
}

export function processBlock(ptr: BufferPtr<Uint8Array>): MklkImage {
    const blockHeader = ptr.getAndIncStaticStr(4);
    const blockSize = ptr.getAndInc32Le();
    const imageType = ptr.getAndIncStaticStr(12);
    const imageName = ptr.getAndIncStaticStr(24);
    const unknownHash = ptr.getAndInc32Le();
    const unk2 = ptr.getAndInc32Le();
    ptr.offset += 32;
    const hash2 = ptr.getAndInc32Le();
    const dataType = ptr.getAndIncStaticStr(4);
    const width = ptr.getAndInc16Le();
    const height = ptr.getAndInc16Le();
    const dataHeader = ptr.getAndIncStaticStr(4);
    const dataSize = ptr.getAndInc32Le();

    const rawData = new Uint8Array(ptr.getAndIncAsBuffer(dataSize));

    const ret: MklkImage = {
        blockHeader,
        blockSize,
        imageType,
        name: imageName,
        unknownHash,
        unk2,
        hash2,
        dataType,
        width,
        height,
        dataHeader,
        dataSize,
        rawData: rawData,
    };

    const adjust = blockSize - dataSize - 96;
    if (adjust > 0) {
        // console.log(
        //     'adjusting offset from %s to %s',
        //     ptr.offset,
        //     ptr.offset + adjust,
        // );
        ptr.offset += adjust;
    }

    if (dataType === 'lz4 ') {
        try {
            ret.data = decompressLz4(ret.rawData, ret.width * ret.height * 4);
            postProcess(ret);
        } catch (e) {
            console.warn('failed to decompress lz4 image', ret, e);
        }
    } else {
        console.log('unsupported dataType', dataType);
    }

    return ret;
}

function decompressLz4(compressed: Uint8Array, decompressedSize: number) {
    const compressedPrefixedLen = new Uint8Array(4 + compressed.byteLength);
    const dataview = new DataView(compressedPrefixedLen.buffer);
    dataview.setUint32(0, decompressedSize, true);
    compressedPrefixedLen.set(compressed, 4);
    const decompressed = lz4.decompress(compressedPrefixedLen);
    return decompressed;
}

const removeTransparency = false;

/**
 * Utility for misc processing, right now just removing transparency sometimes.
 *
 * With rgba, one could hide something by setting the alpha to 0 but having
 * valid data in the rgb part. Doesn't look like they're doing that though,
 * but I had to check.
 */
function postProcess(img: MklkImage) {
    if (removeTransparency && img.data) {
        for (let i = 0; i < img.data?.byteLength; i += 4) {
            img.data[i + 3] = 255;
        }
    }
}

const spriteHeaderLen = 56;
interface ProcessSpriteDataSectionResult {
    spriteSectionHeader: SpriteSectionHeader;
    sprites: SpriteHeader[];
}

function processSpriteDataSection(
    ptr: BufferPtr<Uint8Array>,
    len: number,
): ProcessSpriteDataSectionResult {
    const startOffset = ptr.offset;
    const unknown0 = ptr.getAndInc32Le(); // 01 or 04
    const unknown1 = ptr.getAndInc32Le(); // 00 01 or 00 04
    const spriteCount = ptr.getAndInc32Le();
    const padding0 = ptr.getAndInc32Le();

    const spriteSectionHeader = {
        unknown0,
        unknown1,
        spriteCount,
        padding0,
    };

    const spriteHeadersLen = spriteCount * spriteHeaderLen;
    ptr.offset = startOffset + len - spriteHeadersLen;

    const sprites = [];
    for (let i = 0; i < spriteSectionHeader.spriteCount; i++) {
        try {
            sprites.push(processSpriteHeader(ptr, i));
        } catch (e) {
            console.warn('exception processing sprite headers', e);
            break;
        }
    }

    return {
        spriteSectionHeader,
        sprites,
    };
}

function processSpriteHeader(ptr: BufferPtr<Uint8Array>, index: number): SpriteHeader {
    return {
        index,
        xpos: ptr.getAndInc32Le(),
        ypos: ptr.getAndInc32Le(),
        width: ptr.getAndInc32Le(),
        height: ptr.getAndInc32Le(),
        width2: ptr.getAndInc32Le(),
        height2: ptr.getAndInc32Le(),
        unknown2: ptr.getAndInc32Le(),
        unknown3: ptr.getAndInc32Le(),
        unk_803f: ptr.getAndInc32Le(),
        unknown4: ptr.getAndInc32Le(),
        unknown5: ptr.getAndInc32Le(),
        sheetIndex: ptr.getAndInc32Le(), // tell us which image is this sprite in
        unknown7: ptr.getAndInc32Le(),
        unknown8: ptr.getAndInc32Le(),
    };
}

function extractOneSprite(
    spriteHeader: SpriteHeader,
    sheets: MklkImage[],
): Uint8Array<ArrayBuffer | SharedArrayBuffer> | undefined {
    const sheet = sheets[spriteHeader.sheetIndex];
    if (!sheet.data) return undefined;

    // be careful about units here: bytes vs pixels
    // don't forgot to multiply by 4 to convert pixels to bytes
    // but don't multiply by 4 if we're already in bytes!
    const spriteSizeInBytes = spriteHeader.width * spriteHeader.height * 4;
    const inBuf = sheet.data;
    const outBuf = new Uint8Array(spriteSizeInBytes);
    const startOffsetInPixels =
        (sheet.width * spriteHeader.ypos + spriteHeader.xpos);

    for (let row = 0; row < spriteHeader.height; row++) {
        const inOffset = (startOffsetInPixels + row * sheet.width) * 4;
        const outOffset = row * spriteHeader.width * 4;
        const line = inBuf.subarray(
            inOffset,
            inOffset + spriteHeader.width * 4,
        );
        outBuf.set(line, outOffset);
    }
    return outBuf;
}
