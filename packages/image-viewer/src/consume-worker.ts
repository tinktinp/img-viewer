import { workerExport } from './worker-export';
import { Requester } from './worker-utils/requester';
import { WorkerClient } from './worker-utils/WorkerClient';

const worker = new Worker(new URL('./web-worker.js', import.meta.url));

const workerClient = new WorkerClient(worker);
const requester = new Requester(workerClient, workerExport);
const {
    mktN64DecompressImage,
    mktN64ImageDecompressToPng,
    mktN64ProcessPaletteFiles,
    mktN64ProcessPaletteFile,
    extractImageMetaDataFromAtds,
    extractImageMetaDataFromAtdsMulti,
    mktN64ProcessImageFile,
    mktN64PaletteToPng,
} = requester.table;

export {
    mktN64DecompressImage,
    mktN64ImageDecompressToPng,
    mktN64ProcessPaletteFiles,
    mktN64ProcessPaletteFile,
    extractImageMetaDataFromAtds,
    extractImageMetaDataFromAtdsMulti,
    mktN64ProcessImageFile,
    mktN64PaletteToPng,
};
