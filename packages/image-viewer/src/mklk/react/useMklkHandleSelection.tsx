/** biome-ignore-all lint/complexity/useArrowFunction: <explanation> */
import { useCallback, useMemo } from 'react';
import { useSelection } from '../../Selection';
import type { MklkImage, MklkSelectionObj, SpriteHeader } from '../MklkTypes';
import { MklkDetails } from './MklkDetails';
import { downloadFile } from '../../downloadUtils';
import { encodeRgba32AsPng } from '../../toPng';

function indexFromId(id: string) {
    const [type, indexStr] = id.split('-');
    return {
        type,
        index: Number.parseInt(indexStr, 10)
    };
}

export function useMklkHandleSelection(images: MklkImage[], sprites: SpriteHeader[]) {
    // biome-ignore lint/correctness/useExhaustiveDependencies: special deps
    const selectionMap: Map<string, MklkSelectionObj> = useMemo(
        () => new Map(),
        [images, sprites],
    );

    const { addSelection, removeSelection } = useSelection();

    const getFancySelectionObj = useCallback(
        function getFancySelectionObj(id: string): MklkSelectionObj {
            const fancySelectionObj = selectionMap.get(id);
            if (fancySelectionObj !== undefined) {
                return fancySelectionObj;
            }
            const {type, index} = indexFromId(id);
            const image = type === 'img' ? images[index] : undefined;
            const sprite = type === 'sprite' ? sprites[index] : undefined;


            const newFancySelectionObj: MklkSelectionObj = {
                image,
                sprite,
                SideBarComponent: () => (
                    <MklkDetails selectionObj={newFancySelectionObj} />
                ),
                onDownload: function (): void {
                    const image =
                        newFancySelectionObj.image ??
                        newFancySelectionObj.sprite;

                    if (image) {
                        try {
                            if (image.data) {
                                const data = encodeRgba32AsPng(
                                    image.data,
                                    image.width,
                                    image.height,
                                );

                                downloadFile({
                                    name: `${type}_${index}.png`,
                                    type: 'image/png',
                                    data,
                                });
                            }
                        } catch (e) {
                            console.log('failed to encode image!', e);
                        }
                    }
                },
            };
            selectionMap.set(id, newFancySelectionObj);

            return newFancySelectionObj;
        },
        [selectionMap, images, sprites],
    );

    const handleMktN64Checked: React.MouseEventHandler<HTMLInputElement> =
        useCallback(
            (e) => {
                const id = e.currentTarget.value;
                const fancySelectionObj = getFancySelectionObj(id);
                if (e.currentTarget.checked) {
                    addSelection({ fancySelectionObjs: [fancySelectionObj] });
                } else {
                    removeSelection({
                        fancySelectionObjs: [fancySelectionObj],
                    });
                }
            },
            [addSelection, removeSelection, getFancySelectionObj],
        );

    return handleMktN64Checked;
}
