import { toHex } from '../utils/toHex';

export const n64RomMagic = 0x8037_1240;
const romInfo = [
    {
        name: 'April 1st, 1996',
        releaseOffset: 0x1443,
        characterTextures: 0x8_6440,
        characterDict: 0x8_6540,
        characterPalettes: 0x8_7270,
        firstCharacterTextureSegment: 0x4b_35c0,
    },
    {
        name: 'May 13th, 1996',
        releaseOffset: 0x1444,
        characterTextures: 0x9_74e0,
        characterDict: 0x9_75e0,
        characterPalettes: 0x9_84c0,
        firstCharacterTextureSegment: 0x4c_4c40,
    },
    {
        name: 'July 29th, 1996',
        releaseOffset: 0x1444,
        characterTextures: 0xa_166c,
        characterDict: 0xa_176c,
        characterPalettes: 0xa_2850,
        firstCharacterTextureSegment: 0x43_d3c0,
    },
    {
        name: 'MKTPAL.ROM - July 29th, 1996',
        releaseOffset: 0x1444,
        characterTextures: 0xa_15ec,
        characterDict: 0xa_16ec,
        characterPalettes: 0xa_27d0,
        firstCharacterTextureSegment: 0x43_d340,
    },
    {
        name: 'Rev 1.2',
        releaseOffset: 0x1444,
        characterTextures: 0xa_247c,
        characterDict: 0xa_257c,
        characterPalettes: 0xa_3660,
        firstCharacterTextureSegment: 0x43_df80,
    },
    //
];
export type RomInfo = (typeof romInfo)[0];
export function getRomInfo(dataView: DataView) {
    const releaseOffset = dataView.getUint32(0xc, false);

    return romInfo.find((rom) => {
        if (rom.releaseOffset !== releaseOffset) {
            return false;
        }

        if (rom.characterTextures > dataView.buffer.byteLength) {
            console.log(
                'characterTextures offset %s is greater than file length %s!',
                toHex(rom.characterTextures),
                toHex(dataView.byteLength),
                rom,
            );
            return false;
        }
        const firstCharacterTextureSegment = dataView.getUint32(
            rom.characterTextures,
            false,
        );
        return (
            rom.firstCharacterTextureSegment === firstCharacterTextureSegment
        );
    });
}
