/** biome-ignore-all lint/complexity/useSimpleNumberKeys: <explanation> */
import { BufferPtr } from '../asm/BufferPtr';
import { toHex } from '../utils/toHex';

const pvrVersion = 0x03525650;
const pvrVersionEndianMismatch = 0x50565203;

// looks like we're dealing with v2:
// https://github.com/powervr-graphics/Native_SDK/blob/master/framework/PVRCore/textureio/FileDefinesPVR.h
// https://github.com/powervr-graphics/Native_SDK/blob/master/framework/PVRCore/textureio/TextureReaderPVR.cpp
// https://powervr-graphics.github.io/WebGL_SDK/WebGL_SDK/Documentation/Specifications/PVR%20File%20Format.Specification.Legacy.pdf

export function parsePvrContainer(buffer: ArrayBufferLike) {
    const dv = new DataView(buffer);
    const firstWord = dv.getUint32(0, true);
    if (firstWord === 44 || firstWord === 52) {
        const obj = parsePvrContainerv2(buffer);
        return {
            ...obj,
            data: new Uint8Array(buffer, firstWord),
        };
    } else {
        const obj = parsePvrContainerv3(buffer);
        if (obj) {
            return {
                ...obj,
                data: new Uint8Array(buffer, 52 + obj.header.metaDataSize),
            };
        }
    }
}

export function parsePvrContainerv2(buffer: ArrayBufferLike) {
    // as documented here: https://docs.imgtec.com/specifications/pvr-file-format-specification/html/topics/pvr-introduction.html
    // and a few other places

    // 52 bytes header
    // meta data
    // texture data

    const ptr = new BufferPtr(buffer);

    let version: 1 | 2;

    const headerSize = ptr.getAndInc32();
    if (headerSize === 52) {
        version = 2;
    } else if (headerSize === 44) {
        version = 1;
    } else {
        throw new Error(`Unknown version! headerSize is ${headerSize}`);
    }
    const height = ptr.getAndInc32();
    const width = ptr.getAndInc32();
    const mipMaps = ptr.getAndInc32();
    let flags = ptr.getAndInc32();
    const pixelFormat = flags & 0xff;
    flags = flags >>> 8;

    const surfaceSize = ptr.getAndInc32();
    const bpp = ptr.getAndInc32();

    const redMask = ptr.getAndInc32();
    const greenMask = ptr.getAndInc32();
    const blueMask = ptr.getAndInc32();
    const alphaMask = ptr.getAndInc32();

    let pvrMagic = undefined;
    let surfaces = undefined;
    if (version === 2) {
        pvrMagic = ptr.getAndInc32();
        surfaces = ptr.getAndInc32();

        if (ptr.offset !== 52) {
            throw new Error(`ptr.offset is not 52, logic error! ${ptr.offset}`);
        }
    } else {
        if (ptr.offset !== 44) {
            throw new Error(`ptr.offset is not 44, logic error! ${ptr.offset}`);
        }
    }

    return {
        header: {
            version,
            height,
            width,
            mipMaps,
            flagsRaw: flags,
            rawPixelFormat: pixelFormat,
            pixelFormat:
                pvrv2PixelFormats[
                    pixelFormat as keyof typeof pvrv2PixelFormats
                ],
            surfaceSize,
            bpp,
            redMask,
            greenMask,
            blueMask,
            alphaMask,
            pvrMagic,
            surfaces,
        },
    };
}

export const pvrv2PixelFormats = {
    //
    0x0: 'ARGB 4444',
    0x1: 'ARGB 1555',
    0x2: 'RGB 565',
    0x3: 'RGB 555',
    0x4: 'RGB 888',
    0x5: 'ARGB 8888',
    0x6: 'ARGB 8332',
    0x7: 'I 8',
    0x8: 'AI 88',
    0x9: '1BPP',
    0xa: '(V,Y1,U,Y0)',
    0xb: '(Y1,V,Y0,U)',
    0xc: 'PVRTC2',
    0xd: 'PVRTC4',
    0x10: 'ARGB 4444',
    0x11: 'ARGB 1555',
    0x12: 'ARGB 8888',
    0x13: 'RGB 565',
    0x14: 'RGB 555',
    0x15: 'RGB 888',
    0x16: 'I 8',
    0x17: 'AI 88',
    0x18: 'PVRTC2',
    0x19: 'PVRTC4',
    0x1a: 'BGRA 8888',
    0x20: 'DXT1',
    0x21: 'DXT2',
    0x22: 'DXT3',
    0x23: 'DXT4',
    0x24: 'DXT5',
    0x25: 'RGB 332',
    0x26: 'AL 44',
    0x27: 'LVU 655',
};

export function parsePvrContainerv3(buffer: ArrayBufferLike) {
    // as documented here: https://docs.imgtec.com/specifications/pvr-file-format-specification/html/topics/pvr-introduction.html
    // and a few other places

    // 52 bytes header
    // meta data
    // texture data

    const ptr = new BufferPtr(buffer);
    const version = ptr.getAndInc32();
    if (version === pvrVersionEndianMismatch) {
        ptr.le = false;
    } else if (version !== pvrVersion) {
        console.warn('Bad version %s, not a PVR file!', toHex(version));
        return undefined;
    }
    const flags = ptr.getAndInc32();
    const premultiplied = flags & 0x02;

    const pixelFormat = ptr.getAndInc64();
    const colorSpace = ptr.getAndInc32();
    const channelType = ptr.getAndInc32();
    const height = ptr.getAndInc32();
    const width = ptr.getAndInc32();
    const depth = ptr.getAndInc32();
    const surfaces = ptr.getAndInc32();
    const faces = ptr.getAndInc32();
    const mipMaps = ptr.getAndInc32();
    const metaDataSize = ptr.getAndInc32();

    if (ptr.offset !== 52) {
        throw new Error(`offset is ${ptr.offset} and should be 52!`);
    }

    return {
        header: {
            version: 3,
            pvrMagic: version,
            flagsRaw: flags,
            flags: {
                premultiplied,
            },
            rawPixelFormat: pixelFormat,
            pixelFormat: undefined,
            colorSpaceRaw: colorSpace,
            colorSpace: colorSpace === 0 ? 'linear-rgb' : 'srgb',
            channelType,
            height,
            width,
            depth,
            surfaces,
            faces,
            mipMaps,
            metaDataSize,
        },
    };
}


