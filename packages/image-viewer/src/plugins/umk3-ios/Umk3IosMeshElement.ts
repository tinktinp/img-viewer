import { PVRTDecompressPVRTC } from '@tinktinp/pvrt-decompress';
import * as THREE from 'three';
import {
    CompressedTexture,
    DataTexture,
    LinearFilter,
    LinearSRGBColorSpace,
    type MeshStandardMaterialParameters,
    RepeatWrapping,
    RGB_PVRTC_2BPPV1_Format,
    RGB_PVRTC_4BPPV1_Format,
    RGBA_PVRTC_2BPPV1_Format,
    RGBA_PVRTC_4BPPV1_Format,
    SRGBColorSpace,
} from 'three';
import type { PluginElementMesh } from '../../plugin';
import type { Umk3IosItem } from './Umk3IosItem';
import type { Mesh } from './Umk3IosMeshSetParser';
import { findTexture, loadTexture, uncompressPvr } from './umk3-textures';

//const PvrtDecompressModule = await LoadPvrtDecompressModule();
//console.log(PvrtDecompressModule);
//const { PVRTDecompressETC, PVRTDecompressPVRTC } = PvrtDecompressModule;

export interface Umk3IosElementMesh
    extends PluginElementMesh,
        Umk3IosElementMeshProps {}

export interface Umk3IosElementMeshProps {
    item: Umk3IosItem;
    sectionId: string;
    mesh: Mesh;
}

export function makeUmk3IosElementImage(
    props: Umk3IosElementMeshProps,
): Umk3IosElementMesh {
    const { modelName } = props.mesh.header;
    return {
        ...props,
        type: 'mesh',
        id: `mesh-${modelName}`,
        name: `${modelName}`,
        async toMesh() {
            return elementToMesh(this);
        },
    };
}

async function elementToMesh({ mesh, item: { plugin } }: Umk3IosElementMesh) {
    if (mesh.header.modelName.startsWith('JXQAKPRO1')) {
        console.log(mesh);
    }
    const position = new Float32Array(mesh.header.vertCount * 3 * 4);
    const uvs = new Float32Array(mesh.header.vertCount * 2 * 4);
    const normals = new Float32Array(mesh.header.vertCount * 3 * 4);

    mesh.verts.forEach((v, idx) => {
        const posIdx = idx * 3;
        position[posIdx] = v.field0[0];
        position[posIdx + 1] = v.field0[1];
        position[posIdx + 2] = v.field0[2];

        const uvIdx = idx * 2;
        uvs[uvIdx] = v.uv[0];
        uvs[uvIdx + 1] = v.uv[1];

        // TODO: could v.unk be normals? It's assume it is.
        const nIdx = idx * 3;
        normals[nIdx] = v.unk[0];
        normals[nIdx + 1] = v.unk[1];
        normals[nIdx + 2] = v.unk[2];
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

    const indexes = mesh.faces.flatMap((f) => f.f);
    geometry.setIndex(indexes);
    geometry.name = mesh.header.modelName;

    // const textureObj = findTexture(plugin, mesh.header.textureName);

    const materialOpts: MeshStandardMaterialParameters = {
        color: 0x808080,
        roughness: 0.75,
        transparent: true,
        //wireframe: true,
    };

    const texture = await loadTexture(plugin, mesh.header.textureName);
    if (texture) {
        materialOpts.map = texture;
    }

    // const loader = new THREE.TextureLoader();
    // 	const texture = loader.load( 'https://threejs.org/manual/examples/resources/images/star.png' );
    const textureObj: any = undefined;
    if (textureObj?.file && textureObj.ext === 'pvr') {
        const {
            data: uncompressed,
            width,
            height,
        } = await uncompressPvr(textureObj);
        // const pvr = pvrLoader.parse(await textureObj.file.arrayBuffer(), true);
        // const { mipmaps, format } = pvr;
        // const { width, height, data } = mipmaps[0];
        // console.log(textureObj, pvr, formaToName[format as Format]);
        // const twoBit =
        //     format === RGBA_PVRTC_2BPPV1_Format ||
        //     format === RGB_PVRTC_2BPPV1_Format;
        // const uncompressed = PVRTDecompressPVRTC({
        //     compressedData: data.buffer,
        //     do2bitMode: twoBit,
        //     xDim: width,
        //     yDim: height,
        // });
        // console.log('uncompressed', uncompressed);

        // const texture = new CompressedTexture(mipmaps, width, height, format);
        const texture = new DataTexture(
            new Uint8Array(uncompressed, 0, uncompressed.byteLength),
            width,
            height,
        );
        // if (mipmapCount === 1) {
        texture.minFilter = LinearFilter;
        texture.name = textureObj.basename;
        // }
        // texture.wrapS = RepeatWrapping;
        // texture.wrapT = RepeatWrapping;
        texture.colorSpace = SRGBColorSpace;
        //texture.colorSpace = LinearSRGBColorSpace;
        texture.needsUpdate = true;

        // set the texture on the material
        materialOpts.map = texture;
    }

    // const material = new THREE.MeshBasicMaterial(materialOpts);
    const material = new THREE.MeshStandardMaterial(materialOpts);
    material.name = `mat$model:${mesh.header.modelName}-tex:${mesh.header.textureName}`;

    const threejsMesh = new THREE.Mesh(geometry, material);
    threejsMesh.name = mesh.header.modelName;
    return threejsMesh;
}
