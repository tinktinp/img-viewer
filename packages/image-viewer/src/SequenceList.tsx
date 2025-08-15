import { useCallback } from 'react';
import { Checkerboard } from './Checkerboard';
import type { ImageLibrary } from './useImageLibrary';
import { useSettings } from './Settings';
import { useSelection } from './Selection';
import { ErrorBoundary } from 'react-error-boundary';

import styles from './ImageLibrary.module.css';
import Sequence from './Sequence';
import GifSequence from './GifSequence';

export interface ImageLibraryProps {
    imageLibrary: ImageLibrary;
}

export function SequenceListLibrary({ imageLibrary }: ImageLibraryProps) {
    const { zoom, animation } = useSettings();
    const { addSelection, removeSelection } = useSelection();

    const handleChecked: React.MouseEventHandler<HTMLInputElement> =
        useCallback(
            (e) => {
                const sequenceIndex = Number.parseInt(e.currentTarget.value);
                if (e.currentTarget.checked) {
                    addSelection({ sequences: [sequenceIndex] });
                } else {
                    removeSelection({ sequences: [sequenceIndex] });
                }
            },
            [addSelection, removeSelection],
        );

    return imageLibrary.sequences.map((sequence, i) => {
        return (
            <label className={styles.imageCell} key={`${i}_${sequence.name}`}>
                <input
                    style={{ justifySelf: 'right' }}
                    type="checkbox"
                    onClick={handleChecked}
                    value={i}
                />
                <Checkerboard>
                    <ErrorBoundary fallbackRender={() => 'Error'}>
                        {animation && (
                            <GifSequence
                                imageLibrary={imageLibrary}
                                sequenceIndex={i}
                                zoom={zoom}
                            />
                        )}
                        {!animation && (
                            <Sequence
                                imageLibrary={imageLibrary}
                                sequenceIndex={i}
                                zoom={zoom}
                            />
                        )}
                    </ErrorBoundary>
                </Checkerboard>

                <div>{sequence.name}</div>
            </label>
        );
    });
}
