/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
/** biome-ignore-all lint/complexity/useArrowFunction: <explanation> */
import {
    Fragment,
    useImperativeHandle,
    useMemo,
    type MouseEventHandler,
    type ReactNode,
    type Ref,
} from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import CachedPngImg from '../../CachedPngImg';
import { Checkerboard } from '../../common-react/Checkerboard';
import { useSettings } from '../../Settings';
import { encodeRgba32AsPng } from '../../toPng';
import { processMklkSpriteFile } from '../data/processMklkSpriteFile';
import type { MklkImage, SpriteHeader, UploadedFile } from '../MklkTypes';
import styles from './MklkImages.module.css';
import { useMklkHandleSelection } from './useMklkHandleSelection';

interface MklkImagesProps {
    selectedFile: UploadedFile;
}

export type MklkRef = ReturnType<typeof processMklkSpriteFile> & {
    filename: string;
};

export function MklkImages({
    selectedFile,
    ref,
}: MklkImagesProps & { ref: Ref<MklkRef> }) {
    const { name } = selectedFile;
    const { zoom } = useSettings();

    const { images, fileHeader, spriteSection } = useMemo(
        () => processMklkSpriteFile(selectedFile),
        [selectedFile],
    );

    useImperativeHandle(ref, () => {
        return {
            filename: name,
            fileHeader,
            images,
            spriteSection,
        };
    }, [fileHeader, images, name, spriteSection]);

    const { spriteSectionHeader, sprites } = spriteSection;

    // console.log({ spriteSectionHeader, sprites });

    const handleMklkChecked = useMklkHandleSelection(images, sprites);

    return (
        <>
            <div>Sprites</div>
            <div className={styles.itemsContainer}>
                {sprites.map((sprite, idx) => {
                    return (
                        <MklkListLibrary
                            name={`#${idx}`}
                            key={`${idx}`}
                            onChecked={handleMklkChecked}
                            value={`sprite-${idx}`}
                        >
                            {
                                <MklkSprite
                                    name={`#${idx}`}
                                    spriteIndex={idx}
                                    spriteHeader={sprite}
                                    zoom={zoom}
                                    filename={selectedFile.name}
                                />
                            }
                        </MklkListLibrary>
                    );
                })}
            </div>

            <div>Images / Sprite Sheets</div>
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

export interface MklkSpriteProps {
    name: string;
    spriteIndex: number;
    spriteHeader: SpriteHeader;
    zoom?: number;
    filename: string;
}

const MklkSprite = ({
    name,
    spriteIndex,
    spriteHeader,
    zoom = 1,
    filename,
}: MklkSpriteProps) => {
    const data = useMemo(() => {
        try {
            if (spriteHeader.data)
                return encodeRgba32AsPng(
                    spriteHeader.data,
                    spriteHeader.width,
                    spriteHeader.height,
                );
        } catch (e) {
            console.log('failed to encode image!', name, spriteHeader, e);
        }
    }, [name, spriteHeader]);

    const paddedIndex = spriteIndex.toString().padStart(3, '0');
    const { extension, mimeType } = { extension: 'png', mimeType: 'image/png' };

    const urlParts = [
        'sprites',
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
            width={spriteHeader.width}
        />
    );
};

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
            if (image.data)
                return encodeRgba32AsPng(image.data, image.width, image.height);
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
