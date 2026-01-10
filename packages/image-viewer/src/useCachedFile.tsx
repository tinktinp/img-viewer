import { useCallback, useEffect, useState } from 'react';

import {
    type CachedUrls,
    type CacheProps,
    cacheAndBlobUrl,
} from './cacheFiles';

export function useCachedFile({ data, url, mimeType }: CacheProps) {
    const [urls, setUrls] = useState<CachedUrls | undefined>(undefined);
    const [recacheCounter, setRecacheCount] = useState<number>(0);
    useEffect(() => {
        void recacheCounter;
        let urls: CachedUrls | undefined;
        const fn = async () => {
            urls = await cacheAndBlobUrl({ data, url, mimeType });
            setUrls(urls);
        };
        if (recacheCounter < 5) {
            fn();
        } else {
            // incremental backoff, just in case
            setTimeout(fn, recacheCounter * 100);
        }

        return function cleanup() {
            if (urls) URL.revokeObjectURL(urls.blob);
        };
    }, [data, url, mimeType, recacheCounter]);

    const recache = useCallback(() => {
        setUrls(undefined);
        setRecacheCount((x) => x + 1);
    }, []);

    return { urls, recache };
}

export default useCachedFile;
