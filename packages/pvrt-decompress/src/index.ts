import MainModuleFactory, { type MainModule } from './build/PVRTDecompress';

export interface FixedWasmModule {
    HEAPU8: Uint8Array;
}

const Module: FixedWasmModule & Omit<MainModule, 'HEAPU8'> =
    await MainModuleFactory();

export interface PVRTDecompressPVRTCOpts {
    compressedData: ArrayBufferLike;
    do2bitMode: boolean;
    xDim: number;
    yDim: number;
}

export function PVRTDecompressPVRTC({
    compressedData,
    do2bitMode,
    xDim,
    yDim,
}: PVRTDecompressPVRTCOpts): ArrayBufferLike {
    const compressedDataWasmBuffer = Module._malloc(compressedData.byteLength);
    Module.HEAPU8.set(new Uint8Array(compressedData), compressedDataWasmBuffer);

    const resultBufferSize = xDim * yDim * 4;
    const outResultWasmBuffer = Module._malloc(resultBufferSize);

    Module.__Z19PVRTDecompressPVRTCPKvjjjPh(
        compressedDataWasmBuffer,
        do2bitMode ? 1 : 0,
        xDim,
        yDim,
        outResultWasmBuffer,
    );

    const result = Module.HEAPU8.slice(
        outResultWasmBuffer,
        outResultWasmBuffer + resultBufferSize,
    );

    Module._free(compressedDataWasmBuffer);
    Module._free(outResultWasmBuffer);

    return result.buffer;
}

// export function PVRTDecompressETC() {
//     // uint32_t EMSCRIPTEN_KEEPALIVE PVRTDecompressETC(const void* srcData, uint32_t xDim, uint32_t yDim, void* dstData, uint32_t mode);

//     Module.__Z17PVRTDecompressETCPKvjjPvj(1, 2, 3, 4, 5);
// }
