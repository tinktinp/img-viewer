// import { encodeBuffersAsPng } from '../toPng';
import { encodeBuffersAsPng } from '../../consume-worker';
import type { PluginElementImage, PluginElementPalette } from '../../plugin';
import { toHex } from '../../utils/toHex';
import type { ArcadeRomsItem } from './ArcadeRomsItem';
import { type Metadata } from './roms';

export interface ArcadeRomsElementImage
    extends PluginElementImage,
        ArcadeRomsElementImageProps {}

export interface ArcadeRomsElementImageProps {
    item: ArcadeRomsItem;
    metadata: Metadata;
    indexedPixelData: Uint8Array;
    palette: ArcadeRomsElementPalette;
    sectionId: string;
}

export function makeArcadeRomsElementImage(
    props: ArcadeRomsElementImageProps,
): ArcadeRomsElementImage {
    const r = props.metadata;

    return {
        ...props,
        type: 'image',
        id: `img-${toHex(r.metaAddr)}-${toHex(r.pointer)}-${r.paddedWidth}x${r.height}`,
        name: `${toHex(r.metaAddr)}`,
        name2: `${toHex(r.pointer)}`,
        width: r.paddedWidth,
        height: r.height,
        padding: r.paddedWidth - r.width,
        toPng: imgElementToPng,
    };
}

async function imgElementToPng(this: ArcadeRomsElementImage) {
    const m = this.metadata;
    const pngUint8Array = await encodeBuffersAsPng(
        this.indexedPixelData,
        this.palette.rgbaData,
        '',
        m.paddedWidth,
        m.height,
    );
    return pngUint8Array.buffer;
}

export interface ArcadeRomsElementPaletteProps {
    item: ArcadeRomsItem;
    paletteAddr: number;
    rgbaData: [number, number, number, number][];
}
export interface ArcadeRomsElementPalette
    extends PluginElementPalette,
        ArcadeRomsElementPaletteProps {}

export function makeArcadeRomsElementPalette(
    props: ArcadeRomsElementPaletteProps,
): ArcadeRomsElementPalette {
    const { rgbaData, paletteAddr } = props;
    return {
        ...props,
        type: 'palette',
        paletteSize: rgbaData.length,
        async rgba() {
            return rgbaData;
        },
        id: `palette-${toHex(paletteAddr)}`,
        sectionId: 'palettes',
        name: `${toHex(paletteAddr)}`,
    };
}
