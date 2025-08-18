import { type MouseEventHandler, useMemo } from 'react';
import { type CacheData, makeCacheUrl } from './cacheFiles';
import useCachedFile from './useCachedFile';

export interface CachedPngImgProps {
    zoom: number;
    urlParts: string[];
    name: string;
    data: CacheData;
    width: number;
    mimeType: string;
}

const preventDefaultAndBubble: MouseEventHandler<HTMLAnchorElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.parentElement?.click();
};

export function CachedPngImg({
    urlParts,
    data,
    name,
    zoom,
    width,
    mimeType = 'image/png',
}: CachedPngImgProps) {
    const suggestedUrl = useMemo(() => makeCacheUrl(urlParts), [urlParts]);
    const urls = useCachedFile({
        data,
        mimeType,
        url: suggestedUrl,
    });

    if (urls) {
        const style = {
            width: `${width * zoom}px`,
            imageRendering: 'pixelated' as const,
        };
        return (
            <a
                href={urls.blob}
                download={urlParts[urlParts.length - 1]}
                onClick={preventDefaultAndBubble}
            >
                <img src={urls.cached} alt={name} style={style} />
            </a>
        );
    }
    return null;
}

export default CachedPngImg;
