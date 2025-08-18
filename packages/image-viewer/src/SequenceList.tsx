import { useCallback } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Checkerboard } from './Checkerboard';
import GifSequence from './GifSequence';
import styles from './ImageLibrary.module.css';
import { useSelection } from './Selection';
import Sequence from './Sequence';
import { useSettings } from './Settings';
import type { ImageLibrary } from './useImageLibrary';

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
