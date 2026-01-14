/** biome-ignore-all lint/complexity/useArrowFunction: <explanation> */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: <explanation> */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <explanation> */

import {
    memo,
    type Ref,
    type RefObject,
    useCallback,
    useDebugValue,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import CachedPngImg from '../CachedPngImg';
import type { UrlParams } from '../cacheFiles';
import { SelectableCell } from '../common-react/SelectableCell';
import { ZoomCssProviderDisplayContents } from '../common-react/ZoomCSSProviderDisplayContents';
import type {
    PluginElement,
    PluginElementImage,
    PluginElementPalette,
    PluginElementSection,
    PluginItem,
} from '../plugin/plugin';
import { useSettingsOpt } from '../Settings';
import { encodeRgbArrayPaletteAsPng } from '../toPng';
import { useLoadingTracker, WithPromise } from '../WithPromise';
import styles from './PluginImages.module.css';
import {
    createDefaultStateObject,
    StoreProvider,
    useGetStoreFromContext,
    usePluginElementsBySectionId,
    useStoreFromContext,
} from './store';
import { usePluginHandleSelection } from './usePluginHandleSelection';

export interface PluginItemProps<Item> {
    selectedItem: Item;
}

export function PluginItemComponent<Item extends PluginItem>(
    props: PluginItemProps<Item>,
) {
    return (
        <StoreProvider>
            <PluginItemInternal {...props} />
        </StoreProvider>
    );
}

export function PluginItemInternal<Item extends PluginItem>({
    selectedItem,
}: PluginItemProps<Item>) {
    let { setSettings } = useSettingsOpt('setSettings');

    const { isLoading } = usePluginElements(selectedItem);

    const pluginElements = usePluginElementsBySectionId('root');

    const handleChecked = usePluginHandleSelection();

    return (
        <ZoomCssProviderDisplayContents onClick={handleChecked}>
            {!!isLoading && <>Loading...</>}
            {!isLoading && (
                <PluginElementsComponent
                    pluginElements={pluginElements}
                    isSkipped={false}
                />
            )}
        </ZoomCssProviderDisplayContents>
    );
}

interface PluginElementsComponentProps {
    pluginElements: PluginElement[];
    isSkipped: boolean;
}
const PluginElementsComponent = memo(function PluginElementsComponent({
    pluginElements,
    isSkipped,
}: PluginElementsComponentProps) {
    return pluginElements.map((pluginElement) => {
        if (pluginElement.type === 'palette') {
            return (
                <PluginOnePalette
                    key={`palette-${pluginElement.id}`}
                    pluginElement={pluginElement}
                    paletteFormat={''}
                />
            );
        } else if (pluginElement.type === 'image') {
            return (
                <PluginImgGridCell
                    key={`img-${pluginElement.id}`}
                    pluginElement={pluginElement}
                    paletteFormat={''}
                    isSkipped={isSkipped}
                />
            );
        } else if (pluginElement.type === 'section') {
            return (
                <PluginSectionElement
                    key={`section-${pluginElement.id}`}
                    sectionElement={pluginElement}
                />
            );
        }
    });
});

function useIsSkipped() {
    // visibility element reference
    const vseRef = useRef<HTMLDivElement | null>(null);

    const [isSkipped, setIsSkipped] = useState(false);
    const handleContentVisibilityAutoStateChange = useCallback(
        (event: Event) => {
            const e = event as ContentVisibilityAutoStateChangeEvent;
            setIsSkipped(e.skipped as boolean);
        },
        [],
    );
    useEffect(() => {
        if (vseRef.current) {
            const el = vseRef.current;

            const isSkipped = !el.checkVisibility({
                contentVisibilityAuto: true,
            });
            setIsSkipped(isSkipped);
            el.addEventListener(
                'contentvisibilityautostatechange',
                handleContentVisibilityAutoStateChange,
            );
            return function cleanup() {
                el.removeEventListener(
                    'contentvisibilityautostatechange',
                    handleContentVisibilityAutoStateChange,
                );
            };
        }
    }, [handleContentVisibilityAutoStateChange]);

    return {
        vseRef,
        isSkipped,
    };
}

interface PluginSectionElementProps {
    sectionElement: PluginElementSection;
}
const PluginSectionElement = memo(function PluginSectionElement(
    props: PluginSectionElementProps,
) {
    const { sectionElement } = props;
    const pluginElements = usePluginElementsBySectionId(sectionElement.id);

    const { vseRef, isSkipped } = useIsSkipped();

    return (
        <>
            <div className={styles.sectionTitle}>
                {sectionElement.name}
                {sectionElement.name2 && (
                    <div className={styles.name2}>sectionElement.name2</div>
                )}
            </div>
            <div ref={vseRef} className={styles.itemsContainer}>
                <PluginElementsComponent
                    pluginElements={pluginElements}
                    isSkipped={isSkipped}
                />
            </div>
        </>
    );
});

interface PluginOnePaletteProps {
    pluginElement: PluginElementPalette;
    paletteFormat: string;
}
const PluginOnePalette = memo(function PluginOnePalette({
    pluginElement: palette,
    paletteFormat,
}: PluginOnePaletteProps) {
    const { onSuspend, onUnsuspend, imgRef, isLoading } = useLoadingTracker();

    return (
        <SelectableCell
            name={`${palette.name} (${palette.paletteSize})`}
            checkerboard={false}
            value={palette.id}
            isLoading={isLoading}
        >
            <PluginDrawPalettePng
                pluginElement={palette}
                paletteFormat={paletteFormat}
                urlParts={['palettes', palette.id, palette.name]}
                urlParams={{
                    paletteFormat,
                }}
                onSuspend={onSuspend}
                onUnsuspend={onUnsuspend}
                imgRef={imgRef}
            />
        </SelectableCell>
    );
});

const PluginDrawPalettePng = ({
    pluginElement,
    paletteFormat,
    urlParts,
    urlParams,
    onSuspend,
    onUnsuspend,
    imgRef,
}: {
    pluginElement: PluginElementPalette;
    paletteFormat: string;
    urlParts: string[];
    urlParams?: UrlParams;
    onSuspend: () => void;
    onUnsuspend: () => void;
    imgRef: Ref<HTMLImageElement>;
}) => {
    const data = useMemo(async () => {
        const rgba = await pluginElement.rgba({ paletteFormat });
        return encodeRgbArrayPaletteAsPng(rgba); // TODO: move to worker thread
    }, [pluginElement, paletteFormat]);

    return (
        <WithPromise
            promise={data}
            onSuspend={onSuspend}
            onUnsuspend={onUnsuspend}
        >
            <CachedPngImg
                data={data}
                urlParts={urlParts}
                urlParams={urlParams}
                name={pluginElement.name}
                zoomMult={8}
                width={16}
                mimeType="image/png"
                imgRef={imgRef}
            />
        </WithPromise>
    );
};

export interface PluginImgProps {
    pluginElement: PluginElementImage;

    paletteFormat: string;
    onSuspend: () => void;
    onUnsuspend: () => void;
    imgRef: Ref<HTMLImageElement | null>;
}

const PluginImg = memo(function PluginImg({
    pluginElement,
    paletteFormat,
    onSuspend,
    onUnsuspend,
    imgRef,
}: PluginImgProps) {
    const data = useMemo(() => {
        try {
            return pluginElement.toPng?.();
        } catch (e) {
            console.log('failed to encode image!', pluginElement, e);
            return Promise.resolve(undefined);
        }
    }, [pluginElement]);

    const { extension, mimeType } = { extension: 'png', mimeType: 'image/png' };

    const urlParts = useMemo(
        () => [
            'images',
            encodeURIComponent(pluginElement.name), // FIXME: this was filename, add some kind of filename or path to PluginElement
            paletteFormat,
            `${pluginElement.name}.${extension}`,
        ],
        [pluginElement, paletteFormat],
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
                name={pluginElement.name}
                width={pluginElement.width || 150}
                height={pluginElement.height}
                imgRef={imgRef}
            />
        </WithPromise>
    );
});

interface PluginImgGridCellProps {
    pluginElement: PluginElementImage;
    paletteFormat: string;
    isSkipped: boolean;
}

const PluginImgGridCell = memo(function PluginImgGridCell({
    pluginElement,
    paletteFormat,
    isSkipped,
}: PluginImgGridCellProps) {
    const { isLoading, onSuspend, onUnsuspend, imgRef } = useLoadingTracker();

    // once we finish loading, don't un-render the image
    const omitImage = isSkipped && isLoading;

    return (
        <SelectableCell
            name={pluginElement.name}
            name2={pluginElement.name2}
            value={pluginElement.id}
            width={pluginElement.width}
            height={pluginElement.height}
            isLoading={isLoading}
        >
            {!omitImage && (
                <PluginImg
                    pluginElement={pluginElement}
                    paletteFormat={paletteFormat}
                    onSuspend={onSuspend}
                    onUnsuspend={onUnsuspend}
                    imgRef={imgRef}
                />
            )}
            {pluginElement.noticeMessage && (
                <div style={{ backgroundColor: 'white' }}>
                    {pluginElement.noticeMessage}
                </div>
            )}
        </SelectableCell>
    );
});

function useLoading() {
    const [isLoading, setLoading] = useState<number>(0);
    useDebugValue(isLoading);
    return { isLoading, setLoading };
}
function usePluginElements(pluginItem: PluginItem) {
    const { isLoading, setLoading } = useLoading();
    // get the store without subscribing to it
    const store = useGetStoreFromContext();

    useEffect(() => {
        setLoading((l) => l + 1);

        // clear the state
        store.setState(() => createDefaultStateObject());
        let finished = false;
        const controller = new AbortController();
        const { signal } = controller;

        // console.log('usePluginElements called');
        pluginItem.addEventListener(
            'elements-loaded',
            ({ pluginElements }) => {
                // console.log('elements-loaded', pluginElements);
                const bySection = Map.groupBy(
                    pluginElements,
                    (pe) => pe.sectionId,
                );
                bySection.entries().forEach(([sectionId, elements]) => {
                    store.setState((state) => {
                        let section = state.bySection[sectionId];
                        if (section === undefined) section = [];
                        return {
                            ...state,
                            bySection: {
                                ...state.bySection,
                                [sectionId]: section.concat(elements),
                            },
                        };
                    });
                });

                const byId = Object.fromEntries(
                    pluginElements.map((pe) => [pe.id, pe]),
                );
                store.setState((state) => ({
                    ...state,
                    byId: {
                        ...state.byId,
                        ...byId,
                    },
                }));
            },

            { signal },
        );
        pluginItem.addEventListener(
            'elements-finished-loading',
            (_evt) => {
                //
                // console.log('elements-finished-loading', _evt);
                setLoading((l) => l - 1);
                controller.abort();
                finished = true;
            },
            { signal },
        );
        // TODO: handle errors (once I add an error event)

        pluginItem.loadElements();

        return function cleanup() {
            console.log('setPluginElements: cleaning up');
            if (!finished) {
                console.log(
                    'setPluginElements: not finished, running abort and setLoading(-1)...',
                );
                controller.abort();
                setLoading((l) => l - 1);
            }
        };
    }, [pluginItem, setLoading, store]);

    return {
        isLoading,
    };
}
