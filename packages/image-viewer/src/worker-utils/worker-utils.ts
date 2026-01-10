import { mktN64DecompressImage } from '../asm/decompressMktN64';
import type { ImageMetaData } from '../asm/filterFiles';
import { makeProcessor, makeProcessors } from './processor';
import { Requester } from './requester';
import { WorkerClient } from './WorkerClient';

export function processMessage(msgId: any, request: unknown) {
    try {
        const response = foodecompress_image(
            new Uint8Array(),
            new Uint8Array(),
            {},
        );
        // const err = new Error('oh no!');
        self.postMessage({ msgId, response });
    } catch (err) {
        self.postMessage({ msgId, err });
    }
}

function foodecompress_image(
    buffer: Uint8Array,
    dictionary: Uint8Array | undefined,
    meta: ImageMetaData,
) {
    return mktN64DecompressImage(buffer, dictionary, meta);
}

function helloWorld(world: string) {
    return `hello ${world}`;
}

// example table
export const exampleTable = {
    decompress_image: mktN64DecompressImage,
    helloWorld,
} as const;

export const exampleSingleProcessor = makeProcessor(
    self,
    mktN64DecompressImage,
);

export const exampleProcessorTable = makeProcessors(exampleTable);
// exampleProcessorTable.decompress_image()

const worker: Worker = {} as Worker;
const workerClient = new WorkerClient(worker);
const requester = new Requester(workerClient, exampleTable);
const response = await requester.table.helloWorld('world');
