/** biome-ignore-all lint/complexity/useArrowFunction: <explanation> */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: <explanation> */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <explanation> */
import {
    Fragment,
    type MouseEventHandler,
    memo,
    type ReactNode,
    useDeferredValue,
    useEffect,
    useMemo,
    useState,
    type Ref,
} from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import {
    // mktN64ProcessImageFile,
    type CategorizedFiles,
    type FileNameAndData,
    // extractImageMetaDataFromAtds,
    filterFilesByDirectory,
    type ImageMetaData,
    isStaticPaletteFile,
    type MktN64Dict,
    processDictionary,
} from '../asm/filterFiles';
import type { LiteralDataEntry } from '../asm/parser';
import CachedPngImg from '../CachedPngImg';
import type { UrlParams } from '../cacheFiles';
import { Checkerboard } from '../common-react/Checkerboard';
import { Loading } from '../common-react/Loading';
import {
    extractImageMetaDataFromAtds,
    extractImageMetaDataFromAtdsMulti,
    mktN64ImageDecompressToPng,
    mktN64PaletteToPng,
    mktN64ProcessImageFile,
} from '../consume-worker';
import { useSettingsOpt } from '../Settings';
import { cachedMktN64ProcessPaletteFiles } from '../utils/cacheResult';
import { useLoadingTracker, WithPromise } from '../WithPromise';
import { ZoomCssProvider } from '../ZoomCssProvider';
import styles from './MktImages.module.css';
import { chooseMeta, type MetaMultiMap } from './mkt-n64-utils';
import { useMktN64HandleSelection } from './useMktN64HandleSelection';

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
    asmLines: [],
};

