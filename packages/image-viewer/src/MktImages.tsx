/** biome-ignore-all lint/complexity/useArrowFunction: <explanation> */
import {
    Fragment,
    useCallback,
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
    type MktN64Dict,
} from './asm/filterFiles';
import styles from './MktImages.module.css';
import { encodeBuffersAsPng } from './toPng';
import CachedPngImg from './CachedPngImg';
import { Checkerboard } from './Checkerboard';
import { ErrorBoundary } from 'react-error-boundary';
import { useSettings } from './Settings';
import { useSelection, type FancySelectionObj } from './Selection';
import type { LiteralDataEntry } from './asm/parser';
import { downloadFile, paletteToAct } from './downloadUtils';
import { paletteBufferToRgbArray } from './parse-image-header';
import { MktN64Details } from './MktN64Details';

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

export interface MktN64SelectionObj extends FancySelectionObj {
    image?: {
        index: number | string;
        label: string;
        meta: ImageMetaData | undefined;
        imageData: ArrayBuffer;
        dict?: MktN64Dict;
    };
    palette?: LiteralDataEntry;
    paletteData: ArrayBuffer;
    paletteFormat: string;
}

function indexFromId(id: string): { index: number; fileIndex: number } {
    if (id.startsWith('img-')) {
        return { index: Number.parseInt(id.substring(4), 10), fileIndex: -1 };
    }
    const pieces = id.split('-');
    return {
        index: Number.parseInt(pieces[1], 10),
        fileIndex: Number.parseInt(pieces[3], 10),
    };
}

function useHandleSelection(
    images: LiteralDataEntry[],
    metaMap: Map<string, ImageMetaData>,
    paletteFiles: { name: string; palettes: LiteralDataEntry[] }[],
    paletteToUse: LiteralDataEntry,
    paletteFormat: string,
    dict: MktN64Dict | undefined,
) {
    // biome-ignore lint/correctness/useExhaustiveDependencies: special deps
    const selectionMap: Map<string, MktN64SelectionObj> = useMemo(
        () => new Map(),
        [images, dict, paletteToUse, paletteFormat],
    );

    const { addSelection, removeSelection } = useSelection();

    const getFancySelectionObj = useCallback(
        function getFancySelectionObj(id: string): MktN64SelectionObj {
            const fancySelectionObj = selectionMap.get(id);
            if (fancySelectionObj !== undefined) {
                return fancySelectionObj;
            }
            let newFancySelectionObj: MktN64SelectionObj;
            newFancySelectionObj = {
                paletteData: paletteToUse.data,
                paletteFormat,
                SideBarComponent: () => (
                    <MktN64Details selectionObj={newFancySelectionObj} />
                ),
                onDownload: function (): void {
                    if (newFancySelectionObj.image) {
                        const {
                            image: { index, label, meta, imageData, dict },
                            paletteFormat,
                            paletteData,
                        } = newFancySelectionObj;

                        try {
                            const data = imageToPng(
                                meta,
                                imageData,
                                paletteData,
                                paletteFormat,
                                dict?.data,
                            );

                            downloadFile({
                                name: `${index}_${label}.png`,
                                type: 'image/png',
                                data,
                            });
                        } catch (e) {
                            console.log('failed to encode image!', meta, e);
                        }
                    } else if (newFancySelectionObj.palette) {
                        const { palette, paletteData, paletteFormat } =
                            newFancySelectionObj;
                        const paletteDataView = new DataView(paletteData);
                        const rgb = paletteBufferToRgbArray(
                            paletteDataView,
                            paletteDataView.byteLength / 2,
                            0,
                            paletteFormat,
                        );
                        const data = paletteToAct(rgb);
                        downloadFile({
                            name: `${palette.label}.act`,
                            type: 'application/data',
                            data,
                        });
                    }
                },
            };
            selectionMap.set(id, newFancySelectionObj);

            const { index, fileIndex } = indexFromId(id);
            if (id.startsWith('img-')) {
                const { label, data: imageData } = images[index];
                const meta = metaMap.get(label);

                newFancySelectionObj.image = {
                    index,
                    label,
                    meta,
                    imageData,
                    dict,
                };
            } else if (id.startsWith('pal-')) {
                newFancySelectionObj.palette =
                    paletteFiles[fileIndex].palettes[index];
            }
            return newFancySelectionObj;
        },
        [
            selectionMap,
            images,
            metaMap,
            paletteFiles,
            paletteToUse,
            paletteFormat,
            dict,
        ],
    );

    const handleMktN64Checked: React.MouseEventHandler<HTMLInputElement> =
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
            [addSelection, removeSelection, getFancySelectionObj],
        );

    return handleMktN64Checked;
}

