export interface RomInfo {
    name: string;
    cpuFile: string;
    gfxFile: string;
    mk1Mode?: boolean;
}

/**
 * table of supported roms.
 *
 * For now, just the ones from MKLK, excluding MK4.
 */
export const supportedRoms: RomInfo[] = [
    {
        name: 'MK1',
        cpuFile: 'mkr4.maincpu',
        gfxFile: 'mk.gfxrom',
        mk1Mode: true,
    },
    {
        name: 'MK2',
        cpuFile: 'mk2.maincpu',
        gfxFile: 'mk2.gfxrom',
    },
    {
        name: 'MK3',
        cpuFile: 'mk3.maincpu',
        gfxFile: 'mk3.gfxrom',
    },
    {
        name: 'UMK3',
        cpuFile: 'umk3.maincpu',
        gfxFile: 'umk3.gfxrom',
    },
    {
        // since we currently focus on extracting sprites,
        // and since wavenet has the same gfxrom as regular UMK3,
        // this will probably give the same result as regular UMK3,
        // at least until we add support for zipped graphics in the
        // maincpu file
        name: 'UMK3 Wavenet',
        cpuFile: 'umk3w.maincpu',
        gfxFile: 'umk3.gfxrom',
    },
] as const;
