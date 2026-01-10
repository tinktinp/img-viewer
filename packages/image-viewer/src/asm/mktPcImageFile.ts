import { processOnePalette } from '../palettes/palettes';
import { BufferPtr } from './BufferPtr';
import {
    getCompressionType,
    uncompressImage,
    type CompressionType,
} from './decompressPc';

export interface MktPcFileNameAndData {
    name: string;
    buffer: ArrayBuffer;
}

export interface MktPcImage {
    id: number | string;
    dataOffset: number;
    type: number;
    fileId: number;
    width: number;
    height: number;
    xOffset: number;
    yOffset: number;
    paletteId: number;
    data: Uint8Array;
    isTile?: boolean;
    isFloor?: boolean;
    compressionType: CompressionType;
}
export interface MktPcPalette {
    id: number | string;
    paletteSize: number;
    rgb: number[][];
}

export async function filterMktPcFiles(
    files: File[],
): Promise<MktPcFileNameAndData[]> {
    const outFiles = [];
    for (const file of files) {
        if (
            file.name.toLowerCase().endsWith('.dat') ||
            file.name.toLowerCase().endsWith('.bin')
        ) {
            outFiles.push({
                name: file.webkitRelativePath || file.name,
                buffer: await file.arrayBuffer(),
            });
        }
    }

    return outFiles;
}

export function processMktPcImageFile(file: MktPcFileNameAndData) {
    const inPtr = new BufferPtr(new Uint8Array(file.buffer));
    let paletteOffset = inPtr.getAndInc32Le();
    const tablesDataOffset = inPtr.getAndInc32Le();
    let imageMetadataBuffer: Uint8Array;
    let tileMode = false;
    const floors: Omit<MktPcImage, 'data'>[] = [];
    const floorPalettes: MktPcPalette[] = [];

    if (tablesDataOffset < 16 || tablesDataOffset > file.buffer.byteLength) {
        const _unknown = inPtr.getAndInc32Le();

        const offsetToEndOfImageHeaders = inPtr.getAndInc32Le();
        if (offsetToEndOfImageHeaders < paletteOffset) {
            imageMetadataBuffer = new Uint8Array(
                inPtr.buffer.buffer,
                inPtr.buffer.byteOffset + inPtr.offset,
                offsetToEndOfImageHeaders - 12, // the `- 12` is subtract 1 header, so we don't try to parse an extra one
            );

            inPtr.offset = paletteOffset + 4;
            const mainPaletteSize = inPtr.getAndInc32Le();
            inPtr.offset += mainPaletteSize;
            const floorSize = inPtr.getAndInc32Le();
            const floorOffset = inPtr.offset;

            try {
                floorPalettes.push(
                    processOnePalette(
                        new BufferPtr(
                            new Uint8Array(
                                inPtr.buffer.buffer,
                                inPtr.buffer.byteOffset +
                                    floorOffset +
                                    floorSize +
                                    4,
                            ),
                        ),
                        `floor-${floorPalettes.length}`,
                    ),
                );

                const floorWidth = 0x3c0;
                const floorHeight = Math.floor(floorSize / floorWidth);
                floors.push({
                    id: `floor-${floorPalettes.length - 1}`,
                    dataOffset: floorOffset,
                    type: 0,
                    fileId: 0,
                    width: floorWidth,
                    height: floorHeight,
                    xOffset: 0,
                    yOffset: 0,
                    paletteId: floorPalettes.length - 1,
                    compressionType: 'Raw',
                    isFloor: true,
                });
            } catch {
                // failed to process floor, this might be a floorless background
            }
        } else {
            // backgrounds are divided into first and second, and the first one starts with the offset to the image headers
            //  instead of palettesOffset
            const headersOffset = paletteOffset + 4;
            inPtr.offset = headersOffset;
            const nextHeaders = inPtr.getAndInc32Le();
            inPtr.offset += nextHeaders;
            const realPaletteOffset = inPtr.getAndInc32Le(); // 0x00050624
            paletteOffset = inPtr.offset + realPaletteOffset - 4;
            const v2 = inPtr.getAndInc32Le(); // 0x0000_0004
            const v3 = inPtr.getAndInc32Le(); // 0x0000_0002
            const imageHeadersLen = inPtr.getAndInc32Le(); // 0x0000_0624

            imageMetadataBuffer = new Uint8Array(
                inPtr.buffer.buffer,
                inPtr.buffer.byteOffset + inPtr.offset,
                imageHeadersLen - 12, // the `- 12` is subtract 1 header, so we don't try to parse an extra one
            );

            floorPalettes.push(
                processOnePalette(
                    new BufferPtr(
                        new Uint8Array(
                            inPtr.buffer.buffer,
                            inPtr.buffer.byteOffset + headersOffset + 4,
                        ),
                    ),
                    `floor-${floorPalettes.length}`,
                ),
            );
            const floorWidth = 0x3c0;
            // const floorHeight = Math.floor(realPaletteOffset / 0x3c0);
            const floorHeight = Math.floor(headersOffset / floorWidth);
            floors.push({
                id: `floor-${floorPalettes.length - 1}`,
                dataOffset: 4,
                type: 0,
                fileId: 0,
                width: floorWidth,
                height: floorHeight,
                xOffset: 0,
                yOffset: 0,
                paletteId: floorPalettes.length - 1,
                compressionType: 'Raw',
                isFloor: true,
            });

            // addressof(bgPreheader.backgroundHeader.palette_section) + sizeof(bgPreheader.backgroundHeader.palette_section) + 2
            inPtr.offset = paletteOffset + 4;
            const mainPaletteSize = inPtr.getAndInc32Le();
            // console.log({ paletteOffset, mainPaletteSize });
            inPtr.offset += mainPaletteSize;
            const nextPalette = inPtr.getAndInc32Le();
            // console.log({ offset: inPtr.offset, nextPalette });
            const nextPaletteOffset = inPtr.offset + nextPalette;
            const nextFloorOffset = inPtr.offset;

            floorPalettes.push(
                processOnePalette(
                    new BufferPtr(
                        new Uint8Array(
                            inPtr.buffer.buffer,
                            inPtr.buffer.byteOffset + nextPaletteOffset + 4,
                        ),
                    ),
                    `floor-${floorPalettes.length}`,
                ),
            );

            floors.push({
                id: `floor-${floorPalettes.length - 1}`,
                dataOffset: nextFloorOffset,
                type: 0,
                fileId: 0,
                width: floorWidth,
                height: Math.floor(nextPalette / floorWidth),
                xOffset: 0,
                yOffset: 0,
                paletteId: floorPalettes.length - 1,
                compressionType: 'Raw',
                isFloor: true,
            });
        } // else {
        //     // no image meta data? Let's just do tiles then.
        //     imageMetadataBuffer = inPtr.buffer.subarray(0, 0);
        // }
        tileMode = true;
    } else {
        imageMetadataBuffer = new Uint8Array(
            inPtr.buffer.buffer,
            inPtr.offset + inPtr.buffer.byteOffset,
            inPtr.buffer.byteOffset + Math.max(tablesDataOffset - 4, 0),
        );
    }
    const images = processImageMetadata(imageMetadataBuffer, tileMode);
    images.push(...floors);

    fixupMetadata(images);
    const paletteDataBuffer = new Uint8Array(
        inPtr.buffer.buffer,
        inPtr.buffer.byteOffset + paletteOffset,
    );
    const palettes = processPalettes(paletteDataBuffer);

    floors.forEach((f) => {
        f.paletteId += palettes.length;
    });
    palettes.push(...floorPalettes);

    const tables: number[] = [];
    try {
        const tablePtr = new BufferPtr(
            new Uint8Array(file.buffer, tablesDataOffset + 4, 4),
        );
        tables.push(tablePtr.getAndInc16Le());
        tables.push(tablePtr.getAndInc16Le());
    } catch {}

    const imagesWithData = images.map((image) => {
        try {
            const data = uncompressImage(image, inPtr.buffer, tables);
            return {
                ...image,
                data,
            };
        } catch (e) {
            console.warn('exception uncompressing image!', e);
            return {
                ...image,
                data: new Uint8Array(image.width * image.height),
            };
        }
    });

    return {
        name: file.name,
        images: imagesWithData,
        palettes,
        tables,
    };
}

