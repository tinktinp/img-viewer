import { BufferPtr } from '../../asm/BufferPtr';
// import { toHex } from '../../utils/toHex';

export function parseWiffDiskImg(buffer: Uint8Array) {
    const ptr = new BufferPtr(buffer);

    // Make sure the file starts with WIFF
    const wiffMagic = ptr.get32(false);
    if (wiffMagic !== 0x57_49_46_46) {
        return undefined;
    }

    const wiffs = [];

    for (let i = 0; i < buffer.byteLength; i += 1024) {
        ptr.offset = i;
        if (ptr.get32(false) === 0x57_49_46_46) {
            wiffs.push(parseWiff(ptr));
        }
    }
    return wiffs;
}

export interface Wiff {
    buffer: Uint8Array;
    startOffset: number;
    wiffSize: number;
    wiffMagic: string;
    endOffset: number;
    sections: {
        sectionMagic: string;
        sectionSize: number;
        sectionDataOffset: number;
    }[];
}

function parseWiff(ptr: BufferPtr): Wiff {
    // console.log('parsing wiff at', toHex(ptr.offset));
    const startOffset = ptr.offset;

    const wiffMagic = ptr.getAndIncStaticStr(4);
    const wiffSize = ptr.getAndInc32(false);

    const sections = [];

    const endOffset = startOffset + wiffSize;

    while (!ptr.atEnd() && ptr.offset < endOffset) {
        if (!Number.isFinite(ptr.offset)) {
            console.log('wtf!', ptr);
            break;
        }
        const sectionMagic = ptr.getAndIncStaticStr(4);
        const sectionSize = ptr.getAndInc32(false);
        const sectionDataOffset = ptr.offset;

        // console.log(
        //     'found section %s at %s len %s',
        //     sectionMagic,
        //     toHex(sectionDataOffset),
        //     toHex(sectionSize),
        // );

        if (sectionSize < 1) {
            console.log('invalid section size!', sectionSize);
            break;
        }
        ptr.offset += sectionSize;

        sections.push({
            sectionMagic,
            sectionSize,
            sectionDataOffset,
        });
    }

    return {
        buffer: ptr.buffer,
        startOffset,
        wiffSize,
        wiffMagic,
        endOffset,
        sections,
    };
}

export function filterWiffBySectionType(wiff: Wiff, sectionMagic: string) {
    return wiff.sections.filter((s) => s.sectionMagic === sectionMagic);
}

function fourBytesSplit(f: number) {
    return [f >>> 24, (f >> 16) & 0xff, (f >> 8) & 0xff, f & 0xff];
}

export interface Dir4File {
    fileId: number;
    unk1: number;
    unk2: number;
    filename: string;
}
export interface Dir4Section {
    fileType: string;
    fileCount: number;
    files: Dir4File[];
}

export interface Dir4Container {
    id1: number;
    sectionCount: number;
    sections: Dir4Section[];
}
export function parseDir4(ptr: BufferPtr): Dir4Container {
    const sections = [];
    const id1 = ptr.getAndInc32();
    const sectionCount = ptr.getAndInc32();

    while (!ptr.atEnd() && ptr.buffer.byteLength - ptr.offset >= 8) {
        const fileType = ptr.getAndIncStaticStr(4);
        const fileCount = ptr.getAndInc32();

        const nextSectionOffset = ptr.offset + (fileCount + 1) * 24;
        const files = [];
        while (
            !ptr.atEnd() &&
            ptr.offset < nextSectionOffset &&
            ptr.buffer.byteLength - ptr.offset >= 24
        ) {
            const fileId = ptr.getAndInc32();
            const unk1 = ptr.getAndInc32();
            const unk2 = ptr.getAndInc32();
            let filenameBytes = [];
            const fn1 = ptr.getAndInc32();
            const fn2 = ptr.getAndInc32();
            const fn3 = ptr.getAndInc32();
            filenameBytes.push(
                ...fourBytesSplit(fn1),
                ...fourBytesSplit(fn2),
                ...fourBytesSplit(fn3),
            );
            const nulIdx = filenameBytes.findIndex((c) => c === 0);
            if (nulIdx !== -1) {
                filenameBytes = filenameBytes.slice(0, nulIdx);
            }
            const filename = String.fromCharCode(...filenameBytes);

            files.push({
                fileId,
                unk1,
                unk2,
                filename,
            });
        }
        sections.push({
            fileType,
            fileCount,
            files,
        });
    }
    return { id1, sectionCount, sections };
}
