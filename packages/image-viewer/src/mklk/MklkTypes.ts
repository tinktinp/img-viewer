import type { FancySelectionObj } from '../Selection';

export interface MklkImage {
    blockHeader: string;
    blockSize: number;
    imageType: string;
    name: string;
    unknownHash: number;
    unk2: number;
    hash2: number;
    dataType: string;
    width: number;
    height: number;
    dataHeader: string;
    dataSize: number;
    rawData: Uint8Array<ArrayBuffer | SharedArrayBuffer>;
    data?: Uint8Array<ArrayBuffer | SharedArrayBuffer>;
}

export interface MklkSelectionObj extends FancySelectionObj {
    image?: MklkImage;
    sprite?: SpriteHeader;
}

export interface UploadedFile {
    name: string;
    buffer: ArrayBuffer;
    text?: string; // never present
}
export interface MklkFileHeader {
    riff: string;
    totalSize: number;
    spriteHeader: string;
    spriteHeader2: string;
    spriteSize: number;
    spriteData: Uint8Array<ArrayBuffer>;
    listHeader: string;
    listSize: number;
    listTypeHeader: string;
}
export interface SpriteHeader {
    index: number;
    xpos: number;
    ypos: number;
    width: number;
    height: number;
    width2: number;
    height2: number;
    unknown2: number;
    unknown3: number;
    unk_803f: number;
    unknown4: number;
    unknown5: number;
    sheetIndex: number; // which image is this sprite in?
    unknown7: number;
    unknown8: number;
    data?: Uint8Array<ArrayBuffer | SharedArrayBuffer>;
}
export interface SpriteSectionHeader {
    unknown0: number;
    unknown1: number;
    spriteCount: number;
    padding0: number;
}
