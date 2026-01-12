/** biome-ignore-all lint/complexity/useArrowFunction: <explanation> */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: <explanation> */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <explanation> */

import { memo, useDebugValue, useEffect, useMemo, useState } from 'react';
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
                <PluginElementsComponent pluginElements={pluginElements} />
            )}
        </ZoomCssProviderDisplayContents>
    );
}

interface PluginElementsComponentProps {
    pluginElements: PluginElement[];
}
const PluginElementsComponent = memo(function PluginElementsComponent({
    pluginElements,
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

interface PluginSectionElementProps {
    sectionElement: PluginElementSection;
}
const PluginSectionElement = memo(function PluginSectionElement(props: PluginSectionElementProps) {
    const { sectionElement } = props;
    const pluginElements = usePluginElementsBySectionId(sectionElement.id);

    return (
        <>
            <div>
                {sectionElement.name}
                {sectionElement.name2 && (
                    <div className={styles.name2}>sectionElement.name2</div>
                )}
            </div>
            <div className={styles.itemsContainer}>
                <PluginElementsComponent pluginElements={pluginElements} />
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
    const { onLoadingStart, onLoadingComplete, isLoading } =
        useLoadingTracker(1);

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
                onLoadingStart={onLoadingStart}
                onLoadingComplete={onLoadingComplete}
            />
        </SelectableCell>
    );
});

const PluginDrawPalettePng = ({
    pluginElement,
    paletteFormat,
    urlParts,
    urlParams,
    onLoadingStart,
    onLoadingComplete,
}: {
    pluginElement: PluginElementPalette;
    paletteFormat: string;
    urlParts: string[];
    urlParams?: UrlParams;
    onLoadingStart: () => void;
    onLoadingComplete: () => void;
}) => {
    const data = useMemo(async () => {
        const rgba = await pluginElement.rgba({ paletteFormat });
        return encodeRgbArrayPaletteAsPng(rgba); // TODO: move to worker thread
    }, [pluginElement, paletteFormat]);

    return (
        <WithPromise
            promise={data}
            onSuspend={onLoadingStart}
            onUnsuspend={onLoadingComplete}
        >
            <CachedPngImg
                data={data}
                urlParts={urlParts}
                urlParams={urlParams}
                name={pluginElement.name}
                zoomMult={8}
                width={16}
                mimeType="image/png"
                onLoaded={onLoadingComplete}
            />
        </WithPromise>
    );
};

export interface PluginImgProps {
    pluginElement: PluginElementImage;

    paletteFormat: string;
    onLoadingStart: () => void;
    onLoadingComplete: () => void;
}

const PluginImg = memo(function PluginImg({
    pluginElement,
    paletteFormat,
    onLoadingStart,
    onLoadingComplete,
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
            onSuspend={onLoadingStart}
            onUnsuspend={onLoadingComplete}
        >
            <CachedPngImg
                data={data}
                mimeType={mimeType}
                urlParts={urlParts}
                name={pluginElement.name}
                width={pluginElement.width || 150}
                height={pluginElement.height}
                onLoaded={onLoadingComplete}
            />
        </WithPromise>
    );
});

interface PluginImgGridCellProps {
    pluginElement: PluginElementImage;
    paletteFormat: string;
}

const PluginImgGridCell = memo(function PluginImgGridCell({
    pluginElement,
    paletteFormat,
}: PluginImgGridCellProps) {
    const { onLoadingStart, onLoadingComplete, isLoading } =
        useLoadingTracker(1);

    return (
        <SelectableCell
            name={pluginElement.name}
            name2={pluginElement.name2}
            value={pluginElement.id}
            width={pluginElement.width}
            height={pluginElement.height}
            isLoading={isLoading}
        >
            {
                <PluginImg
                    pluginElement={pluginElement}
                    paletteFormat={paletteFormat}
                    onLoadingStart={onLoadingStart}
                    onLoadingComplete={onLoadingComplete}
                />
            }
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

        console.log('usePluginElements called');
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
