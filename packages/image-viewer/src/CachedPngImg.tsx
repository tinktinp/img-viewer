import { useMemo, type MouseEventHandler } from 'react';
import useCachedFile from './useCachedFile';
import { makeCacheUrl, type CacheData } from './cacheFiles';

export interface CachedPngImgProps {
    zoom: number;
    urlParts: string[];
    name: string;
    data: CacheData;
    width: number;
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
}: CachedPngImgProps) {
    const suggestedUrl = useMemo(() => makeCacheUrl(urlParts), [urlParts]);
    const urls = useCachedFile({
        data,
        mimeType: 'image/png',
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
