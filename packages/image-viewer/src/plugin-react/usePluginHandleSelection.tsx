import { useCallback, useState } from 'react';
import { Scene } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { downloadFile, paletteToAct } from '../downloadUtils';
import type { PluginElement } from '../plugin/plugin';
import {
    addSelection,
    type FancySelectionObj,
    removeSelection,
} from '../Selection';
import { PluginSidebarDetails } from './PluginSidebarDetails';
import { useGetStoreFromContext } from './store';

const gltfExporter = new GLTFExporter();

export function usePluginHandleSelection() {
    const store = useGetStoreFromContext();
    const [selectionMap] = useState(
        () => new Map<string, PluginFancySelectionObj>(),
    );

    const handlePluginChecked: React.MouseEventHandler<HTMLInputElement> =
        useCallback(
            (e) => {
                const target = findClickEventTarget(e);
                if (!target) {
                    return;
                }
                const id = target.value;
                if (!id) {
                    return;
                }
                const pluginElement = store.state.byId[id];
                if (!pluginElement) {
                    return;
                }

                const fancySelectionObj =
                    selectionMap.get(id) ||
                    new PluginFancySelectionObj(pluginElement);
                selectionMap.set(id, fancySelectionObj);

                if (target.checked) {
                    addSelection({ fancySelectionObjs: [fancySelectionObj] });
                } else {
                    removeSelection({
                        fancySelectionObjs: [fancySelectionObj],
                    });
                }
            },
            [store, selectionMap],
        );

    return handlePluginChecked;
}

export class PluginFancySelectionObj implements FancySelectionObj {
    SideBarComponent = () => {
        return <PluginSidebarDetails selectionObj={this} />;
    };

    onDownload = async () => {
        const pe = this.pluginElement;
        switch (pe.type) {
            case 'image':
                if (pe.toPng) {
                    const data = await pe.toPng();

                    downloadFile({
                        name: `${pe.name}.png`,
                        type: 'image/png',
                        data,
                    });
                }
                break;
            case 'palette':
                {
                    const data = paletteToAct(await pe.rgba());
                    downloadFile({
                        name: `${pe.name}.act`,
                        type: 'application/data',
                        data,
                    });
                }
                break;
            case 'mesh':
                {
                    const mesh = await pe.toMesh?.();
                    if (mesh) {
                        const scene = new Scene();
                        scene.add(mesh);
                        const data = (await gltfExporter.parseAsync(scene, {
                            binary: true,
                        })) as ArrayBuffer;

                        downloadFile({
                            name: `${pe.name}.glb`,
                            type: 'model/gltf-binary',
                            data,
                        });
                    }
                }
                break;

            case 'audio':
                {
                    const wavData = await pe.toWav?.();
                    if (wavData) {
                        downloadFile({
                            name: `${pe.name}.wav`,
                            type: 'audio/wave',
                            data: wavData,
                        });
                    }
                }
                break;
        }
    };

    pluginElement: PluginElement;

    constructor(pluginElement: PluginElement) {
        this.pluginElement = pluginElement;
    }
}

function findClickEventTarget(
    e: React.MouseEvent<HTMLInputElement | HTMLLabelElement | HTMLElement>,
): HTMLInputElement | undefined {
    const target: HTMLLabelElement | HTMLInputElement = e.target as
        | HTMLInputElement
        | HTMLLabelElement;

    if ('control' in target) {
        const control = target.control;
        if (control instanceof HTMLInputElement) {
            return control;
        }
    } else if (target instanceof HTMLInputElement) {
        return target;
    }
}
