import { BasePluginItem, type PluginItem } from '../plugin';
import { makeUmk3IosElementImage } from './Umk3IosMeshElement';
import { parseUmk3IosMeshSet } from './Umk3IosMeshSetParser';
import type { Umk3IosPlugin } from './Umk3IosPlugin';
import { makeUmk3IosTextureElement } from './Umk3IosTextureElement';
import { findTexture } from './umk3-textures';

export interface Umk3IosItemProps {
    id: string;
    label: string;
    file: File;
    plugin: Umk3IosPlugin;
}

export class Umk3IosItem
    extends BasePluginItem
    implements PluginItem, Umk3IosItemProps
{
    id: string;
    label: string;
    file: File;
    plugin: Umk3IosPlugin;

    constructor(props: Umk3IosItemProps) {
        super();
        this.id = props.id;
        this.label = props.label;
        this.file = props.file;
        this.plugin = props.plugin;
    }

    async loadElements() {
        this.dispatchElementsLoaded([
            {
                type: 'section',
                id: 'models',
                sectionId: 'root',
                name: 'Models',
            },
            {
                type: 'section',
                id: 'textures',
                sectionId: 'root',
                name: 'Textures',
            },
        ]);
        const meshes = await parseUmk3IosMeshSet(this.file);
        this.dispatchElementsLoaded(
            meshes.map((mesh) =>
                makeUmk3IosElementImage({
                    item: this,
                    mesh,
                    sectionId: 'models',
                }),
            ),
        );

        const textureObjMap = new Map(
            meshes.flatMap((m) => {
                const t = findTexture(this.plugin, m.header.textureName);
                if (t !== undefined) return [[t.basename, t]];
                return [];
            }),
        );
        this.dispatchElementsLoaded(
            textureObjMap.values().map((texture) =>
                makeUmk3IosTextureElement({
                    item: this,
                    texture,
                    sectionId: 'textures',
                    id: `umk3-ios-tex-${texture.basename}`,
                    name: texture.file.name,
                }),
            ).toArray(),
        );


        this.dispatchElementsFinishedLoading();
    }
}
