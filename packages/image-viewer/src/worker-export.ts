/**
 * This lists functions that are available from the Web Worker, and is
 * used to initialize the worker utils.
 */

import { mktN64DecompressImage } from './asm/decompressMktN64';
import {
    extractImageMetaDataFromAtds,
    extractImageMetaDataFromAtdsMulti,
    mktN64ImageDecompressToPng,
    mktN64ProcessImageFile,
    mktN64ProcessPaletteFile,
    mktN64ProcessPaletteFiles,
} from './asm/filterFiles';
import { mktN64PaletteToPng } from './mkt-n64/MktDrawPalettePng';

export const workerExport = {
    mktN64DecompressImage,
    mktN64ImageDecompressToPng,
    mktN64ProcessPaletteFiles,
    mktN64ProcessPaletteFile,
    extractImageMetaDataFromAtds,
    extractImageMetaDataFromAtdsMulti,
    mktN64ProcessImageFile,
    mktN64PaletteToPng,
};
