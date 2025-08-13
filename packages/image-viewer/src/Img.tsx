import { memo, useMemo } from 'react';
import type { ImageLibrary } from './useImageLibrary';
import { encodeAsPng } from './toPng';
import CachedPngImg from './CachedPngImg';

export interface ImgProps {
    imageLibrary: ImageLibrary;
    imageIndex: number;
    zoom?: number;
}

const Img = ({ imageLibrary, imageIndex, zoom = 1 }: ImgProps) => {
    const image = imageLibrary?.images[imageIndex];
    const { imageHeader } = image;
    const paletteIndex = imageHeader?.palette;
    const data = useMemo(() => {
        if (paletteIndex !== undefined) {
            return encodeAsPng(imageLibrary, imageIndex, paletteIndex);
        }
        return undefined;
    }, [imageIndex, imageLibrary, paletteIndex]);

    const paddedIndex = imageIndex.toString().padStart(3, '0');
    const urlParts = [
        'images',
        paddedIndex,
        `${paddedIndex}-${imageHeader.name}.png`,
    ];

    if (!data) return null;

    return (
        <CachedPngImg
            data={data}
            urlParts={urlParts}
            name={imageHeader.name}
            zoom={zoom}
            width={imageHeader.xSize}
        />
    );
};

export const MemoImg = memo(Img);

export default MemoImg;
