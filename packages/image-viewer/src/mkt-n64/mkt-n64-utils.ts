import { mktN64GetImageInfo } from '../asm/decompressMktN64';
import type { ImageMetaData } from '../asm/filterFiles';
import type { LiteralDataEntry } from '../asm/parser';

export type MetaMultiMap = Map<string, ImageMetaData[]>;

export function chooseMeta(map: MetaMultiMap, image: LiteralDataEntry) {
    const choices = map.get(image.label);
    if (!choices || choices.length === 0) {
        return undefined;
    }

    const info = mktN64GetImageInfo(new Uint8Array(image.data));

    for (const c of choices) {
        if (c.width * c.height === info.size) {
            return c;
        }
    }

    // no match? Try again without padding I guess
    for (const c of choices) {
        if ((c.realWidth || 0) * c.height === info.size) {
            return {
                ...c,
                width: c.realWidth || 0,
            };
        }
    }

    // otherwise just return the last one
    return choices[choices.length - 1];
}
