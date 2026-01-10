import { useCallback } from 'react';
import { useSelectionStore } from './Selection';
import { useSettings } from './Settings';
import { encodeSequenceAsGif } from './toGif';
import { encodeAsPng } from './toPng';
import type { ImageLibrary } from './useImageLibrary';
import { downloadFile, paletteToAct } from './downloadUtils';

export interface DownloadProps {
    imageLibrary?: ImageLibrary;
}
export function Download({ imageLibrary }: DownloadProps) {
    const selection = useSelectionStore();
    const { fps, ticksPerFrame } = useSettings();

    const handleImageLibraryClick = useCallback(() => {
        if (!imageLibrary) return;

        for (let i = 0; i < selection.images.length; i++) {
            const imageIndex = selection.images[i];
            const image = imageLibrary.images[imageIndex];
            const paletteIndex = image.imageHeader.palette;
            const data = encodeAsPng(imageLibrary, imageIndex, paletteIndex);
            downloadFile({
                name: `${image.imageHeader.name}.png`,
                type: 'image/png',
                data,
            });
        }

        for (let i = 0; i < selection.palettes.length; i++) {
            const paletteIndex = selection.palettes[i];
            const palette = imageLibrary.palettes[paletteIndex];
            const data = paletteToAct(palette);
            downloadFile({
                name: `${palette.paletteHeader.name}.act`,
                type: 'application/data',
                data,
            });
        }

        for (let i = 0; i < selection.sequences.length; i++) {
            const sequenceIndex = selection.sequences[i];
            const sequence = imageLibrary.sequences[sequenceIndex];

            const { data } = encodeSequenceAsGif(imageLibrary, sequence, {
                fps,
                ticksPerFrame,
            });
            downloadFile({
                name: `${sequence.name}.gif`,
                type: 'image/gif',
                data,
            });
        }

        for (let i = 0; i < selection.scripts.length; i++) {
            const scriptIndex = selection.scripts[i];
            const script = imageLibrary.scripts[scriptIndex];

            const { data } = encodeSequenceAsGif(imageLibrary, script, {
                fps,
                ticksPerFrame,
            });
            downloadFile({
                name: `${script.name}.gif`,
                type: 'image/gif',
                data,
            });
        }
    }, [selection, imageLibrary, fps, ticksPerFrame]);

    const handleSelectionClick = useCallback(() => {
        selection.fancySelectionObjs.forEach((o) => {
            o.onDownload();
        });
    }, [selection]);

    const handleClick = useCallback(() => {
        handleImageLibraryClick();
        handleSelectionClick();
    }, [handleImageLibraryClick, handleSelectionClick]);

    return (
        <button type="button" onClick={handleClick}>
            Download Selected
        </button>
    );
}
