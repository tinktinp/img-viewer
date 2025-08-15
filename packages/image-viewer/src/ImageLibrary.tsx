import { useCallback } from 'react';
import { Checkerboard } from './Checkerboard';
import type { ImageLibrary } from './useImageLibrary';
import Img from './Img';
import { useSettings } from './Settings';
import { useSelection } from './Selection';
import { ErrorBoundary } from 'react-error-boundary';

import styles from './ImageLibrary.module.css';

export interface ImageLibraryProps {
    imageLibrary: ImageLibrary;
}

// biome-ignore lint/suspicious/noRedeclare: component and object have the same name
export function ImageLibrary({ imageLibrary }: ImageLibraryProps) {
    const { zoom } = useSettings();
    const { addSelection, removeSelection } = useSelection();

    const handleChecked: React.MouseEventHandler<HTMLInputElement> =
        useCallback(
            (e) => {
                const imageIndex = Number.parseInt(e.currentTarget.value);
                if (e.currentTarget.checked) {
                    addSelection({ images: [imageIndex] });
                } else {
                    removeSelection({ images: [imageIndex] });
                }
            },
            [addSelection, removeSelection],
        );

    return imageLibrary.images.map((image, i) => {
        return (
            <label
                className={styles.imageCell}
                key={`${i}_${image.imageHeader.name}`}
            >
                <input
                    style={{ justifySelf: 'right' }}
                    type="checkbox"
                    onClick={handleChecked}
                    value={i}
                />
                <Checkerboard>
                    <ErrorBoundary fallbackRender={() => 'Error'}>
                        <Img
                            imageLibrary={imageLibrary}
                            imageIndex={i}
                            zoom={zoom}
                            type={'png'}
                        />
                    </ErrorBoundary>
                </Checkerboard>

                <div>{image.imageHeader.name}</div>
            </label>
        );
    });
}
