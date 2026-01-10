import type { FileNameAndData } from '../asm/filterFiles';
import { mktN64ProcessPaletteFile } from '../consume-worker';

const resultCache = new Map<
    string,
    WeakRef<{ result: unknown; hash: string }>
>();

const sha1 = 'SHA-1';

const textEncoder = new TextEncoder();

export async function callWithCache<T extends WeakKey>(
    data: BufferSource | string,
    func: () => T,
): Promise<{ result: Awaited<T>; hash: string }> {
    if (typeof data === 'string') {
        data = textEncoder.encode(data);
    }
    const uint8array = new Uint8Array(
        await window.crypto.subtle.digest(sha1, data),
    );
    // @ts-expect-error
    const hash: string = uint8array.toHex();
    if (resultCache.has(hash)) {
        const weakResult = resultCache.get(hash)?.deref();
        if (weakResult !== undefined) {
            return weakResult as { result: Awaited<T>; hash: string };
        }
    }

    const result = await func();
    resultCache.set(hash, new WeakRef({ result, hash }));
    return { result, hash };
}

export type WithHash<T> = T & { hash: string };

export async function cachedMktN64ProcessPaletteFile(
    paletteFile: FileNameAndData,
) {
    return await callWithCache(paletteFile.text, () =>
        mktN64ProcessPaletteFile(paletteFile),
    );
}

export async function cachedMktN64ProcessPaletteFiles(
    paletteFiles: FileNameAndData[],
) {
    const results = paletteFiles.map((paletteFile) =>
        cachedMktN64ProcessPaletteFile(paletteFile),
    );
    const awaitedResults = (await Promise.all(results)).flatMap(
        ({ result, hash }) => {
            return result.map((r) => {
                const r2 = r as WithHash<typeof r>;
                r2.hash = hash;
                return r2;
            });
        },
    );
    return awaitedResults;
}
