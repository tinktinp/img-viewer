import { useCallback } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Checkerboard } from './Checkerboard';
import GifSequence from './GifSequence';
import styles from './ImageLibrary.module.css';
import { useSelection } from './Selection';
import { useSettings } from './Settings';
import type { ImageLibrary } from './useImageLibrary';

export interface ImageLibraryProps {
    imageLibrary: ImageLibrary;
}

export function ScriptListLibrary({ imageLibrary }: ImageLibraryProps) {
    const { zoom, animation } = useSettings();
    const { addSelection, removeSelection } = useSelection();

    const handleChecked: React.MouseEventHandler<HTMLInputElement> =
        useCallback(
            (e) => {
                const scriptIndex = Number.parseInt(e.currentTarget.value);
                if (e.currentTarget.checked) {
                    addSelection({ scripts: [scriptIndex] });
                } else {
                    removeSelection({ scripts: [scriptIndex] });
                }
            },
            [addSelection, removeSelection],
        );

    return imageLibrary.scripts.map((script, i) => {
        return (
            <label className={styles.imageCell} key={`${i}_${script.name}`}>
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
                                script
                                zoom={zoom}
                            />
                        )}
                        {/* {!animation && (
                            <Sequence
                                imageLibrary={imageLibrary}
                                sequenceIndex={i}
                                script
                                zoom={zoom}
                            />
                        )} */}
                    </ErrorBoundary>
                </Checkerboard>

                <div>{script.name}</div>
            </label>
        );
    });
}
