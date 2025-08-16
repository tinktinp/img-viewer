import { memo, useEffect, useMemo, useRef } from 'react';
import type { ImageLibrary } from './useImageLibrary';

import Img from './Img';

import styles from './Sequence.module.css';
import type { SequenceScript } from './parse-image-header';
import { useSettings } from './Settings';
import { encodeSequenceAsGif } from './toGif';
import CachedPngImg from './CachedPngImg';

export interface ImgProps {
    imageLibrary: ImageLibrary;
    sequenceIndex: number;
    zoom?: number;
    script?: boolean;
}

const GifSequence = ({
    imageLibrary,
    sequenceIndex,
    zoom = 1,
    script = false,
}: ImgProps) => {
    const { fps, ticksPerFrame } = useSettings();
    // const ref = useRef<HTMLDivElement>(null);
    const sequence = script
        ? imageLibrary.scripts[sequenceIndex]
        : imageLibrary.sequences[sequenceIndex];
    const name = sequence.name;
    const { data, width } = useMemo(
        () =>
            encodeSequenceAsGif(imageLibrary, sequence, { fps, ticksPerFrame }),
        [imageLibrary, sequence, fps, ticksPerFrame],
    );

    const paddedIndex = sequenceIndex.toString().padStart(3, '0');
    const { extension, mimeType } = { extension: 'gif', mimeType: 'image/gif' };

    const urlParts = [
        imageLibrary.filename,
        script ? 'scripts' : 'sequences',
        paddedIndex,
        `${fps}-${ticksPerFrame}`,
        `${paddedIndex}-${name}.${extension}`,
    ];

    if (!data) return null;

    return (
        <CachedPngImg
            data={data}
            mimeType={mimeType}
            urlParts={urlParts}
            name={name}
            zoom={zoom}
            width={width}
        />
    );
};

export const MemoSequence = memo(GifSequence);

export default MemoSequence;
