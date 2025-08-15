import { useCallback } from 'react';
import { useSelection } from './Selection';
import { encodeAsPng } from './toPng';
import type { ImageLibrary } from './useImageLibrary';
import { paletteToRgbArray, type Palettes } from './parse-image-header';
import { encodeSequenceAsGif } from './toGif';

export interface DownloadProps {
    imageLibrary: ImageLibrary;
}
export function Download({ imageLibrary }: DownloadProps) {
    const selection = useSelection();
    const handleClick = useCallback(() => {
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

            const { data } = encodeSequenceAsGif(imageLibrary, sequence);
            downloadFile({
                name: `${sequence.name}.gif`,
                type: 'image/gif',
                data,
            });
        }
    }, [selection, imageLibrary]);

    return (
        <button type="button" onClick={handleClick}>
            Download Selected
        </button>
    );
}

function paletteToAct(palette: Palettes) {
    const data = paletteToRgbArray(palette.paletteHeader, palette.paletteData);
    // const buffer = new Uint8Array(data.length * 3 + 2);
    const buffer = new Uint8Array(256 * 3 + 4);
    data.forEach(([r, g, b], i) => {
        buffer[i * 3] = r;
        buffer[i * 3 + 1] = g;
        buffer[i * 3 + 2] = b;
    });
    buffer[256 * 3] = data.length & 0xff;
    return buffer;
}

function downloadFile({
    name,
    type,
    data,
}: {
    name: string;
    type: string;
    data: BlobPart;
}) {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();

    URL.revokeObjectURL(url);
}
