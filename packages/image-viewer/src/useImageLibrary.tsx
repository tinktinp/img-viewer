import { useState, useEffect } from 'react';
import type { Palettes, SequenceScript, Image } from './parse-image-header';
import { parseImageFileHeader, type ImageFileHeader } from './parse-image';
import {
    type ImageHeader,
    parseBufferScriptHeaders,
    parseImageHeader,
    parsePaletteHeader,
    parseSequenceHeaders,
} from './parse-image-header';

export interface ImageLibrary {
    filename: string;
    buffer: ArrayBuffer;
    libraryHeader: ImageFileHeader;
    images: Image[];
    palettes: Palettes[];
    sequences: SequenceScript[];
    scripts: SequenceScript[];
}

export function useImageLibrary(
    imgUrl: string | ArrayBuffer | undefined,
    filename: string,
) {
    const [imageLibrary, setImageLibrary] = useState<ImageLibrary>();

    useEffect(() => {
        if (!imgUrl) return;

        (async function innerUseImageData() {
            let img: ArrayBuffer;
            if (typeof imgUrl === 'string') {
                const imgResp = await fetch(imgUrl);
                img = await imgResp.arrayBuffer();
            } else {
                img = imgUrl;
            }

            const { result: libraryHeader } = parseImageFileHeader(img);
            const imageLibrary: ImageLibrary = {
                filename,
                libraryHeader,
                buffer: img,
                images: [],
                palettes: [],
                sequences: [],
                scripts: [],
            };

            const images: {
                imageHeader: ImageHeader;
                imageData: DataView<ArrayBufferLike>;
            }[] = [];
            imageLibrary.images = images;

            let nextImgOffset = libraryHeader.offset;
            for (let i = 0; i < libraryHeader.imageCount; i++) {
                const {
                    result: imageHeader,
                    imageData,
                    offset: lastImgageOffset,
                } = parseImageHeader(
                    img,
                    //libraryHeader.offset + i * imageHeaderSize,
                    nextImgOffset,
                    libraryHeader,
                );
                nextImgOffset += lastImgageOffset;
                // console.log(imageHeader);
                images.push({ imageHeader, imageData });
            }

            const palettes: Palettes[] = [];
            imageLibrary.palettes = palettes;
            let paletteOffset = nextImgOffset;

            for (let i = 0; i < libraryHeader.paletteCount; i++) {
                const {
                    result: paletteHeader,
                    paletteData,
                    offset,
                } = parsePaletteHeader(img, paletteOffset, libraryHeader);
                // console.log(paletteHeader);
                paletteOffset += offset;
                palettes.push({ paletteHeader, paletteData });
            }

            try {
                const { offset, sequenceScripts: sequences } =
                    parseSequenceHeaders(img, libraryHeader, paletteOffset);
                imageLibrary.sequences = sequences;

                sequences.forEach((ss) => {
                    ss.entries.forEach((e) => {
                        const imageIndex = e.itemIndex;
                        if (imageIndex >= 0 && imageIndex < images.length) {
                            e.image = images[imageIndex];
                        }
                    });
                });

                const { /*offset2,*/ sequenceScripts: scripts } =
                    parseBufferScriptHeaders(img, libraryHeader, offset);

                imageLibrary.scripts = scripts;

                scripts.forEach((ss) => {
                    ss.entries.forEach((e) => {
                        const seqIndex = e.itemIndex;
                        if (seqIndex >= 0 && seqIndex < sequences.length) {
                            e.sequence = sequences[seqIndex];
                        }
                    });
                });
            } catch (e) {
                console.warn(e);
            }

            // Still TODO:
            // - parsePointTables
            // - parseAltPalettes
            // - parseDamageTables

            setImageLibrary(imageLibrary as ImageLibrary);
        })();
    }, [imgUrl, filename]);

    return imageLibrary;
}
