import {
    type MouseEventHandler,
    type ReactEventHandler,
    type Ref,
    use,
    useCallback,
    useMemo,
} from 'react';
import { type CacheData, makeCacheUrl, type UrlParams } from './cacheFiles';
import useCachedFile from './useCachedFile';

export interface CachedPngImgProps {
    zoom?: number;
    zoomMult?: number;
    urlParts: string[];
    urlParams?: UrlParams;
    name: string;
    data: CacheData | Promise<CacheData | undefined>;
    width: number;
    height?: number;
    mimeType: string;
    onLoaded?: () => void;
    imgRef?: Ref<HTMLImageElement>
}

const preventDefaultAndBubble: MouseEventHandler<HTMLAnchorElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.parentElement?.click();
};

function isPromise(o: unknown): o is Promise<unknown> {
    return 'then' in (o as { then?: unknown });
}

export function CachedPngImg({
    urlParts,
    urlParams = {},
    data,
    name,
    zoom,
    zoomMult = 1,
    width,
    height,
    mimeType = 'image/png',
    onLoaded,
    imgRef,
}: CachedPngImgProps) {
    if (isPromise(data)) {
        data = use(data) || new ArrayBuffer();
    }

    const suggestedUrl = useMemo(
        () => makeCacheUrl(urlParts, urlParams),
        [urlParts, urlParams],
    );
    const { urls, recache } = useCachedFile({
        data,
        mimeType,
        url: suggestedUrl,
    });

    const style = useMemo(() => {
        if (zoom !== undefined) {
            return {
                width: `${width * zoom * zoomMult}px`,
                imageRendering: 'pixelated' as const,
                minHeight: height
                    ? `${height * zoom * zoomMult}px`
                    : `${zoom}px`,
            };
        } else {
            return {
                width: `calc(${width * zoomMult}px * var(--zoom))`,
                imageRendering: 'pixelated' as const,
                minHeight: height
                    ? `calc(${height * zoomMult}px * var(--zoom))`
                    : undefined,
            };
        }
    }, [height, width, zoom, zoomMult]);

    let loadedFired = false;
    // biome-ignore lint/correctness/useExhaustiveDependencies: not including loadedFired
    const handleLoad: ReactEventHandler<HTMLImageElement> = useCallback(
        (_e) => {
            if (!loadedFired) {
                loadedFired = true;
                onLoaded?.();
            }
        },
        [onLoaded],
    );

    const handleError: ReactEventHandler<HTMLImageElement> = useCallback(
        (_e) => {
            // Because we clear the cache when we change files, but we have some palettes that
            // do not change between files, but we also use the `loading=lazy` attribute, we run
            // inside the case where an image hasn't ever been loaded but is also no longer in the cache!
            recache();
        },
        [recache],
    );

    if (urls) {
        return (
            <a
                href={urls.blob}
                download={urlParts[urlParts.length - 1]}
                onClick={preventDefaultAndBubble}
            >
                <img
                    src={urls.cached}
                    alt={name}
                    style={style}
                    loading="lazy"
                    onLoad={handleLoad}
                    onError={handleError}
                    ref={imgRef}
                />
            </a>
        );
    }
    return null;
}

export default CachedPngImg;
