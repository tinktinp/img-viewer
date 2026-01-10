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
import { ErrorBoundary } from 'react-error-boundary';
import {
    type ImageMetaData,
    mktN64ImageDecompressToPng,
} from './asm/filterFiles';
import {
    type MktPcFileNameAndData,
    type MktPcImage,
    type MktPcPalette,
    processMktPcImageFile,
} from './asm/mktPcImageFile';
import CachedPngImg from './CachedPngImg';
import { Checkerboard } from './common-react/Checkerboard';
import { downloadFile, paletteToAct } from './downloadUtils';
import { MktPcDetails } from './MktPcDetails';
import styles from './MktPcImages.module.css';
import {
    addSelection,
    type FancySelectionObj,
    removeSelection,
} from './Selection';
import { useSettings } from './Settings';
import { encodeBufferAndPaletteArrayAsPng } from './toPng';

const dummyPaletteData = [];
for (let j = 0; j < 256; j++) {
    const i = j % 64;
    dummyPaletteData.push(
        ((i << 14) & 0b11_1111) | ((i << 6) & 0b11_1111) | (i & 0b11_1111),
    );
}

export interface MktPcImagesProps {
    selectedFile: MktPcFileNameAndData;
}

export interface MktSelectionObj extends FancySelectionObj {
    image?: MktPcImage;
    palette?: MktPcPalette;
}

function indexFromId(id: string): number {
    return Number.parseInt(id.substring(4), 10);
}

export function MktPcImages({ selectedFile }: MktPcImagesProps) {
    const { name } = selectedFile;
    const { zoom } = useSettings();

    const { images, palettes } = useMemo(
        () => processMktPcImageFile(selectedFile),
        [selectedFile],
    );

    // biome-ignore lint/correctness/useExhaustiveDependencies: special deps
    const selectionMap: Map<string, MktSelectionObj> = useMemo(
        () => new Map(),
        [images, palettes],
    );

    const getFancySelectionObj = useCallback(
        function getFancySelectionObj(id: string): MktSelectionObj {
            const fancySelectionObj = selectionMap.get(id);
            if (fancySelectionObj !== undefined) {
                return fancySelectionObj;
            }
            let newFancySelectionObj: MktSelectionObj;
            newFancySelectionObj = {
                SideBarComponent: () => (
                    <MktPcDetails selectionObj={newFancySelectionObj} />
                ),
                onDownload: function (): void {
                    if (newFancySelectionObj.image) {
                        const { image } = newFancySelectionObj;

                        try {
                            const data = encodeBufferAndPaletteArrayAsPng(
                                image.data,
                                palettes[image.paletteId].rgb,
                                image.width,
                                image.height,
                            );

                            downloadFile({
                                name: `${image.id}.png`,
                                type: 'image/png',
                                data,
                            });
                        } catch (e) {
                            console.log('failed to encode image!', image, e);
                        }
                    } else if (newFancySelectionObj.palette) {
                        const { palette } = newFancySelectionObj;
                        const data = paletteToAct(palette.rgb);
                        downloadFile({
                            name: `${palette.id}.act`,
                            type: 'application/data',
                            data,
                        });
                    }
                },
            };
            selectionMap.set(id, newFancySelectionObj);

            const index = indexFromId(id);
            if (id.startsWith('img-')) {
                newFancySelectionObj.image = images[index];
            } else if (id.startsWith('pal-')) {
                newFancySelectionObj.palette = palettes[index];
            }
            return newFancySelectionObj;
        },
        [selectionMap, images, palettes],
    );

    const handleMktPcChecked: React.MouseEventHandler<HTMLInputElement> =
        useCallback(
            (e) => {
                const id = e.currentTarget.value;
                const fancySelectionObj = getFancySelectionObj(id);

                if (e.currentTarget.checked) {
                    addSelection({ fancySelectionObjs: [fancySelectionObj] });
                } else {
                    removeSelection({
                        fancySelectionObjs: [fancySelectionObj],
                    });
                }
            },
            [getFancySelectionObj],
        );
    return (
        <>
            <div>Images</div>
            <div className={styles.itemsContainer}>
                {images.map((image, idx) => {
                    return (
                        <MktListLibrary
                            name={`#${idx}`}
                            key={`${idx}`}
                            onChecked={handleMktPcChecked}
                            value={`img-${idx}`}
                        >
                            {
                                <MktPcImg
                                    name={`#${idx}`}
                                    image={image}
                                    imageIndex={idx}
                                    palettes={palettes}
                                    zoom={zoom}
                                    filename={selectedFile.name}
                                />
                            }
                        </MktListLibrary>
                    );
                })}
            </div>
            <div>Palettes</div>
            <div className={styles.itemsContainer}>
                {palettes.map((palette, idx) => (
                    <MktListLibrary
                        name={`#${idx} (${palette.paletteSize})`}
                        checkerboard={false}
                        key={`${name}_${idx}`}
                        onChecked={handleMktPcChecked}
                        value={`pal-${idx}`}
                    >
                        {palette.paletteSize > 0 && (
                            <MktPcDrawPalettePng
                                name={`#${idx} (${palette.paletteSize})`}
                                palette={palette}
                                zoom={zoom}
                                urlParts={[
                                    'mktpc',
                                    name,
                                    'palettes',
                                    idx.toString(),
                                ]}
                            />
                        )}
                    </MktListLibrary>
                ))}
            </div>
        </>
    );
}

const MktPcDrawPalettePng = ({
    name,
    palette,
    zoom,
    urlParts,
}: {
    name: string;
    palette: MktPcPalette;
    zoom: number;
    urlParts: string[];
}) => {
    const data = useMemo(() => {
        const imageData = [];
        for (let i = 0; i < palette.paletteSize; i++) {
            imageData[i] = i;
        }
        while (imageData.length % 16 !== 0) imageData.push(0);
        const imageForPalette = new Uint8Array(imageData);

        return encodeBufferAndPaletteArrayAsPng(
            imageForPalette,
            palette.rgb,
            16,
            imageForPalette.byteLength / 16,
        );
    }, [palette]);

    return (
        <CachedPngImg
            data={data}
            urlParts={urlParts}
            name={name}
            zoom={zoom * 8}
            width={16}
            mimeType="image/png"
        />
    );
};

export type ImageType = 'png' | 'gif';

export interface MktImgProps {
    name: string;
    imageIndex: number;
    image: MktPcImage;
    palettes: MktPcPalette[];
    zoom?: number;
    filename: string;
}

const MktPcImg = ({
    name,
    image,
    imageIndex,
    palettes,
    zoom = 1,
    filename,
}: MktImgProps) => {
    const data = useMemo(() => {
        try {
            return encodeBufferAndPaletteArrayAsPng(
                image.data,
                palettes[image.paletteId].rgb,
                image.width,
                image.height,
            );
        } catch (e) {
            console.log('failed to encode image!', name, image, e);
        }
    }, [name, image, palettes]);

    const paddedIndex = imageIndex.toString().padStart(3, '0');
    const { extension, mimeType } = { extension: 'png', mimeType: 'image/png' };

    const urlParts = [
        'images',
        encodeURIComponent(filename),
        paddedIndex,
        'palette',
        image.paletteId.toString(),
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

export function MktListLibrary({
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