export interface MktImagesProps {
    selectedFile: FileNameAndData;
    mktFiles: CategorizedFiles;
}
export function MktImages({ selectedFile, mktFiles }: MktImagesProps) {
    let { zoom, mktPalette, mktPaletteFormat, mktDictIndex, setSettings } =
        useSettings();

    // const imageFilename = selectedFile.name;
    const { images, metaMap, paletteFiles, dicts } = useMemo(
        () => ({
            images: processImageFile(selectedFile),
            metaMap: extractImageMetaDataFromAtds(
                filterFilesByDirectory(selectedFile, mktFiles.animation),
            ),
            paletteFiles: processPaletteFiles(
                filterFilesByDirectory(selectedFile, mktFiles.palette),
            ),
            // dict: processDictionary(
            //     filterFilesByDirectory(selectedFile, mktFiles.dict)[0],
            // ),
            dicts: filterFilesByDirectory(selectedFile, mktFiles.dict)
                .map((f) => processDictionary(f))
                .filter((d) => d !== undefined),
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
            mktDicts: dicts,
        });
    }, [paletteFiles]);

    const paletteToUse =
        paletteFiles[mktPalette[0]]?.palettes[mktPalette[1]] ??
        paletteFiles[0]?.palettes[0];

    if (!(mktDictIndex in dicts)) {
        mktDictIndex = 0;
    }
    const dict = dicts[mktDictIndex];

    const handleChecked = useHandleSelection(
        images,
        metaMap,
        paletteFiles,
        paletteToUse,
        mktPaletteFormat,
        dict,
    );

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
                        // TODO: show number of colors, to help with palette matching
                        <MktListLibrary
                            name={`${image.label}`}
                            key={`${idx}_${image.label}`}
                            onChecked={handleChecked}
                            value={`img-${idx}`}
                        >
                            {
                                <MktImg
                                    name={image.label}
                                    imageData={image.data}
                                    dict={dict?.data}
                                    mktDictIndex={mktDictIndex}
                                    meta={meta}
                                    palette={paletteToUse.data}
                                    paletteFormat={mktPaletteFormat}
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
            {paletteFiles.map((paletteFile, fileIdx) => (
                <Fragment key={paletteFile.name}>
                    <div>File: {paletteFile.name}</div>
                    <div className={styles.itemsContainer}>
                        {paletteFile.palettes.map((palette, idx) => (
                            <MktListLibrary
                                name={`${palette.label} (${palette.data.byteLength / 2})`}
                                checkerboard={false}
                                key={`${idx}_${palette.label}`}
                                onChecked={handleChecked}
                                value={`pal-${idx}-file-${fileIdx}`}
                            >
                                {palette.data.byteLength > 0 && (
                                    <MktDrawPalettePng
                                        name={palette.label}
                                        palette={palette.data}
                                        paletteFormat={mktPaletteFormat}
                                        zoom={zoom}
                                        urlParts={[
                                            'mkt',
                                            'palette-file',
                                            paletteFile.name,
                                            'palettes',
                                            mktPaletteFormat,
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
    paletteFormat,
    zoom,
    urlParts,
}: {
    name: string;
    palette: ArrayBuffer;
    zoom: number;
    urlParts: string[];
    paletteFormat: string;
}) => {
    const data = useMemo(() => {
        const paletteCopy = palette.slice();
        const imageData = [];
        for (let i = 0; i < paletteCopy.byteLength / 2; i++) {
            imageData[i] = i;
        }
        while (imageData.length % 16 !== 0) imageData.push(0);
        const imageForPalette = new Uint8Array(imageData);

        return encodeBuffersAsPng(
            imageForPalette,
            new Uint8Array(paletteCopy),
            paletteFormat,
            16,
            imageForPalette.byteLength / 16,
        );
    }, [palette, paletteFormat]);

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
    paletteFormat: string;
    dict?: ArrayBuffer;
    mktDictIndex: number;
    meta?: ImageMetaData;
    zoom?: number;
    filename: string;
}

const MktImg = ({
    name,
    imageData,
    meta,
    dict,
    mktDictIndex,
    palette,
    paletteIndex,
    paletteFormat,
    zoom = 1,
    filename,
}: MktImgProps) => {
    const data = useMemo(() => {
        try {
            return imageToPng(meta, imageData, palette, paletteFormat, dict);
        } catch (e) {
            console.log('failed to encode image!', name, meta, e);
        }
    }, [name, meta, imageData, palette, paletteFormat, dict]);

    const paddedIndex = '0'.padStart(3, '0');
    const { extension, mimeType } = { extension: 'png', mimeType: 'image/png' };

    const urlParts = [
        'images',
        encodeURIComponent(filename),
        paddedIndex,
        paletteIndex[0].toString(),
        paletteIndex[1].toString(),
        paletteFormat,
        mktDictIndex.toString(),
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
