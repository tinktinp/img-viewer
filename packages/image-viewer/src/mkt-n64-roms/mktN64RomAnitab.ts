import { BufferPtr } from '../asm/BufferPtr';
import { mktN64GetImageInfo } from '../asm/decompressMktN64';
import {
    type AniCmd,
    type AniCmdWithFrameOffset,
    parseAniEntry,
} from '../utils/aniCmd';
import { toHex } from '../utils/toHex';
import {
    isValidPaletteAddr,
    paletteAddrToFileOffset,
} from './mktN64RomsPalettes';
import type {
    AddressObj,
    PalettePtr,
    RawSubframe,
    Segment,
    Subframe,
} from './mktN64RomTypes';

export type Anitab = {
    aniCmds: AniCmd[];
    frames: Subframe[][];
    secondaryAni: Subframe[][][];
}[];

/**
 * Use the next object's offset to figure out the length of the current one, etc.
 *
 * Currently this is used to set the size of the image data, and to decide if the `subframe`
 * object includes a palette pointer or not.
 */
export function fixupAddressObjs(
    addressMap: Map<number, AddressObj>,
    palettes: Map<number, PalettePtr>,
    arrayBuffer: ArrayBufferLike,
    segment: Segment,
    anitab: Anitab,
    startOfImageData: number,
) {
    fixupAddressObjsAnis(
        addressMap,
        arrayBuffer,
        segment,
        anitab,
        startOfImageData,
    );
    fixupAddressObjsPalettes(addressMap, palettes, arrayBuffer);
}

function fixupAddressObjsAnis(
    addressMap: Map<number, AddressObj>,
    arrayBuffer: ArrayBufferLike,
    segment: Segment,
    anitab: Anitab,
    startOfImageData: number,
) {
    const objectOffsets = addressMap
        .keys()
        .toArray()
        .sort((a, b) => {
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        });

    objectOffsets.forEach((currOffset, idx) => {
        if (idx + 1 in objectOffsets) {
            const nextOffset = objectOffsets[idx + 1];
            const addressObj = addressMap.get(currOffset);
            // const nextAddressObj = addressMap.get(nextOffset);

            // const objMaxSize = nextOffset - currOffset;
            switch (addressObj?.type) {
                case 'aniCmd':
                    {
                        const spaceBetween =
                            nextOffset -
                            (currOffset + addressObj.aniCmd.aniCmdSizeInBytes);
                        if (spaceBetween > 0) {
                            // console.log(
                            //     'there is space after aniCmd, reprocessing',
                            //     {
                            //         spaceBetween,
                            //         addressObj,
                            //         nextAddressObj,
                            //     },
                            // );

                            const { anitabIndex } = addressObj;
                            const { aniCmds, frames, secondaryAni } =
                                anitab[anitabIndex];

                            const animationPalette =
                                frames[0]?.[0].suggestedPalette;

                            let animationOffset =
                                currOffset +
                                addressObj.aniCmd.aniCmdSizeInBytes;
                            let prevOffset = animationOffset;
                            do {
                                const secondaryAnimationPalette =
                                    secondaryAni[
                                        secondaryAni.length - 1
                                    ]?.[0]?.[0].suggestedPalette;

                                // lets try processing it again!
                                processAnitabEntry({
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

                                    // palette stuff
                                    animationPalette,
                                    secondaryAnimationPalette,
                                });

                                prevOffset = animationOffset;
                                const newestAniCmd =
                                    aniCmds[aniCmds.length - 1];
                                animationOffset =
                                    newestAniCmd.aniAddr +
                                    newestAniCmd.aniCmdSizeInBytes;
                            } while (
                                animationOffset > prevOffset &&
                                animationOffset < nextOffset
                            );
                        }
                    }
                    break;
            }
        }
    });
}

