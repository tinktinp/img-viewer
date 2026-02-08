import type { PluginElementImage } from '../../plugin';
import { encodeRgba32AsPng } from '../../toPng';
import type { Umk3IosItem } from './Umk3IosItem';
import type { TextureObj } from './Umk3IosPlugin';
import { uncompressPvr } from './umk3-textures';

export interface Umk3IosTextureElement
    extends PluginElementImage,
        Umk3IosTextureElementProps {
    //
}

export interface Umk3IosTextureElementProps {
    item: Umk3IosItem;
    texture: TextureObj;
    id: string;
    name: string;
    sectionId: string;
}

export function makeUmk3IosTextureElement(
    props: Umk3IosTextureElementProps,
): Umk3IosTextureElement {
    return {
        ...props,
        type: 'image',
        async toPng() {
            return toPng(this);
        },
    };
}

async function toPng(element: Umk3IosTextureElement) {
    if (element.texture.ext === 'pvr') {
        // TODO: pull from cache
        const { width, height, data } = await uncompressPvr(element.texture);

        return encodeRgba32AsPng(new Uint8Array(data), width, height).buffer;
    } else if (element.texture.ext === 'png') {
        return element.texture.file.arrayBuffer();
    } else {
        throw new Error(
            `unsupported texture type! ${element.texture.basename}.${element.texture.ext}`,
        );
    }
}
