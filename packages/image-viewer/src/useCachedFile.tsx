import { useEffect, useState } from 'react';

import {
    cacheAndBlobUrl,
    type CachedUrls,
    type CacheProps,
} from './cacheFiles';

export function useCachedFile({ data, url, mimeType }: CacheProps) {
    const [urls, setUrls] = useState<CachedUrls | undefined>(undefined);
    useEffect(() => {
        let urls: CachedUrls | undefined;
        (async () => {
            urls = await cacheAndBlobUrl({ data, url, mimeType });
            setUrls(urls);
        })();

        return function cleanup() {
            if (urls) URL.revokeObjectURL(urls.blob);
        };
    }, [data, url, mimeType]);

    return urls;
}

export default useCachedFile;