function fixupAddressObjsPalettes(
    addressMap: Map<number, AddressObj>,
    palettes: Map<number, PalettePtr>,
    arrayBuffer: ArrayBufferLike,
) {
    const fileLength = arrayBuffer.byteLength;
    const objectOffsets = addressMap
        .keys()
        .toArray()
        .sort((a, b) => {
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        });

    objectOffsets.forEach((currOffset, idx) => {
        if (idx + 1 in objectOffsets) {
            const nextOffset = objectOffsets[idx + 1];
            const addressObj = addressMap.get(currOffset);

            const objMaxSize = nextOffset - currOffset;
            switch (addressObj?.type) {
                case 'frame':
                    addressObj.frame.forEach((subframe) => {
                        collectPalettes(subframe, palettes, fileLength);
                    });
                    break;
                case 'subframe':
                    {
                        const { subframe } = addressObj;
                        collectPalettes(subframe, palettes, fileLength);
                    }
                    break;
                case 'img': {
                    const imgData = addressObj.subframe.imgData;
                    if (imgData) {
                        const imgDataByteLen = imgData.byteLength;
                        const newLen = Math.min(imgDataByteLen, objMaxSize);
                        if (newLen !== imgDataByteLen) {
                            addressObj.subframe.imgData = new DataView(
                                imgData.buffer,
                                imgData.byteOffset,
                                newLen,
                            );
                        }
                    }
                    break;
                }
                case 'segmentEnd':
                    console.warn(
                        'segmentEnd is not the last address in the segment?!',
                        { addressObj, nextOffset },
                    );
            }
        }
    });
}

function collectPalettes(
    subframe: Subframe,
    palettes: Map<number, PalettePtr>,
    fileLength: number,
) {
    const palettePtr = subframe.palette;

    if (isValidPaletteAddr(palettePtr)) {
        const paletteFileOffset = paletteAddrToFileOffset(palettePtr);
        if (paletteFileOffset < fileLength) {
            if (!palettes.has(paletteFileOffset)) {
                palettes.set(paletteFileOffset, {
                    fileOffset: paletteFileOffset,
                    paletteType: 'from-ani',
                    anitabIndex: subframe.aniCmd.anitabIndex,
                });
            }
        } else {
            console.warn('palette offset would be outside the file length!', {
                palettePtr,
                paletteFileOffset,
            });
        }
    } else if (palettePtr) {
        console.log('invalid palette made it here', palettePtr, subframe);
    }
}

export function processAnitabEntry({
    animationOffset,
    segment,
    anitabIndex,
    addressMap,
    arrayBuffer,
    frames,
    startOfImageData,
    secondaryAni,
    aniCmds,
    animationPalette,
    secondaryAnimationPalette,
}: {
    animationOffset: number;
    segment: Segment;
    anitabIndex: number;
    addressMap: Map<number, AddressObj>;
    arrayBuffer: ArrayBufferLike;
    frames: Subframe[][];
    startOfImageData: number;
    secondaryAni: Subframe[][][];
    aniCmds: AniCmd[];
    animationPalette?: number | undefined;
    secondaryAnimationPalette?: number | undefined;
}) {
    const ptr = new BufferPtr(arrayBuffer, segment.start + animationOffset, {
        defaultEndianness: 'be',
    });

    while (!ptr.atEnd() && ptr.offset < segment.end) {
        const aniCmd = parseAniEntry(ptr, segment.start, anitabIndex);
        addressMap.set(aniCmd.aniAddr, {
            offset: aniCmd.aniAddr,
            type: 'aniCmd',
            aniCmd,
            anitabIndex,
        });
        if (aniCmd.cmd === 'frame') {
            if (aniCmd.frameOffset > segment.size) {
                console.warn('AniCmdFrame has offset too big!', {
                    aniCmd,
                    anitabIndex,
                });
                break;
            } else {
                const {
                    startOfImageData: newStartOfImageData,
                    animationPalette: newAnimationPalette,
                } = processFrameOffset({
                    arrayBuffer,
                    segment,
                    addressMap,
                    frames,
                    anitabIndex,
                    aniCmd,
                    startOfImageData,
                    animationPalette,
                });
                startOfImageData = newStartOfImageData;
                animationPalette = newAnimationPalette;
            }
        } else if (
            aniCmd.cmd === 'sladd' ||
            aniCmd.cmd === 'slani' ||
            aniCmd.cmd === 'slani_sleep'
        ) {
            if (aniCmd.cmd === 'sladd' || secondaryAni.length === 0) {
                secondaryAni.push([]);
            }
            const {
                startOfImageData: newStartOfImageData,
                animationPalette: newAnimationPalette,
            } = processFrameOffset({
                arrayBuffer,
                segment,
                addressMap,
                frames: secondaryAni[secondaryAni.length - 1],
                anitabIndex,
                aniCmd,
                startOfImageData,
                animationPalette: secondaryAnimationPalette,
            });
            startOfImageData = newStartOfImageData;
            secondaryAnimationPalette = newAnimationPalette;
        }
        aniCmds.push(aniCmd);
        if (aniCmd.cmd === 'end') break;
        if (aniCmd.cmd === 'jump') break;
    }
    return {
        startOfImageData,
        animationPalette,
        secondaryAnimationPalette,
    };
}

