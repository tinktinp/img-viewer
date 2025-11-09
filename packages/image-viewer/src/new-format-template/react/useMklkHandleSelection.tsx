/** biome-ignore-all lint/complexity/useArrowFunction: <explanation> */
import { useCallback, useMemo } from 'react';
import { useSelection } from '../../Selection';
import type { MklkImage, MklkSelectionObj } from '../MklkTypes';
import { MklkDetails } from './MklkDetails';
import { downloadFile } from '../../downloadUtils';
import { encodeRgba32AsPng } from '../../toPng';

function indexFromId(id: string): number {
    return Number.parseInt(id.substring(4), 10);
}

export function useMklkHandleSelection(images: MklkImage[]) {
    // biome-ignore lint/correctness/useExhaustiveDependencies: special deps
    const selectionMap: Map<string, MklkSelectionObj> = useMemo(
        () => new Map(),
        [images],
    );

    const { addSelection, removeSelection } = useSelection();

    const getFancySelectionObj = useCallback(
        function getFancySelectionObj(id: string): MklkSelectionObj {
            const fancySelectionObj = selectionMap.get(id);
            if (fancySelectionObj !== undefined) {
                return fancySelectionObj;
            }
            const index = indexFromId(id);
            const image = images[index];

            const newFancySelectionObj: MklkSelectionObj = {
                image,
                SideBarComponent: () => (
                    <MklkDetails selectionObj={newFancySelectionObj} />
                ),
                onDownload: function (): void {
                    if (newFancySelectionObj.image) {
                        const { image } = newFancySelectionObj;

                        try {
                            const data = encodeRgba32AsPng(
                                image.data,
                                image.width,
                                image.height,
                            );

                            downloadFile({
                                name: `${index}_${name}.png`,
                                type: 'image/png',
                                data,
                            });
                        } catch (e) {
                            console.log('failed to encode image!', e);
                        }
                    }
                },
            };
            selectionMap.set(id, newFancySelectionObj);

            return newFancySelectionObj;
        },
        [selectionMap, images],
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
