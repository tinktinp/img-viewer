/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
/** biome-ignore-all lint/complexity/useArrowFunction: <explanation> */
import {
    Fragment,
    useCallback,
    useEffect,
    useMemo,
    type MouseEventHandler,
    type ReactNode,
} from 'react';
import styles from './MklkImages.module.css';
import CachedPngImg from '../../CachedPngImg';
import { Checkerboard } from '../../Checkerboard';
import { ErrorBoundary } from 'react-error-boundary';
import { useSettings } from '../../Settings';
import { useSelection } from '../../Selection';

import { downloadFile, paletteToAct } from '../../downloadUtils';

import { MklkDetails } from './MklkDetails';
import type { MklkImage, MklkSelectionObj } from '../MklkTypes';
import { processMklkSpriteFile } from '../data/processMklkSpriteFile';
import { encodeRgba32AsPng } from '../../toPng';
import { useMklkHandleSelection } from './useMklkHandleSelection';

interface MklkImagesProps {
    selectedFile: {
        name: string;
    };
}


export function MklkImages({ selectedFile }: MklkImagesProps) {
    const { name } = selectedFile;
    const { zoom } = useSettings();

    const { images } = useMemo(
        () => processMklkSpriteFile(selectedFile),
        [selectedFile],
    );

    const handleMklkChecked = useMklkHandleSelection(images);

    return (
        <>
            <div>Images</div>
            <div className={styles.itemsContainer}>
                {images.map((image, idx) => {
                    return (
                        <MklkListLibrary
                            name={`#${idx}`}
                            key={`${idx}`}
                            onChecked={handleMklkChecked}
                            value={`img-${idx}`}
                        >
                            {
                                <MklkImg
                                    name={`#${idx}`}
                                    image={image}
                                    imageIndex={idx}
                                    zoom={zoom}
                                    filename={selectedFile.name}
                                />
                            }
                        </MklkListLibrary>
                    );
                })}
            </div>
        </>
    );
}

export type ImageType = 'png' | 'gif';

export interface MklkImgProps {
    name: string;
    imageIndex: number;
    image: MklkImage;
    zoom?: number;
    filename: string;
}

const MklkImg = ({
    name,
    image,
    imageIndex,
    zoom = 1,
    filename,
}: MklkImgProps) => {
    const data = useMemo(() => {
        try {
            return encodeRgba32AsPng(
                image.data,
                image.width,
                image.height,
            );
        } catch (e) {
            console.log('failed to encode image!', name, image, e);
        }
    }, [name, image]);

    const paddedIndex = imageIndex.toString().padStart(3, '0');
    const { extension, mimeType } = { extension: 'png', mimeType: 'image/png' };

    const urlParts = [
        'images',
        encodeURIComponent(filename),
        paddedIndex,
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
            width={image.width}
        />
    );
};

export function MklkListLibrary({
    name,
    children,
    onChecked,
    value,
    checkerboard = true,
}: {
    name: string;
    children?: ReactNode;
    onChecked?: MouseEventHandler<HTMLInputElement>;
    value?: string;
    checkerboard?: boolean;
}) {
    const MaybeCheckerboard = checkerboard ? Checkerboard : Fragment;
    return (
        <label className={styles.imageCell}>
            <input
                style={{ justifySelf: 'right' }}
                type="checkbox"
                onClick={onChecked}
                value={value}
            />
            <MaybeCheckerboard>
                <ErrorBoundary fallbackRender={() => 'Error'}>
                    {children}
                </ErrorBoundary>
            </MaybeCheckerboard>

            <div>{name}</div>
        </label>
    );
}