export interface AnitabProcessingState {
    arrayBuffer: ArrayBufferLike;
    segment: Segment;
    addressMap: Map<number, AddressObj>;
    frames: Subframe[][];
    anitabIndex: number;
    aniCmd: AniCmdWithFrameOffset;
    startOfImageData: number;
    animationPalette: number | undefined;
}
export function processFrameOffset({
    arrayBuffer,
    segment,
    addressMap,
    frames,
    anitabIndex,
    aniCmd,
    startOfImageData,
    animationPalette,
}: AnitabProcessingState) {
    const offset = aniCmd.frameOffset;
    const addressObjFrame = addressMap.get(offset);

    if (addressObjFrame === undefined) {
        const frame = processFrame(
            arrayBuffer,
            segment,
            aniCmd,
            addressMap,
            startOfImageData,
        );
        if (frame.length === 0) {
            console.log(
                'reached an invalid frame, assuming real end of animation',
                // aniCmds,
            );
            return {
                startOfImageData,
                animationPalette,
            };
        }
        frame.forEach((subframe) => {
            if (subframe.imgOffset) {
                startOfImageData = Math.min(
                    startOfImageData,
                    subframe.imgOffset,
                );
            }
        });
        frames.push(frame);
        addressMap.set(offset, {
            offset: offset,
            type: 'frame',
            frame,
        });
    } else if (addressObjFrame.type === 'frame') {
        frames.push(addressObjFrame.frame);
    } else if (addressObjFrame.type === 'subframe') {
        // We can go directly from animation to subframe!
        frames.push([addressObjFrame.subframe]);
    } else {
        console.log(
            "Already have a non-frame at frame's offset!",
            addressObjFrame,
        );
    }

    animationPalette = addSuggestedPalette(
        anitabIndex,
        frames,
        frames[frames.length - 1],
        animationPalette,
    );

    return {
        startOfImageData,
        animationPalette,
    };
}

function addSuggestedPalette(
    anitabIndex: number,
    frames: Subframe[][],
    frame: Subframe[],
    animationPalette: number | undefined,
) {
    if (
        anitabIndex !== 0 &&
        frames.length === 1 &&
        frame[0].palette !== undefined
    ) {
        animationPalette = paletteAddrToFileOffset(frame[0].palette);
    }
    if (animationPalette) {
        frame.forEach((subframe) => {
            subframe.suggestedPalette = animationPalette;
        });
    }
    return animationPalette;
}

