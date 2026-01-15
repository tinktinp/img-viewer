import { PVRTDecompressPVRTC } from '@tinktinp/pvrt-decompress';
import { basename } from 'path';
import {
    DataTexture,
    LinearFilter,
    RGB_PVRTC_2BPPV1_Format,
    RGB_PVRTC_4BPPV1_Format,
    RGBA_PVRTC_2BPPV1_Format,
    RGBA_PVRTC_4BPPV1_Format,
    SRGBColorSpace,
    Texture,
} from 'three';
import { PVRLoader } from 'three/addons/loaders/PVRLoader.js';
import { parsePvrContainer } from './pvr-parser';
import type { TextureObj, Umk3IosPlugin } from './Umk3IosPlugin';

const pvrLoader = new PVRLoader();

const formaToName = {
    [RGBA_PVRTC_2BPPV1_Format]: 'RGBA_PVRTC_2BPPV1_Format',
    [RGBA_PVRTC_4BPPV1_Format]: 'RGBA_PVRTC_4BPPV1_Format',
    [RGB_PVRTC_2BPPV1_Format]: 'RGB_PVRTC_2BPPV1_Format:',
    [RGB_PVRTC_4BPPV1_Format]: 'RGB_PVRTC_4BPPV1_Format',
} as const;
type Format = keyof typeof formaToName;

export function getTextureBasename(textureName: string) {
    let textureBaseName = textureName.toLowerCase();
    const lastDot = textureName.lastIndexOf('.');
    if (lastDot) textureBaseName = textureBaseName.substring(0, lastDot);

    return textureBaseName;
}

export function findTexture(plugin: Umk3IosPlugin, textureName: string) {
    if (textureName === 'NOTEXTURE') {
        return undefined;
    }

    const textureBaseName = getTextureBasename(textureName);

    const t = plugin.textures.get(textureBaseName);
    if (t) {
        // console.log('found for %s: %o', textureName, t);
        return t;
    } else {
        console.warn('no texture found for %s', textureName);
        return undefined;
    }
}

export async function loadTexture(plugin: Umk3IosPlugin, textureName: string) {
    const textureBaseName = getTextureBasename(textureName);
    const cachedTexture = plugin.textureCache.get(textureBaseName);

    if (cachedTexture !== undefined) {
        return cachedTexture;
    }

    const texture = loadTextureReal(plugin, textureName);
    if (texture !== undefined) {
        plugin.textureCache.set(textureBaseName, texture);
    }
    return texture;
}

export async function loadTextureReal(
    plugin: Umk3IosPlugin,
    textureName: string,
) {
    const t = findTexture(plugin, textureName);
    if (t === undefined) return undefined;

    if (t.file && t.ext === 'pvr') {
        const { data: uncompressed, width, height } = await uncompressPvr(t);

        const texture = new DataTexture(
            new Uint8Array(uncompressed, 0, uncompressed.byteLength),
            width,
            height,
        );
        texture.name = t.basename;
        texture.minFilter = LinearFilter;
        texture.colorSpace = SRGBColorSpace;
        texture.needsUpdate = true;

        return texture;
    } else if (t.ext === 'png') {
        const imageBitmap = await createImageBitmap(t.file);
        const texture = new Texture(imageBitmap);
        texture.name = t.basename;
        texture.minFilter = LinearFilter;
        texture.colorSpace = SRGBColorSpace;
        texture.needsUpdate = true;

        return texture;
    }
}

const useThree = false;

export async function uncompressPvr(textureObj: TextureObj) {
    const buffer = await textureObj.file.arrayBuffer();
    const parseResults = parsePvrContainer(buffer);
    // console.log(textureObj.basename, { otherParserResults: parseResults });
    if (parseResults === undefined) {
        throw new Error('failed to parse PVR container!');
    }
    if (useThree) {
        const pvr = pvrLoader.parse(buffer, true);

        const { mipmaps, format } = pvr;
        const { width, height, data } = mipmaps[0];

        const data2 = data.slice(0); // this was the key!
        console.log(textureObj, pvr, formaToName[format as Format]);

        const twoBit =
            format === RGBA_PVRTC_2BPPV1_Format ||
            format === RGB_PVRTC_2BPPV1_Format;
        const uncompressed = PVRTDecompressPVRTC({
            compressedData: data2.buffer,
            do2bitMode: twoBit,
            xDim: width,
            yDim: height,
        });

        return {
            width,
            height,
            pixelFormat: formaToName[format as Format],
            data: uncompressed,
        };
    }
    const {
        header: { height, width, pixelFormat },
        data,
    } = parseResults;

    const data2 = data.slice(0);
    let uncompressed: ArrayBufferLike;

    if (pixelFormat === 'ARGB 4444') {
        uncompressed = argba4444ToRgba8888(data);
    } else if (pixelFormat === 'PVRTC2') {
        uncompressed = PVRTDecompressPVRTC({
            compressedData: data2.buffer,
            do2bitMode: true,
            xDim: width,
            yDim: height,
        });
    } else if (pixelFormat === 'PVRTC4') {
        uncompressed = PVRTDecompressPVRTC({
            compressedData: data2.buffer,
            do2bitMode: false,
            xDim: width,
            yDim: height,
        });
        // uncompressed = abgrToRgba(uncompressed); // maybe?
    } else {
        console.log(
            'pixelFormat not implemented!',
            pixelFormat,
            parseResults.header.rawPixelFormat,
        );
        uncompressed = new ArrayBuffer(0);
    }

    return {
        width,
        height,
        pixelFormat,
        data: uncompressed,
    };
}

/**
 * this turns out not be used in the files after all. Darn, that would
 * have made things simpler!
 */
function argba4444ToRgba8888(data: Uint8Array<ArrayBufferLike>) {
    const outData = new Uint32Array(data.byteLength * 2);

    for (let i = 0, j = 0; i < data.byteLength; i += 2, j++) {
        const ar = data[i];
        const gb = data[i + 1];

        const a = scale4To8(ar >>> 4);
        const r = scale4To8(ar & 0xf);
        const g = scale4To8(gb >>> 4);
        const b = scale4To8(gb & 0xf);

        outData[j] = (r << 24) | (g << 16) | (b << 8) | a;
    }
    return outData.buffer;
}

function scale4To8(four: number) {
    return Math.floor((four * 255) / 15);
}

// function abgrToRgba(buffer: ArrayBufferLike) {
//     const outData = new Uint32Array(buffer.byteLength / 4);
//     const inData = new Uint32Array(buffer);

//     for (let i = 0; i < inData.length; i++) {
//         const word = inData[i];
//         outData[i] =
//             (word << 24) |
//             ((word << 8) & 0x00ff_0000) |
//             ((word >>> 8) & 0x0000_ff00) |
//             (word >>> 24);
//     }

//     return outData.buffer;
// }