function processImageMetadata(buffer: Uint8Array, tileMode: boolean) {
    const metadatas = [];
    const ptr = new BufferPtr(buffer);

    try {
        while (!ptr.atEnd()) {
            const firstDoubleWord = ptr.getAndInc32Le();
            const dataOffset = firstDoubleWord & 0xffffff;
            const type = firstDoubleWord >> 0x18;
            const fileId = type & 0x1f;
            const width = !tileMode
                ? (ptr.getAndInc() + 3) & 0xfffc
                : ptr.getAndInc();
            const height = ptr.getAndInc();
            const xOffset = ptr.getAndIncS16Le();
            const yOffset = ptr.getAndIncS16Le();
            const paletteId = ptr.getAndInc16Le();
            const compressionType = getCompressionType({ fileId, type });

            metadatas.push({
                id: metadatas.length as string | number,
                dataOffset,
                type,
                fileId,
                width,
                height,
                xOffset,
                yOffset,
                paletteId,
                compressionType,
            });
        }

        if (tileMode) {
            const type = metadatas[0].type;
            //const tileWidth = type === -64 ? 0x80 : 0x100;
            const tileWidth = 0x100;
            // const tileHeight = 0x100;
            const tileHeight = Math.floor(buffer.buffer.byteLength / tileWidth);
            const tileSize = tileWidth * tileHeight;
            const nTiles = 1; //Math.ceil(buffer.buffer.byteLength / tileSize);
            for (let i = 0; i < nTiles; i++) {
                metadatas.push({
                    id: 'tile',
                    dataOffset: tileSize * i,
                    type,
                    fileId: 0,
                    width: tileWidth,
                    height: type === -64 ? tileHeight * 2 : tileHeight,
                    xOffset: 0,
                    yOffset: 0,
                    paletteId: 0,
                    compressionType: 'Raw' as const,
                });
            }
        }
    } catch (e) {
        console.log(
            `Failed processing image metadata after ${metadatas.length} headers`,
            e,
        );
    }

    // console.log(metadatas);

    return metadatas;
}

function fixupMetadata(images: Omit<MktPcImage, 'data'>[]) {
    for (let j = images.length - 2; j >= 0; j--) {
        const nextImage = images[j + 1];
        const image = images[j];

        if (nextImage.dataOffset === image.dataOffset) {
            image.width = nextImage.width;
            image.height = nextImage.height;
            image.paletteId = nextImage.paletteId;
        }
    }
}

function processPalettes(buffer: Uint8Array) {
    const palettes = [];
    const ptr = new BufferPtr(buffer);
    ptr.offset += 8;

    while (!ptr.atEnd()) {
        const { paletteSize, rgb } = processOnePalette(ptr);
        if (paletteSize === 0) break;

        palettes.push({
            id: palettes.length as string | number,
            paletteSize,
            rgb,
        });
    }

    return palettes;
}
