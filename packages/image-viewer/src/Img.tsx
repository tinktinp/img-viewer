import { memo, useMemo } from 'react';
import CachedPngImg from './CachedPngImg';
import { encodeAsGif } from './toGif';
import { encodeAsPng } from './toPng';
import type { ImageLibrary } from './useImageLibrary';

export type ImageType = 'png' | 'gif';

export interface ImgProps {
    imageLibrary: ImageLibrary;
    imageIndex: number;
    zoom?: number;
    type: ImageType;
}

const typeToMeta = {
    gif: {
        extension: 'gif',
        mimeType: 'image/gif',
    },
    png: {
        extension: 'png',
        mimeType: 'image/png',
    },
} as const;

const Img = ({
    imageLibrary,
    imageIndex,
    zoom = 1,
    type = 'gif',
}: ImgProps) => {
    const image = imageLibrary?.images[imageIndex];
    const { imageHeader } = image;
    const paletteIndex = imageHeader?.palette;
    const data = useMemo(() => {
        if (paletteIndex !== undefined) {
            if (type === 'png')
                return encodeAsPng(imageLibrary, imageIndex, paletteIndex);
            else return encodeAsGif(imageLibrary, imageIndex, paletteIndex);
        }
        return undefined;
    }, [imageIndex, imageLibrary, paletteIndex, type]);

    const paddedIndex = imageIndex.toString().padStart(3, '0');
    const { extension, mimeType } = typeToMeta[type];

    const urlParts = [
        'images',
        paddedIndex,
        `${paddedIndex}-${imageHeader.name}.${extension}`,
    ];

    if (!data) return null;

    return (
        <CachedPngImg
            data={data}
            mimeType={mimeType}
            urlParts={urlParts}
            name={imageHeader.name}
            zoom={zoom}
            width={imageHeader.xSize}
        />
    );
};

export const MemoImg = memo(Img);

export default MemoImg;
