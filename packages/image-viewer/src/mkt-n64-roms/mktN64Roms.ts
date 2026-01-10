import { BufferPtr } from '../asm/BufferPtr';
import { mktN64ImageDecompressToPng } from '../consume-worker';
import {
    BasePluginItem,
    ElementsFinishedLoading,
    ElementsLoadedEvent,
    type Plugin,
    type PluginItem,
} from '../plugin/plugin';
import { type AniCmd, parseAniEntry } from '../utils/aniCmd';
import { toHex } from '../utils/toHex';
import { dummyPalette } from './dummy-palette';
import { getRomInfo, n64RomMagic, type RomInfo } from './MktN64RomInfo';
import {
    fixupAddressObjs,
    processAnitabEntry,
    processFrame,
    processFrameOffset,
} from './mktN64RomAnitab';
import { mktN64RomImgDetails } from './mktN64RomImgDetails';
import {
    getCharacterPaletteElements,
    paletteAddrToFileOffset,
} from './mktN64RomsPalettes';
import type {
    AddressObj,
    MktN64CharacterItem,
    MktN64FileItem,
    MktN64FileItemProps,
    MktN64RomElementImage,
    PalettePtr,
    Segment,
    Subframe,
} from './mktN64RomTypes';

async function mktN64RomElementImageToPng(
    this: MktN64RomElementImage,
): Promise<ArrayBufferLike> {
    const { subframe } = this.img;
    const {
        imgData,
        width = 0,
        height = 0,
        xOffset = 0,
        yOffset = 0,
    } = subframe;
    if (!imgData) {
        throw new Error('no imgData present!');
    }
    const meta = {
        width,
        height,
        xOffset,
        yOffset,
        name: '',
        animationFilename: '',
    };

    if (!subframe.imgSlice) {
        subframe.imgSlice = imgData.buffer.slice(
            imgData.byteOffset,
            imgData.byteOffset + imgData.byteLength,
        );
    }

    const dict = this.item.arrayBuffer.slice(this.dict.start, this.dict.end);
    const palette = await imgGetPalette(this);
    // const palette =
    //     this.item.paletteElements && this.item.paletteElements.length > 0
    //         ? await this.item.paletteElements[0].rgba()
    //         : dummyPalette;
    // TODO:
    //     - add logic to let us convert the palette to `number[][]` only once
    //     - some way to pass in which palette to use (settings in general)
    //     - caching
    const png = await mktN64ImageDecompressToPng(
        meta,
        subframe.imgSlice,
        palette,
        'RGBX5551',
        dict,
    );
    return png.buffer;
}

function imgGetPalette(elementImage: MktN64RomElementImage) {
    const {
        item: { paletteElements },
        img: { subframe },
    } = elementImage;
    if (!paletteElements || paletteElements.length === 0) {
        return dummyPalette;
    }

    if (subframe.suggestedPalette) {
        const suggestedPaletteElement = paletteElements.find(
            ({ fileOffset }) => fileOffset === subframe.suggestedPalette,
        );
        if (suggestedPaletteElement) {
            return suggestedPaletteElement.rgba();
        }
    }
    return paletteElements[0].rgba();
}

class BaseMktN64FileItem extends BasePluginItem {
    async loadElements(this: MktN64FileItem) {
        if (this.type === 'character') {
            this.dispatchEvent(
                new ElementsLoadedEvent([
                    {
                        type: 'section',
                        id: 'images',
                        sectionId: 'root',
                        name: 'Images',
                    },
                    {
                        type: 'section',
                        id: 'palettes',
                        sectionId: 'root',
                        name: 'Palettes',
                    },
                ]),
            );

            const results = await processCharSegment(this);
            const elements = results.addressMap
                .entries()
                .flatMap(([addr, img]) => {
                    if (img.type === 'img') {
                        const imgElement: MktN64RomElementImage = {
                            type: 'image',
                            id: `${this.id}-img-${toHex(addr)}`,
                            sectionId: 'images',
                            name: toHex(addr),
                            name2: `ani: ${img.subframe.aniCmd.anitabIndex}`,
                            width: img.subframe.width,
                            height: img.subframe.height,
                            padding: img.subframe.padding,
                            img,
                            toPng: mktN64RomElementImageToPng,
                            item: this,
                            dict: this.charDict,
                            details() {
                                return mktN64RomImgDetails(this);
                            },
                        };
                        return [imgElement];
                    } else {
                        return [];
                    }
                })
                .toArray();
            this.dispatchEvent(new ElementsLoadedEvent(elements));

            this.paletteElements = getCharacterPaletteElements(
                this,
                results.palettes,
            );
            this.dispatchEvent(new ElementsLoadedEvent(this.paletteElements));

            this.dispatchEvent(new ElementsFinishedLoading());
        }
    }
}

// biome-ignore lint/suspicious/noRedeclare: TODO: type and helper function with same name, revisit this later
function MktN64FileItem<T extends MktN64FileItemProps>(
    props: T,
): T & BaseMktN64FileItem {
    const rv = Object.assign(new BaseMktN64FileItem(), props);
    return rv;
}