export function processFrame(
    arrayBuffer: ArrayBufferLike,
    segment: Segment,
    aniCmd: AniCmdWithFrameOffset,
    addressMap: Map<number, AddressObj>,
    startOfImageData: number,
) {
    // N64 usually only has one sub, unlike the arcade where most frames are broken up into pieces.
    const subs = [];

    const ptr = new BufferPtr(arrayBuffer, segment.start + aniCmd.frameOffset, {
        defaultEndianness: 'be',
    });

    for (
        let subframeIndex = 0;
        !ptr.atEnd() && ptr.offset < segment.end;
        subframeIndex++
    ) {
        const subOffset = ptr.getAndInc32();
        if (subOffset === 0) break;
        if (subOffset > segment.size) {
            console.warn('subOffset out of range!', {
                aniCmd,
                subOffset: toHex(subOffset),
                segmentSize: toHex(segment.size),
                segment,
                subframeIndex,
            });
            break;
        }

        let subframe: Subframe | undefined;
        if (subOffset > startOfImageData) {
            // Must be a "direct to subframe" animation.
            const processedSub = processSub(
                arrayBuffer,
                segment,
                aniCmd.frameOffset,
            );
            if (processedSub !== undefined) {
                subframe = {
                    aniCmd,
                    subOffset: aniCmd.frameOffset,
                    ...processedSub,
                };
            }
        } else {
            const processedSub = processSub(arrayBuffer, segment, subOffset);
            if (processedSub !== undefined) {
                subframe = {
                    aniCmd,
                    subOffset,
                    ...processedSub,
                };
            }
        }
        if (subframe === undefined) {
            console.warn('invalid subframe');
            break;
        }
        addressMap.set(subOffset, {
            offset: subOffset,
            type: 'subframe',
            subframe,
        });
        if (subframe.imgOffset && subframe.imgData) {
            addressMap.set(subframe.imgOffset, {
                offset: subframe.imgOffset,
                type: 'img',
                subframe,
            });
        } else {
            console.log('bad imgOffset?', aniCmd, subframe);
        }
        subs.push(subframe);

        if (subframe.imgOffset === subOffset) {
            // if this was a direct-to-subframe then there is no zero after it.
            break;
        }
    }

    return subs;
}
function processSub(
    arrayBuffer: ArrayBufferLike,
    segment: Segment,
    subOffset: number,
) {
    try {
        const ptr = new BufferPtr(arrayBuffer, segment.start + subOffset, {
            defaultEndianness: 'be',
        });

        const rawSubframe: RawSubframe = {
            imgOffset: ptr.getAndInc32(),
            height: ptr.getAndInc16(),
            width: ptr.getAndInc16(),
            yOffset: ptr.getAndIncS16(),
            xOffset: ptr.getAndIncS16(),
            palette: ptr.getAndInc32(),
        };

        //const paddedWidth = (realWidth + 3) & ~3;
        //const padding = paddedWidth - realWidth;

        const subframeValidity: SubframeValidity = isValidSubframe(
            arrayBuffer,
            segment,
            rawSubframe,
        );
        if (subframeValidity !== 'valid') {
            console.warn('invalid subframe!', {
                rawSubframe,
                subframeValidity,
            });
            return;
        }

        const imgValidity = isValidImgDataOffset(
            arrayBuffer,
            segment,
            rawSubframe.imgOffset,
        );
        const imgData =
            imgValidity === 'valid'
                ? new DataView(
                      arrayBuffer,
                      segment.start + rawSubframe.imgOffset,
                      segment.size - rawSubframe.imgOffset, // TODO: handle special textures
                  )
                : undefined;

        let imgSize: number | undefined;
        let imgType: number | undefined;

        // if (imgData) {
        //     const imgFirstUint32 = imgData.getUint32(0, false);
        //     imgSize = imgFirstUint32 & 0xff_ffff;
        //     imgType = (imgFirstUint32 >>> 24) & 0b11_1111;

        //     if (imgSize > 512 * 512) {
        //         imgData = undefined;
        //         console.warn('image too big, skipping...', {
        //             imgSize,
        //             imgType,
        //             subOffset,
        //         });
        //     }
        // }
        // const height = ptr.getAndInc16();
        // const realWidth = ptr.getAndInc16();
        const paddedWidth = (rawSubframe.width + 3) & ~3;
        const padding = paddedWidth - rawSubframe.width;
        // const yOffset = ptr.getAndIncS16();
        // const xOffset = ptr.getAndIncS16();

        // const nextWord = ptr.getAndInc32();
        const palette = isValidPaletteAddr(rawSubframe.palette)
            ? rawSubframe.palette
            : undefined;

        // console.log({ imgSize, imgType, wxh: paddedWidth * height });
        return {
            imgOffset: rawSubframe.imgOffset,
            imgData,
            imgSize,
            imgType,
            height: rawSubframe.height,
            width: paddedWidth,
            padding,
            yOffset: rawSubframe.yOffset,
            xOffset: rawSubframe.xOffset,
            palette,
        };
    } catch (e) {
        console.error('exception!', { subOffset }, e);
    }
}

