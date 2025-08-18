import { useMemo } from 'react';
import { imageAndPaletteToImageData } from './parse-image-header';
import type { ImageLibrary } from './useImageLibrary';

export function useImageData(
    imageLibrary: ImageLibrary | undefined,
    imageIndex: number,
): ImageData {
    return useMemo(() => {
        if (
            !(
                imageLibrary?.images[imageIndex] &&
                imageLibrary.palettes[
                    imageLibrary.images[imageIndex].imageHeader.palette
                ]
            )
        )
            return new ImageData(1, 1);

        const { imageHeader, imageData } = imageLibrary.images[imageIndex];
        const { paletteHeader, paletteData } =
            imageLibrary.palettes[imageHeader.palette];

        const canvasImageData = imageAndPaletteToImageData(
            imageHeader,
            imageData,
            paletteHeader,
            paletteData,
        );

        return canvasImageData;
    }, [imageIndex, imageLibrary]);
}