export class MktN64Roms implements Plugin<MktN64FileItem> {
    async getItemsFromFiles(files: File[]): Promise<MktN64FileItem[]> {
        const rv: MktN64FileItem[] = [];

        const promises = files.map(async (f) => {
            const arrayBuffer = await f.arrayBuffer();
            if (arrayBuffer.byteLength < 0xffff) {
                return;
            }
            const dataView = new DataView(arrayBuffer);
            const magic = dataView.getUint32(0, false);
            if (magic === n64RomMagic) {
                let segments: RomSegments;
                try {
                    segments = await getSegments(dataView, f);
                } catch (e) {
                    console.log(
                        'Failed to find segments for rom %s!',
                        f.webkitRelativePath,
                        e,
                    );
                    return;
                }
                // console.log('%s matches!', f.name);
                segments.charSegments.forEach((s, idx) => {
                    const idxstr = idx.toString(10).padStart(2, '0');
                    const startAddrStr = toHex(s.start, 6);
                    rv.push(
                        MktN64FileItem({
                            type: 'character',
                            file: f,
                            arrayBuffer,
                            romInfo: segments.romInfo,
                            id: `mktn64roms-${f.webkitRelativePath}-char-${idxstr}`,
                            label: `N64ROM/${f.webkitRelativePath}/char-${idxstr}-${startAddrStr}`,
                            segment: s,
                            charDict: segments.charDicts[idx],
                            charId: idx,
                        }),
                    );

                    // testing pushing another type
                    // rv.push(
                    //     MktN64FileItem({
                    //         type: 'background',
                    //         file: f,
                    //         arrayBuffer,
                    //         id: `mktn64roms-${f.name}-char-${idxstr}`,
                    //         label: `${f.name}/char-${idxstr}-${startAddrStr}`,
                    //         segment: s,
                    //         //charDict: segments.charDicts[idx],
                    //     }),
                    // );
                });
            }
        });
        await Promise.all(promises);

        // console.log(rv);
        return rv;
    }

    // async processItem(item: MktN64FileItem) {
    //     if (item.type === 'character') {
    //         return processCharSegment(item);
    //     }
    // }
}

/**
 * Segments or overlays or interesting pieces of the rom
 */
interface RomSegments {
    romInfo: RomInfo;
    charSegments: Segment[];
    charDicts: Segment[];
}

function makeSegment(start: number, end: number): Segment {
    return {
        start,
        end,
        size: end - start,
    };
}

async function getSegments(
    dataView: DataView,
    file: File,
): Promise<RomSegments> {
    const info = getRomInfo(dataView);
    if (info === undefined)
        throw new Error(`Unknown rom ${file.webkitRelativePath}!`);

    const charSegments = [];
    const charDicts = [];

    for (let i = 0; i < 32; i++) {
        const textOffset = info.characterTextures + i * 8;

        charSegments.push(
            makeSegment(
                dataView.getUint32(textOffset, false),
                dataView.getUint32(textOffset + 4, false),
            ),
        );

        const dictOffset = info.characterDict + i * 8;
        charDicts.push(
            makeSegment(
                dataView.getUint32(dictOffset, false),
                dataView.getUint32(dictOffset + 4, false),
            ),
        );
    }
    return {
        romInfo: info,
        charSegments,
        charDicts,
    };
}

async function processCharSegment({
    arrayBuffer,
    segment,
}: MktN64CharacterItem) {
    const inPtr = new BufferPtr(arrayBuffer, segment.start, {
        defaultEndianness: 'be',
    });

    // first process anitab (animation table)
    // then animation, frames, subs, and images
    // Example:
    //   table jc_anitab1 (array of pointers to animations) =>
    //   animation a_stance (array of <frame|command>) =>
    //   frame JCSTANCE1 (null terminated array of SUBs) =>
    //   sub JCSTANCE1_SUB (pointer to img, width/height/x/y) =>
    //   img JCSTANCE1_IMG (pixel data)
    //
    // finally at some point we use the charDict to help us decompress the image

    // sometimes there are gaps in anitabs and animations, so its better to find the end
    // by finding the beginning of something else

    const aniPtrs: { anitabIndex: number; aniPtr: number | undefined }[] = [];
    const addressMap = new Map<number, AddressObj>();
    addressMap.set(segment.size, { offset: segment.size, type: 'segmentEnd' });

    let anitabEnd = segment.size;

    for (
        let anitabIndex = 0;
        !inPtr.atEnd() && inPtr.offset < segment.start + anitabEnd;
        anitabIndex++
    ) {
        const aniPtr = inPtr.getAndInc32();
        if (aniPtr !== 0) {
            aniPtrs.push({ anitabIndex, aniPtr });
            anitabEnd = Math.min(anitabEnd, aniPtr);
        } else {
            aniPtrs.push({ anitabIndex, aniPtr: undefined });
        }
    }

    let startOfImageData = segment.size;

    const anitab = aniPtrs.map(({ anitabIndex, aniPtr: animationOffset }) => {
        const aniCmds: AniCmd[] = [];
        const frames: Subframe[][] = [];
        const secondaryAni: Subframe[][][] = [];

        if (animationOffset === undefined) {
            // return empty arrays for gaps in the anitab
            return { aniCmds, frames, secondaryAni };
        }

        ({ startOfImageData } = processAnitabEntry({
            // which animation we are processing
            anitabIndex,
            animationOffset,

            // the file and segment
            arrayBuffer,
            segment,

            // various data we are accumulating
            addressMap,
            aniCmds,
            frames,
            secondaryAni,

            // state we are tracking
            startOfImageData,
        }));
        return { aniCmds, frames, secondaryAni };
    });

    const palettes = new Map<number, PalettePtr>();
    fixupAddressObjs(addressMap, palettes, arrayBuffer, segment, anitab, startOfImageData);

    // console.log(anitab);
    return { anitab, addressMap, palettes };
}
