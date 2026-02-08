import type { Texture } from 'three';
import type { Plugin } from '../../plugin';
import { Umk3IosItem } from './Umk3IosItem';
import { sortNames } from '../../utils/sortNames';

// let idNum = 0;
// function getNextItemId() {
//     return `umk3-ios-item-${idNum++}`;
// }

const itemLabelPrefix = 'UMK3-iOS';

export interface TextureObj {
    file: File;
    basename: string;
    ext: string;
}

export class Umk3IosPlugin implements Plugin<Umk3IosItem> {
    textures = new Map<string, TextureObj>();
    textureCache = new Map<string, Promise<Texture | undefined>>();

    async getItemsFromFiles(files: File[]): Promise<Umk3IosItem[]> {
        this.textures = new Map();

        const items = files.flatMap((f) => {
            if (f.name.toLowerCase().endsWith('.meshset')) {
                return [
                    new Umk3IosItem({
                        id: `${itemLabelPrefix}-${f.webkitRelativePath}`,
                        label: `${itemLabelPrefix}/${f.webkitRelativePath}`,
                        file: f,
                        plugin: this,
                    }),
                ];
            }
            return [];
        });

        files.flatMap((f) => {
            // res/Textures/GRAVEYARD_COMPLETEMAP.PNG
            const match = f.webkitRelativePath
                .toLowerCase()
                .match(/[/\\]textures[/\\](?<basename>.*)[.](?<ext>[^.]+)$/);
            if (match?.groups) {
                //
                const { basename, ext } = match.groups;
                this.textures.set(basename, {
                    file: f,
                    basename,
                    ext,
                });
            }
        });

        // items.sort((a, b) => sortNames(a.file.webkitRelativePath, b.file.webkitRelativePath))
        return items;
    }
}