type SubframeValidity =
    | 'valid'
    | 'img-offset-past-end-of-segment'
    | 'img-offset-past-end-of-file'
    | 'width-too-big'
    | 'height-too-big'
    | 'x-offset-out-of-range'
    | 'y-offset-out-of-range';

function isValidSubframe(
    arrayBuffer: ArrayBufferLike,
    segment: Segment,
    subframe: RawSubframe,
): SubframeValidity {
    if (subframe.imgOffset > segment.size)
        return 'img-offset-past-end-of-segment'; // TODO: special segments
    if (subframe.imgOffset + segment.start > arrayBuffer.byteLength)
        return 'img-offset-past-end-of-file';

    if (subframe.width > 512) return 'width-too-big';
    if (subframe.height > 512) return 'height-too-big';
    if (subframe.xOffset > 255 || subframe.xOffset < -256)
        return 'x-offset-out-of-range';
    if (subframe.yOffset > 255 || subframe.yOffset < -256)
        return 'y-offset-out-of-range';

    // palette is optional, so we won't check it here

    // const imgDataValid = isValidImgDataOffset(
    //     arrayBuffer,
    //     segment,
    //     subframe.imgOffset,
    // );
    // if (imgDataValid !== 'valid') return imgDataValid;

    return 'valid';
}

const debugIsValidImgDataOffset = true;

type ImgDataValidity =
    | 'invalid-img-offset'
    | 'img-type-out-of-range'
    | 'img-size-too-big'
    | 'img-size-too-small'
    | 'valid';

function isValidImgDataOffset(
    arrayBuffer: ArrayBufferLike,
    segment: Segment,
    imgOffset: number,
): ImgDataValidity {
    const imgDataFileOffset = segment.start + imgOffset;
    const imgFitsInSegment = imgOffset < segment.size;
    const imgFitsInFile = imgDataFileOffset < arrayBuffer.byteLength;

    if (debugIsValidImgDataOffset) {
        if (!imgFitsInSegment) {
            console.warn(
                'image starts outside of segment! This one may need additional segments loaded (TODO...)',
                { imgOffset },
                segment,
            );
        } else if (!imgFitsInFile) {
            console.warn(
                'image starts past end of file!! )',
                { imgOffset, imgDataFileOffset },
                segment,
            );
        }
    }

    if (!imgFitsInFile || !imgFitsInSegment) return 'invalid-img-offset'; // TODO: handle special segments

    const uint8Array = new Uint8Array(arrayBuffer, imgDataFileOffset);

    const imgInfo = mktN64GetImageInfo(uint8Array);
    if (imgInfo.type > 25) return 'img-type-out-of-range';
    if (imgInfo.size > 512 * 512) return 'img-size-too-big';
    if (imgInfo.size < 4) return 'img-size-too-small';

    return 'valid';
}
