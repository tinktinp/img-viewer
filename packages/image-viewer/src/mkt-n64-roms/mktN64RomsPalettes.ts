import { BufferPtr } from '../asm/BufferPtr';
import { processPaletteInFormatWithSize } from '../palettes/palettes';
import { toHex } from '../utils/toHex';
import type { RomInfo } from './MktN64RomInfo';
import { mktN64RomPaletteDetails } from './mktN64RomPaletteDetails';
import type {
    MktN64CharacterItem,
    MktN64RomElementPalette,
    PalettePtr,
    PaletteType,
} from './mktN64RomTypes';

const romBaseAddress = 0x8000_0000;
const maxPaletteAddress = romBaseAddress + 0x40_0000;
const characterPaletteTableByteLength = 32 * 4;

function getPaletteTableAddr(romInfo: RomInfo, table: PaletteType) {
    switch (table) {
        case 'character1':
            return romInfo.characterPalettes;
        case 'character2':
            return romInfo.characterPalettes + characterPaletteTableByteLength;
        default:
            throw new Error('unknown palette table requested!');
    }
}

function getPaletteAddrFromTable(
    romInfo: RomInfo,
    dataView: DataView,
    table: PaletteType,
    idx: number,
) {
    const offsetIntoTable = 4 * idx;
    const tableAddr = getPaletteTableAddr(romInfo, table);

    return (
        dataView.getUint32(tableAddr + offsetIntoTable, false) - romBaseAddress
    );
}

/**
 * Takes a Map of palettes (collected from the anitab), adds character palettes
 * (regular and alt) to that list, and returns them as `MktN64RomElementPalette`s.
 */
export function getCharacterPaletteElements(
    item: MktN64CharacterItem,
    palettesMap: Map<number, PalettePtr>,
) {
    palettesMap = new Map(palettesMap); // clone the palettes map before we mutate it
    const dataView = new DataView(item.arrayBuffer);

    const extraPalettesMap = new Map<number, PalettePtr>();

    const primaryPalette = getPaletteAddrFromTable(
        item.romInfo,
        dataView,
        'character1',
        item.charId,
    );
    extraPalettesMap.set(primaryPalette, {
        fileOffset: primaryPalette,
        paletteType: 'character1',
    });
    const uglyPalette = getPaletteAddrFromTable(
        item.romInfo,
        dataView,
        'character2',
        item.charId,
    );
    extraPalettesMap.set(uglyPalette, {
        fileOffset: uglyPalette,
        paletteType: 'character2',
    });

    // remove these before we add them back to avoid duplicates
    palettesMap.delete(primaryPalette);
    palettesMap.delete(uglyPalette);

    const paletteFileOffsets = palettesMap.values().toArray();
    // add the extra palettes to the start of the list
    paletteFileOffsets.unshift(...extraPalettesMap.values());

    function getPaletteName({ fileOffset }: PalettePtr) {
        let prefix: string = '';
        if (fileOffset === primaryPalette) {
            prefix = 'Primary';
        } else if (fileOffset === uglyPalette) {
            prefix = 'Ugly';
        }
        if (prefix) {
            return `${prefix} ${toHex(fileOffset)}`;
        } else {
            return toHex(fileOffset);
        }
    }

    const paletteElements = paletteFileOffsets.map((palettePtr) => {
        const { fileOffset, paletteType } = palettePtr;
        const dataView = new DataView(item.arrayBuffer, fileOffset);
        const paletteSize = dataView.getUint32(0, false);
        const paletteElement: MktN64RomElementPalette = {
            type: 'palette',
            id: `${item.id}-palette-${toHex(fileOffset)}`,
            sectionId: 'palettes',
            name: getPaletteName(palettePtr),
            item,
            paletteSize,
            paletteType,
            fileOffset,
            anitabIndex: palettePtr.paletteType === 'from-ani' ? palettePtr.anitabIndex : undefined,
            rgba: mktN64RomElementPaletteToRgba,
            details() {
                return mktN64RomPaletteDetails(this);
            },
        };
        return paletteElement;
    });

    return paletteElements;
}

async function mktN64RomElementPaletteToRgba(
    this: MktN64RomElementPalette,
): Promise<number[][]> {
    return processPaletteInFormatWithSize(
        this.paletteSize,
        new BufferPtr({
            buffer: this.item.arrayBuffer,
            bufferByteOffset: this.fileOffset + 4,
            bufferByteLength: this.paletteSize * 2,
            defaultEndianness: 'be',
        }),
        this.id,
        'RGBX5551',
    ).rgb;
}

export function isValidPaletteAddr(
    paletteAddr: number | undefined,
): paletteAddr is number {
    return (
        paletteAddr !== undefined &&
        paletteAddr >= romBaseAddress &&
        paletteAddr <= maxPaletteAddress
    );
}

export function paletteAddrToFileOffset(paletteAddr: number) {
    return paletteAddr - romBaseAddress;
}
