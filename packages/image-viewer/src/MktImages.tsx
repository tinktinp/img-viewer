import {
    Fragment,
    useEffect,
    useMemo,
    type MouseEventHandler,
    type ReactNode,
} from 'react';
import {
    extractImageMetaDataFromAtds,
    filterFilesByDirectory,
    guessMetaData,
    imageToPng,
    processDictionary,
    processImageFile,
    processPaletteFiles,
    type CategorizedFiles,
    type FileNameAndData,
    type ImageMetaData,
} from './asm/filterFiles';
import styles from './MktImages.module.css';
import { encodeBuffersAsPng } from './toPng';
import CachedPngImg from './CachedPngImg';
import { Checkerboard } from './Checkerboard';
import { ErrorBoundary } from 'react-error-boundary';
import { useSettings } from './Settings';
import { useSelection } from './Selection';
import type { LiteralDataEntry } from './asm/parser';

const dummyPaletteData = [];
for (let j = 0; j < 256; j++) {
    const i = j % 64;
    dummyPaletteData.push(
        ((i << 14) & 0b11_1111) | ((i << 6) & 0b11_1111) | (i & 0b11_1111),
    );
}

const dummyPalette: LiteralDataEntry = {
    kind: 'literal',
    comment:
        'Dummy palette! Added by ImgViewer and not present in the files being explored!',
    label: 'imgview_dummy_palette',
    data: new Uint16Array(dummyPaletteData).buffer,
};

export interface MktImagesProps {
    selectedFile: FileNameAndData;
    mktFiles: CategorizedFiles;
}
export function MktImages({ selectedFile, mktFiles }: MktImagesProps) {
    const { zoom, mktPalette, setSettings } = useSettings();

    // const imageFilename = selectedFile.name;
    const { images, metaMap, paletteFiles, dict } = useMemo(
        () => ({
            images: processImageFile(selectedFile),
            metaMap: extractImageMetaDataFromAtds(
                filterFilesByDirectory(selectedFile, mktFiles.animation),
            ),
            paletteFiles: processPaletteFiles(
                filterFilesByDirectory(selectedFile, mktFiles.palette),
            ),
            dict: processDictionary(
                filterFilesByDirectory(selectedFile, mktFiles.dict)[0],
            ),
        }),
        [selectedFile, mktFiles],
    );
    if (paletteFiles.length === 0) {
        paletteFiles.push({
            name: 'imgview_dummy_palette',
            palettes: [dummyPalette],
        });
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: setSettings is stable
    useEffect(() => {
        console.log('setting mktPalettes');
        setSettings({
            mktPalettes: paletteFiles,
        });
    }, [paletteFiles]);

    const paletteToUse =
        paletteFiles[mktPalette[0]]?.palettes[mktPalette[1]] ??
        paletteFiles[0]?.palettes[0];

    return (
        <>
            {paletteToUse === dummyPalette && (
                <div>No palettes found! Using dummy palette.</div>
            )}
            <div>Images</div>
            <div className={styles.itemsContainer}>
                {images.map((image, idx) => {
                    const meta = metaMap.get(image.label);
                    return (
                        <MktListLibrary
                            name={image.label}
                            key={`${idx}_${image.label}`}
                        >
                            {
                                <MktImg
                                    name={image.label}
                                    imageData={image.data}
                                    dict={dict?.data}
                                    meta={meta}
                                    palette={paletteToUse.data}
                                    paletteIndex={mktPalette}
                                    zoom={zoom}
                                    filename={selectedFile.name}
                                />
                            }
                            {!meta && (
                                <div style={{ backgroundColor: 'white' }}>
                                    No metadata found!
                                </div>
                            )}
                        </MktListLibrary>
                    );
                })}
            </div>
            <div>Palettes</div>
            {paletteFiles.map((paletteFile) => (
                <Fragment key={paletteFile.name}>
                    <div>File: {paletteFile.name}</div>
                    <div className={styles.itemsContainer}>
                        {paletteFile.palettes.map((palette, idx) => (
                            <MktListLibrary
                                name={palette.label}
                                checkerboard={false}
                                key={`${idx}_${palette.label}`}
                            >
                                {palette.data.byteLength > 0 && (
                                    <MktDrawPalettePng
                                        name={palette.label}
                                        palette={palette.data}
                                        zoom={zoom}
                                        urlParts={[
                                            'mkt',
                                            'palettes',
                                            idx.toString(),
                                            palette.label,
                                        ]}
                                    />
                                )}
                            </MktListLibrary>
                        ))}
                    </div>
                </Fragment>
            ))}
        </>
    );
}

const MktDrawPalettePng = ({
    name,
    palette,
    zoom,
    urlParts,
}: {
    name: string;
    palette: ArrayBuffer;
    zoom: number;
    urlParts: string[];
}) => {
    const data = useMemo(() => {
        const imageData = [];
        for (let i = 0; i < palette.byteLength / 2; i++) {
            imageData[i] = i;
        }
        while (imageData.length % 16 !== 0) imageData.push(0);
        const imageForPalette = new Uint8Array(imageData);

        return encodeBuffersAsPng(
            imageForPalette,
            new Uint8Array(palette).reverse(),
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
    imageData: ArrayBuffer;
    palette: ArrayBuffer;
    paletteIndex: [number, number];
    dict?: ArrayBuffer;
    meta?: ImageMetaData;
    zoom?: number;
    filename: string;
}

const MktImg = ({
    name,
    imageData,
    meta,
    dict,
    palette,
    paletteIndex,
    zoom = 1,
    filename,
}: MktImgProps) => {
    const data = useMemo(() => {
        try {
            return imageToPng(meta, imageData, palette, dict);
        } catch (e) {
            console.log('failed to encode image!', name, meta, e);
        }
    }, [name, meta, imageData, palette, dict]);

    const paddedIndex = '0'.padStart(3, '0');
    const { extension, mimeType } = { extension: 'png', mimeType: 'image/png' };

    const urlParts = [
        'images',
        encodeURIComponent(filename),
        paddedIndex,
        paletteIndex[0].toString(),
        paletteIndex[1].toString(),
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
            width={meta?.width || 150}
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