export interface MktN64ImagesProps {
    selectedFile: FileNameAndData;
    mktFiles: CategorizedFiles;
}
export function MktN64Images({ selectedFile, mktFiles }: MktN64ImagesProps) {
    let {
        mktPalette,
        mktPaletteFormat,
        mktDictIndex,
        autoPalette,
        setSettings,
    } = useSettingsOpt(
        'mktPalette',
        'mktPaletteFormat',
        'mktDictIndex',
        'autoPalette',
        'setSettings',
    );

    // const imageFilename = selectedFile.name;
    const {
        images,
        metaMap,
        metaMultiMap,
        paletteFiles,
        dicts,
        isLoading,
        staticPaletteFiles,
        nonstaticPaletteFiles,
    } = useProcessedFiles(selectedFile, mktFiles);

    if (paletteFiles.length === 0) {
        paletteFiles.push({
            name: 'imgview_dummy_palette',
            palettes: [dummyPalette],
            hash: 'dummy',
        });
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: setSettings is stable
    useEffect(() => {
        console.log('setting mktPalettes');
        setSettings({
            mktPalettes: paletteFiles,
            mktDicts: dicts as MktN64Dict[],
        });
    }, [paletteFiles]);

    const paletteToUse =
        paletteFiles[mktPalette[0]]?.palettes[mktPalette[1]] ??
        paletteFiles[0]?.palettes[0];

    if (!(mktDictIndex in dicts)) {
        mktDictIndex = 0;
    }
    const dict = dicts[mktDictIndex];

    const handleChecked = useMktN64HandleSelection(images, metaMap);

    return (
        <>
            {paletteToUse === dummyPalette && (
                <div>No palettes found! Using dummy palette.</div>
            )}

            {!!isLoading && <>Loading...</>}
            {!isLoading && (
                <MktN64AllImages
                    images={images}
                    dict={dict}
                    autoPalette={autoPalette}
                    handleChecked={handleChecked}
                    mktPaletteFormat={mktPaletteFormat}
                    paletteFiles={paletteFiles}
                    mktDictIndex={mktDictIndex}
                    paletteToUse={paletteToUse}
                    metaMultiMap={metaMultiMap}
                    mktPalette={mktPalette}
                    selectedFile={selectedFile}
                />
            )}

            <div>Palettes</div>

            <div onClick={handleChecked} className={styles.palettesWrapper}>
                <MktN64AllPalettes
                    paletteFiles={nonstaticPaletteFiles}
                    mktPaletteFormat={mktPaletteFormat}
                />

                <MktN64AllPalettes
                    paletteFiles={staticPaletteFiles}
                    mktPaletteFormat={mktPaletteFormat}
                />
            </div>
        </>
    );
}

interface MktN64AllImagesProps {
    //
    images: LiteralDataEntry[];
    handleChecked: MouseEventHandler<HTMLInputElement>;
    paletteFiles: {
        name: string;
        palettes: LiteralDataEntry[];
    }[];
    mktPaletteFormat: string;
    dict: LiteralDataEntry;
    mktDictIndex: number;
    autoPalette: boolean;
    paletteToUse: LiteralDataEntry;
    metaMultiMap: MetaMultiMap;
    mktPalette: [number, number];
    selectedFile: FileNameAndData;
}
function MktN64AllImages(props: MktN64AllImagesProps) {
    const {
        images,
        paletteFiles,
        autoPalette,
        paletteToUse,
        metaMultiMap,
        handleChecked,
        dict,
        mktDictIndex,
        mktPaletteFormat,
        mktPalette,
        selectedFile,
    } = props;
    return (
        <>
            <div>Images</div>
            <ZoomCssProvider className={styles.itemsContainer}>
                {images.map((image, idx) => {
                    const meta = chooseMeta(metaMultiMap, image); // TODO: check all metas for a palette name in the chosen one does not have it
                    const palette = findPalette(
                        paletteFiles,
                        autoPalette ? meta?.paletteName : undefined,
                        paletteToUse,
                    );
                    return (
                        <MktN64ImgGridCell
                            key={`${idx}_${image.label}`}
                            metaMultiMap={metaMultiMap}
                            image={image}
                            palette={palette}
                            idx={idx}
                            handleChecked={handleChecked}
                            dict={dict}
                            mktDictIndex={mktDictIndex}
                            mktPaletteFormat={mktPaletteFormat}
                            mktPalette={mktPalette}
                            selectedFile={selectedFile}
                        />
                    );
                })}
            </ZoomCssProvider>
        </>
    );
}

interface MktN64AllPalettesProps {
    paletteFiles: {
        name: string;
        hash: string;
        palettes: LiteralDataEntry[];
    }[];
    mktPaletteFormat: string;
}
const MktN64AllPalettes = memo(
    function MktN64AllPalettes({
        paletteFiles,
        mktPaletteFormat,
    }: MktN64AllPalettesProps) {
        return (
            <>
                {paletteFiles.map((paletteFile) => (
                    <Fragment key={paletteFile.name}>
                        <div>File: {paletteFile.name}</div>
                        <ZoomCssProvider className={styles.itemsContainer}>
                            {paletteFile.palettes.map((palette, idx) => (
                                <MktN64OnePalette
                                    key={`${idx}_${palette.label}`}
                                    mktPaletteFormat={mktPaletteFormat}
                                    idx={idx}
                                    paletteFileHash={paletteFile.hash}
                                    paletteFileName={paletteFile.name}
                                    palette={palette}
                                />
                            ))}
                        </ZoomCssProvider>
                    </Fragment>
                ))}
            </>
        );
    },
    (oldProps, newProps) => {
        if (oldProps.mktPaletteFormat !== newProps.mktPaletteFormat) {
            // console.log('palette formats different!', oldProps, newProps);
            return false;
        }
        if (oldProps.paletteFiles.length !== newProps.paletteFiles.length) {
            // console.log('palette list lengths different!', oldProps, newProps);

            return false;
        }
        for (let i = 0; i < oldProps.paletteFiles.length; i++) {
            const oldF = oldProps.paletteFiles[i];
            const newF = newProps.paletteFiles[i];
            if (oldF.name !== newF.name) {
                // console.log('palette names different!', oldProps, newProps);

                return false;
            }
            if (oldF.palettes.length !== newF.palettes.length) {
                // console.log('palette lengths different!', oldProps, newProps);

                return false;
            }
        }

        // console.log('nothing changed!!!');
        return true;
    },
);

interface MktN64OnePaletteProps {
    palette: LiteralDataEntry;
    paletteFileHash: string;
    idx: number;
    paletteFileName: string;
    mktPaletteFormat: string;
}
const MktN64OnePalette = memo(function MktN64OnePalette({
    palette,
    paletteFileHash,
    idx,
    mktPaletteFormat,
    paletteFileName,
}: MktN64OnePaletteProps) {
    return (
        <MktListLibrary
            name={`${palette.label} (${palette.data.byteLength / 2})`}
            checkerboard={false}
            value={`pal-${idx}-file-${paletteFileHash}`}
        >
            {palette.data.byteLength > 0 && (
                <MktDrawPalettePng
                    name={palette.label}
                    palette={palette.data}
                    paletteFormat={mktPaletteFormat}
                    urlParts={[
                        'mktn64',
                        'palettes',
                        paletteFileName,
                        idx.toString(),
                        palette.label,
                    ]}
                    urlParams={{
                        mktPaletteFormat,
                        paletteFileHash,
                    }}
                />
            )}
        </MktListLibrary>
    );
});

export const MktDrawPalettePng = ({
    name,
    palette,
    paletteFormat,
    urlParts,
    urlParams,
}: {
    name: string;
    palette: ArrayBuffer;
    urlParts: string[];
    urlParams?: UrlParams;
    paletteFormat: string;
}) => {
    const data = useMemo(() => {
        return mktN64PaletteToPng({ palette, paletteFormat });
    }, [palette, paletteFormat]);

    return (
        <WithPromise promise={data}>
            <CachedPngImg
                data={data}
                urlParts={urlParts}
                urlParams={urlParams}
                name={name}
                zoomMult={8}
                width={16}
                mimeType="image/png"
            />
        </WithPromise>
    );
};

export type ImageType = 'png' | 'gif';

export interface MktImgProps {
    name: string;
    imageData: ArrayBuffer;
    palette: LiteralDataEntry;
    paletteIndex: [number, number];
    paletteFormat: string;
    dict?: ArrayBuffer;
    mktDictIndex: number;
    meta?: ImageMetaData;
    filename: string;
    onSuspend: () => void;
    onUnsuspend: () => void;
    imgRef: Ref<HTMLImageElement>;
}

const MktImg = memo(function MktN64Img({
    name,
    imageData,
    meta,
    dict,
    mktDictIndex,
    palette,
    paletteIndex,
    paletteFormat,
    filename,
    onSuspend,
    onUnsuspend,
    imgRef,
}: MktImgProps) {
    const data = useMemo(() => {
        try {
            return mktN64ImageDecompressToPng(
                meta,
                imageData,
                palette.data,
                paletteFormat,
                dict,
            );
        } catch (e) {
            console.log('failed to encode image!', name, meta, e);
            return Promise.resolve(undefined);
        }
    }, [name, meta, imageData, palette, paletteFormat, dict]);

    // const paddedIndex = '0'.padStart(3, '0');
    const { extension, mimeType } = { extension: 'png', mimeType: 'image/png' };

    const urlParts = useMemo(
        () => [
            'images',
            encodeURIComponent(filename),
            palette.label,
            paletteIndex[0].toString(),
            paletteIndex[1].toString(),
            paletteFormat,
            mktDictIndex.toString(),
            `${name}.${extension}`,
        ],
        [
            filename,
            palette,
            paletteIndex[0],
            paletteIndex[1],
            paletteFormat,
            mktDictIndex,
            name,
        ],
    );

    if (!data) return null;

    return (
        <WithPromise
            promise={data}
            onSuspend={onSuspend}
            onUnsuspend={onUnsuspend}
        >
            <CachedPngImg
                data={data}
                mimeType={mimeType}
                urlParts={urlParts}
                name={name}
                width={meta?.width || 150}
                height={meta?.height}
                imgRef={imgRef}
            />
        </WithPromise>
    );
});

interface MktN64ImgGridCellProps {
    metaMultiMap: MetaMultiMap;
    image: LiteralDataEntry;
    palette: LiteralDataEntry;
    idx: number;
    handleChecked: MouseEventHandler<HTMLInputElement>;
    dict: LiteralDataEntry;
    mktDictIndex: number;
    mktPaletteFormat: string;
    mktPalette: [number, number];
    selectedFile: FileNameAndData;
}

const MktN64ImgGridCell = memo(function MktN64ImgGridCell({
    metaMultiMap,
    image,
    palette,
    idx,
    handleChecked,
    dict,
    mktDictIndex,
    mktPaletteFormat,
    mktPalette,
    selectedFile,
}: MktN64ImgGridCellProps) {
    const { onSuspend, onUnsuspend, imgRef, isLoading } = useLoadingTracker();
    const meta = chooseMeta(metaMultiMap, image);
    // const meta = metaMap.get(image.label);

    return (
        // TODO: show number of colors, to help with palette matching
        <MktListLibrary
            name={`${image.label}`}
            name2={`${palette.label}`}
            onChecked={handleChecked}
            value={`img-${idx}`}
            width={meta?.width}
            height={meta?.height}
            isLoading={isLoading}
        >
            {
                <MktImg
                    name={image.label}
                    imageData={image.data}
                    dict={dict?.data}
                    mktDictIndex={mktDictIndex}
                    meta={meta}
                    palette={palette}
                    paletteFormat={mktPaletteFormat}
                    paletteIndex={mktPalette}
                    filename={selectedFile.name}
                    onSuspend={onSuspend}
                    onUnsuspend={onUnsuspend}
                    imgRef={imgRef}
                />
            }
            {!meta && (
                <div style={{ backgroundColor: 'white' }}>
                    No metadata found!
                </div>
            )}
        </MktListLibrary>
    );
});

function useProcessedFiles(
    selectedFile: FileNameAndData,
    mktFiles: CategorizedFiles,
) {
    const [images, setImages] = useState<LiteralDataEntry[]>([]);
    const [metaMap, setMetaMap] = useState<Map<string, ImageMetaData>>(
        new Map(),
    );
    const [metaMultiMap, setMetaMultiMap] = useState<
        Map<string, ImageMetaData[]>
    >(new Map());
    const [paletteFiles, setPaletteFiles] = useState<
        { name: string; hash: string; palettes: LiteralDataEntry[] }[]
    >([]);

    const [staticPaletteFiles, setStaticPaletteFiles] = useState<
        { name: string; hash: string; palettes: LiteralDataEntry[] }[]
    >([]);

    const [nonstaticPaletteFiles, setNonstaticPaletteFiles] = useState<
        { name: string; hash: string; palettes: LiteralDataEntry[] }[]
    >([]);

    const [dicts, setDicts] = useState<LiteralDataEntry[]>([]);
    const [isLoading, setLoading] = useState<number>(0);

    useEffect(() => {
        (async function () {
            setLoading((l) => l + 1);
            const images = await mktN64ProcessImageFile(selectedFile);
            setImages(images);
            setLoading((l) => l - 1);
        })();
    }, [selectedFile]);
    useEffect(() => {
        (async function () {
            setLoading((l) => l + 1);
            const metaMap = await extractImageMetaDataFromAtds(
                filterFilesByDirectory(selectedFile, mktFiles.animation),
            );
            setMetaMap(metaMap);

            const metaMultiMap = await extractImageMetaDataFromAtdsMulti(
                filterFilesByDirectory(selectedFile, mktFiles.animation),
            );
            setMetaMultiMap(metaMultiMap);
            setLoading((l) => l - 1);
        })();
    }, [selectedFile, mktFiles]);
    useEffect(() => {
        (async function () {
            setLoading((l) => l + 1);
            const paletteFiles = await cachedMktN64ProcessPaletteFiles(
                filterFilesByDirectory(selectedFile, mktFiles.palette),
            );
            setPaletteFiles(paletteFiles);
            setNonstaticPaletteFiles(
                paletteFiles.filter((f) => !isStaticPaletteFile(f)),
            );
            setStaticPaletteFiles(paletteFiles.filter(isStaticPaletteFile));

            setLoading((l) => l - 1);
        })();
    }, [selectedFile, mktFiles]);
    useEffect(() => {
        (async function () {
            setLoading((l) => l + 1);
            const dicts = filterFilesByDirectory(selectedFile, mktFiles.dict)
                .map((f) => processDictionary(f))
                .filter((d) => d !== undefined);
            setDicts(dicts);
            setLoading((l) => l - 1);
        })();
    }, [selectedFile, mktFiles]);

    return {
        images,
        metaMap,
        metaMultiMap,
        paletteFiles,
        dicts,
        isLoading,
        staticPaletteFiles,
        nonstaticPaletteFiles,
    };
}

export function MktListLibrary({
    name,
    name2,
    children,
    onChecked,
    value,
    checkerboard = true,
    width,
    height,
    isLoading = false,
}: {
    name: string;
    name2?: string;
    children?: ReactNode;
    onChecked?: MouseEventHandler<HTMLInputElement>;
    value?: string;
    checkerboard?: boolean;
    width?: number;
    height?: number;
    isLoading?: boolean;
}) {
    const checkerboardProps: { style?: object } = {
        style: {
            minWidth: width && `calc(${width}px * var(--zoom))`,
            minHeight: height && `calc(${height}px * var(--zoom))`,
        },
    };
    if (!checkerboard) {
        delete checkerboardProps.style;
    }
    const MaybeCheckerboard = checkerboard ? Checkerboard : Fragment;
    return (
        <label className={styles.imageCell}>
            {isLoading && <Loading />}
            <input
                style={{ justifySelf: 'right' }}
                type="checkbox"
                onClick={onChecked}
                value={value}
            />
            <MaybeCheckerboard {...checkerboardProps}>
                <ErrorBoundary fallbackRender={() => 'Error'}>
                    {children}
                </ErrorBoundary>
            </MaybeCheckerboard>

            <div>
                <div>{name}</div>
                {name2 && <div className={styles.name2}>{name2}</div>}
            </div>
        </label>
    );
}
function findPalette(
    paletteFiles: { name: string; palettes: LiteralDataEntry[] }[],
    paletteName: string | undefined,
    fallback: LiteralDataEntry,
) {
    if (!paletteName) return fallback;

    for (const file of paletteFiles) {
        for (const palette of file.palettes) {
            if (palette.label === paletteName) {
                return palette;
            }
        }
    }

    return fallback;
}
