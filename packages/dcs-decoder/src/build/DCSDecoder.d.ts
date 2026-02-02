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
  _malloc(_0: number): number;
  _free(_0: number): void;
}

export interface ClassHandle {
  isAliasOf(other: ClassHandle): boolean;
  delete(): void;
  deleteLater(): this;
  isDeleted(): boolean;
  // @ts-ignore - If targeting lower than ESNext, this symbol might not exist.
  [Symbol.dispose](): void;
  clone(): this;
}
export interface DCSDecoder extends ClassHandle {
}

export interface DCSDecoderHost extends ClassHandle {
}

export interface DCSDecoderMinHost extends ClassHandle {
}

export interface DCSDecoderNative extends ClassHandle {
}

export interface DCSDecoderWasm extends ClassHandle {
  readonly myInt: number;
  decoder(): DCSDecoderNative;
  softBoot(): void;
  checkRoms(): number;
  getMaxTrackNumber(): number;
  setMasterVolume(_0: number): void;
  addRom(_0: number, _1: Uint8Array): void;
  getStreamInfo(_0: number): DCSDecoderNativeStreamInfo;
  extractStream(_0: number): Uint8Array;
  getStreamInfoFromPtr(_0: number): DCSDecoderNativeStreamInfo;
  extractStreamFromPtr(_0: number): Uint8Array;
  getSignature(): string;
  listStreams(): any;
}

export interface VectorUint8 extends ClassHandle {
  push_back(_0: number): void;
  resize(_0: number, _1: number): void;
  size(): number;
  get(_0: number): number | undefined;
  set(_0: number, _1: number): boolean;
}

export interface VectorROMPointer extends ClassHandle {
  push_back(_0: DCSDecoderROMPointer): void;
  resize(_0: number, _1: DCSDecoderROMPointer): void;
  size(): number;
  get(_0: number): DCSDecoderROMPointer | undefined;
  set(_0: number, _1: DCSDecoderROMPointer): boolean;
}

export type DCSDecoderNativeStreamInfo = {
  nFrames: number,
  nBytes: number,
  formatType: number,
  formatSubType: number
};

export type DCSDecoderROMPointer = {
  chipSelect: number,
  p: number
};

interface EmbindModule {
  DCSDecoder: {};
  DCSDecoderHost: {};
  DCSDecoderMinHost: {
    new(): DCSDecoderMinHost;
  };
  DCSDecoderNative: {
    new(_0: DCSDecoderHost | null): DCSDecoderNative;
  };
  DCSDecoderWasm: {
    new(): DCSDecoderWasm;
  };
  VectorUint8: {
    new(): VectorUint8;
  };
  VectorROMPointer: {
    new(): VectorROMPointer;
  };
}

export type MainModule = WasmModule & typeof RuntimeExports & EmbindModule;
export default function MainModuleFactory (options?: unknown): Promise<MainModule>;
