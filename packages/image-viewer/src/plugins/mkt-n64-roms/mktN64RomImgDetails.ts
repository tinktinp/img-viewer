import type { PluginDetailsObj } from '../../plugin/plugin';
import { toHex } from '../../utils/toHex';
import type { MktN64RomElementImage } from './mktN64RomTypes';

export async function mktN64RomImgDetails(
    img: MktN64RomElementImage,
): Promise<PluginDetailsObj> {
    const { subframe } = img.img;
    return {
        caption: 'Image Details',
        row: [
            { key: 'name', header: 'Name', data: img.name },
            {
                key: 'width',
                header: 'Width',
                data: img.width?.toString() || '',
            },
            {
                key: 'width-padding',
                header: 'Width Padding',
                data: img.padding?.toString() || '',
            },
            {
                key: 'height',
                header: 'Height',
                data: img.height?.toString() || '',
            },
            {
                key: 'x-y-offset',
                header: 'X,Y Offset',
                data: `${subframe.xOffset}, ${subframe.yOffset}`,
            },
            {
                key: 'img-anitab-index',
                header: 'Anitab Index',
                data: subframe.aniCmd.anitabIndex.toString(),
            },
            {
                key: 'img-frame-offset',
                header: 'Frame Offset',
                data: toHex(subframe.aniCmd.frameOffset),
            },
            {
                key: 'img-header-offset',
                header: 'Header Offset',
                data: toHex(subframe.subOffset),
            },
            {
                key: 'img-data-offset',
                header: 'Data Offset',
                data: toHex(img.img.offset),
            },
            {
                key: 'dict',
                header: 'Dict',
                data: `${toHex(img.dict.start)}`,
            },
            {
                key: 'palette-ptr',
                header: 'Palette Pointer',
                data: subframe.palette
                    ? toHex(subframe.palette - 0x8000_0000)
                    : '(None)',
            },
            {
                key: 'palette-suggested',
                header: 'Palette (Suggested)',
                data: subframe.suggestedPalette
                    ? toHex(subframe.suggestedPalette)
                    : '(None)',
            },
        ],
    };
}
