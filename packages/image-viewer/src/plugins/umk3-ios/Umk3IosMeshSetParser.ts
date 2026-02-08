/**
 * Parse meshsets as found in the UMK3 iOS app.
 *
 * Based on ermaccer's awesome https://github.com/ermaccer/UMK3IOS.MeshSetTool
 */

import { BufferPtr } from '../../asm/BufferPtr';

export interface Mesh {
    header: ModelHeader;
    faces: Face[];
    verts: Vert[];
}

export interface ModelHeader {
    modelName: string; //char mdlName[64];
    textureName: string; //char textureName[64];
    vertCount: number; //int verts;  // meshset verts
    faceCount: number; //int faces;  // meshset indexes
    flt: number; //float flt;
}

interface Face {
    f: [number, number, number]; //short f[3];
}

interface Vert {
    field0: [number, number, number]; //short field0[3];
    uv: [number, number]; //float uv[2];
    unk: [number, number, number]; //float unk[3];
}

const oldFormatFiles = new Set([
    'TEMPLEBACKGROUND_00.meshset'.toLowerCase(),
    'TEMPLEFOREGROUND_00.meshset'.toLowerCase(),
]);

/**
 * Parse a `.meshset` file.
 *
 * Trying something different here and taking a `Blob`, with the idea being
 * that may end up working better if this method is called from a Worker.
 */
export async function parseUmk3IosMeshSet(meshSetBlob: File) {
    const oldFormat = oldFormatFiles.has(meshSetBlob.name.toLowerCase());

    const arrayBuffer = await meshSetBlob.arrayBuffer();
    const ptr = new BufferPtr(arrayBuffer);

    const modelCount = ptr.getAndInc32();
    const meshes: Mesh[] = [];

    for (let i = 0; i < modelCount; i++) {
        const header = parseModelHeader(ptr, oldFormat);
        const faces = parseFaces(ptr, header.faceCount);
        const verts = parseVerts(ptr, header.vertCount, oldFormat);

        meshes.push({
            header,
            faces,
            verts,
        });
        // pFile.read((char*)&h, sizeof(header));
        // faceCount: pFile.read((char*)&f, sizeof(face));
        // vecCount: pFile.read((char*)&v, sizeof(vert));
    }
    return meshes;
}

function parseModelHeader(ptr: BufferPtr, oldFormat: boolean): ModelHeader {
    const modelName = ptr.getAndIncStaticStr(64);
    const textureName = ptr.getAndIncStaticStr(64);
    const vertCount = ptr.getAndInc32();
    const faceCount = ptr.getAndInc32();
    let flt = 0;
    if (!oldFormat) {
        flt = ptr.getAndIncFloat32();
    }

    return { modelName, textureName, vertCount, faceCount, flt };
}

function parseFaces(ptr: BufferPtr, count: number) {
    const faces: Face[] = [];
    for (let i = 0; i < count; i++) {
        //
        faces.push({
            f: [ptr.getAndInc16(), ptr.getAndInc16(), ptr.getAndInc16()],
        });
    }
    return faces;
}

const maxS16 = 32767;

function parseVerts(ptr: BufferPtr, count: number, oldFormat: boolean) {
    const verts: Vert[] = [];
    for (let i = 0; i < count; i++) {
        //
        verts.push({
            field0: [
                ptr.getAndIncS16() / maxS16,
                ptr.getAndIncS16() / maxS16,
                ptr.getAndIncS16() / maxS16,
            ],
            uv: [ptr.getAndIncFloat32(), ptr.getAndIncFloat32()],
            unk: [
                oldFormat
                    ? ptr.getAndIncS16() / maxS16
                    : ptr.getAndIncFloat32(),
                oldFormat
                    ? ptr.getAndIncS16() / maxS16
                    : ptr.getAndIncFloat32(),
                oldFormat
                    ? ptr.getAndIncS16() / maxS16
                    : ptr.getAndIncFloat32(),
            ],
        });
    }
    return verts;
}
