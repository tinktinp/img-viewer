const CACHE_VERSION = 1;
const CURRENT_CACHES = {
    img: `img-library-cache-v${CACHE_VERSION}`,
};

// export type CacheData = BodyInit;
// BodyInit is too flexible, and keeps us from using it with `URL.createObjectUrl`
export type CacheData = BlobPart | Uint8Array | ArrayBufferLike;

export interface CacheProps {
    data: CacheData;
    mimeType: string;
    url: string;
}

export interface CachedUrls {
    cached: string;
    blob: string;
}

export async function cacheAndBlobUrl({
    data,
    mimeType,
    url,
}: CacheProps): Promise<CachedUrls> {
    let cachedUrl: string | undefined;
    if (hasServiceWorkerActive()) {
        await cacheIt({ data, mimeType, url });
        cachedUrl = url;
    }

    const name = new URL(
        /* webpackIgnore: true */
        url,
        import.meta.url,
    ).pathname;
    // could just use new Blob() here, but I like giving it the name, just in case
    // something decides to use it someday
    const blob = new File([data as BlobPart], name, {
        type: mimeType,
    });
    const blobUrl = URL.createObjectURL(blob);
    return {
        cached: cachedUrl ?? blobUrl,
        blob: blobUrl,
    };
}

let imgCache: Cache | undefined;

export async function cacheIt({ data, mimeType, url }: CacheProps) {
    if (!url || url === '/') return url;
    const headers: Record<string, string> = {
        'Content-Type': mimeType,
        'Cache-Control': 'max-age=31536000, immutable',
    };
    if (typeof data === 'object' && 'length' in data) {
        headers['Content-Length'] = (data.length as number).toString();
    } else if (typeof data === 'object' && 'size' in data) {
        headers['Content-Length'] = (data.size as number).toString();
    }
    const response = new Response(data as BodyInit, {
        status: 200,
        headers,
    });

    if (imgCache === undefined) {
        imgCache = await caches.open(CURRENT_CACHES.img);
    }

    await imgCache.put(url, response.clone());
}

function hasServiceWorkerActive(): boolean {
    if (!('serviceWorker' in navigator)) return false;
    return navigator.serviceWorker.controller != null;
}

export const cacheUrlPrefix = '/img-cache';

export type UrlParams = ConstructorParameters<typeof URLSearchParams>[0];

export function makeCacheUrl(parts: string[], params: UrlParams = {}) {
    const paramsStr = new URLSearchParams(params).toString();
    return `${cacheUrlPrefix}/${parts.join('/')}?${paramsStr}`;
}

export async function clearCache() {
    imgCache = undefined;
    await caches.delete(CURRENT_CACHES.img);
}
