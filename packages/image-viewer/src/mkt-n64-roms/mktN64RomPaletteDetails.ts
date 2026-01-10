import type { PluginDetailsObj } from '../plugin/plugin';
import { toHex } from '../utils/toHex';
import type { MktN64RomElementPalette } from './mktN64RomTypes';

export async function mktN64RomPaletteDetails(
    el: MktN64RomElementPalette,
): Promise<PluginDetailsObj> {
    return {
        caption: 'Palette Details',
        row: [
            { key: 'name', header: 'Name', data: el.name },
            {
                key: 'palette-size',
                header: 'Palette Size',
                data: el.paletteSize.toString(),
            },
            {
                key: 'palette-type',
                header: 'Palette Type',
                data: `${el.paletteType} ${el.anitabIndex?.toString() ?? ''}`,
            },
            {
                key: 'file-offset',
                header: 'File Offset',
                data: toHex(el.fileOffset),
            },
        ],
    };
}
