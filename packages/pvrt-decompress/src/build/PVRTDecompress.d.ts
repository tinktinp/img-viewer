// TypeScript bindings for emscripten-generated code.  Automatically generated at compile time.
declare namespace RuntimeExports {
    /**
     * @param {string|null=} returnType
     * @param {Array=} argTypes
     * @param {Array=} args
     * @param {Object=} opts
     */
    function ccall(ident: any, returnType?: (string | null) | undefined, argTypes?: any[] | undefined, args?: any[] | undefined, opts?: any | undefined): any;
    /**
     * @param {string=} returnType
     * @param {Array=} argTypes
     * @param {Object=} opts
     */
    function cwrap(ident: any, returnType?: string | undefined, argTypes?: any[] | undefined, opts?: any | undefined): any;
    /**
     * @param {number} ptr
     * @param {string} type
     */
    function getValue(ptr: number, type?: string): any;
    /**
     * @param {number} ptr
     * @param {number} value
     * @param {string} type
     */
    function setValue(ptr: number, value: number, type?: string): void;
    let HEAPU8: any;
    function writeArrayToMemory(array: any, buffer: any): void;
}
interface WasmModule {
  __Z19PVRTDecompressPVRTCPKvjjjPh(_0: number, _1: number, _2: number, _3: number, _4: number): number;
  __Z17PVRTDecompressETCPKvjjPvj(_0: number, _1: number, _2: number, _3: number, _4: number): number;
  _malloc(_0: number): number;
  _free(_0: number): void;
}

export type MainModule = WasmModule & typeof RuntimeExports;
export default function MainModuleFactory (options?: unknown): Promise<MainModule>;
