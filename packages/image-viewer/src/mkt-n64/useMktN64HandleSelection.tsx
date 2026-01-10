/** biome-ignore-all lint/complexity/useArrowFunction: <explanation> */
import { useMemo, useCallback } from 'react';
import type { ImageMetaData, MktN64Dict } from '../asm/filterFiles';
import type { LiteralDataEntry } from '../asm/parser';
import { mktN64ImageDecompressToPng } from '../consume-worker';
import { downloadFile, paletteToAct } from '../downloadUtils';
import { paletteBufferToRgbArray } from '../parse-image-header';
import {
    type FancySelectionObj,
    addSelection,
    removeSelection,
} from '../Selection';
import { MktN64Details } from './MktN64Details';
import { getSettingsSnapshot, useSettingsOpt } from '../Settings';

export interface MktN64SelectionObj extends FancySelectionObj {
    image?: {
        index: number | string;
        label: string;
        meta: ImageMetaData | undefined;
        imageData: ArrayBuffer;
        dict?: MktN64Dict;
    };
    palette?: LiteralDataEntry;
    paletteData: ArrayBuffer;
    paletteFormat: string;
}

function indexFromId(id: string): { index: number; fileHash: string } {
    if (id.startsWith('img-')) {
        return { index: Number.parseInt(id.substring(4), 10), fileHash: '' };
    }
    const pieces = id.split('-');
    return {
        index: Number.parseInt(pieces[1], 10),
        fileHash: pieces[3],
    };
}

export function useMktN64HandleSelection(
    images: LiteralDataEntry[],
    metaMap: Map<string, ImageMetaData>,
) {
    // biome-ignore lint/correctness/useExhaustiveDependencies: special deps
    const selectionMap: Map<string, MktN64SelectionObj> = useMemo(
        () => new Map(),
        [images],
    );

    // const { addSelection, removeSelection } = useSelection();

    const getFancySelectionObj = useCallback(
        function getFancySelectionObj(id: string): MktN64SelectionObj {
            const {
                mktPalettes: paletteFiles,
                mktPalette,
                mktPaletteFormat: paletteFormat,
                mktDictIndex,
                mktDicts,
            } = getSettingsSnapshot(
                'mktPalettes',
                'mktDictIndex',
                'mktDicts',
                'mktPalette',
                'mktPaletteFormat',
            );
            const dict = mktDicts[mktDictIndex];
            const paletteToUse =
                paletteFiles[mktPalette[0]]?.palettes[mktPalette[1]];

            const fancySelectionObj = selectionMap.get(id);
            if (fancySelectionObj !== undefined) {
                return fancySelectionObj;
            }
            let newFancySelectionObj: MktN64SelectionObj;
            newFancySelectionObj = {
                paletteData: paletteToUse?.data,
                paletteFormat,
                SideBarComponent: () => (
                    <MktN64Details selectionObj={newFancySelectionObj} />
                ),
                onDownload: async function (): Promise<void> {
                    if (newFancySelectionObj.image) {
                        const {
                            image: { index, label, meta, imageData, dict },
                            paletteFormat,
                            paletteData,
                        } = newFancySelectionObj;

                        try {
                            const data = await mktN64ImageDecompressToPng(
                                meta,
                                imageData,
                                paletteData,
                                paletteFormat,
                                dict?.data,
                            );

                            downloadFile({
                                name: `${index}_${label}.png`,
                                type: 'image/png',
                                data,
                            });
                        } catch (e) {
                            console.log('failed to encode image!', meta, e);
                        }
                    } else if (newFancySelectionObj.palette) {
                        const { palette, paletteData, paletteFormat } =
                            newFancySelectionObj;
                        const paletteDataView = new DataView(paletteData);
                        const rgb = paletteBufferToRgbArray(
                            paletteDataView,
                            paletteDataView.byteLength / 2,
                            0,
                            paletteFormat,
                        );
                        const data = paletteToAct(rgb);
                        downloadFile({
                            name: `${palette.label}.act`,
                            type: 'application/data',
                            data,
                        });
                    }
                },
            };
            selectionMap.set(id, newFancySelectionObj);

            const { index, fileHash } = indexFromId(id);
            if (id.startsWith('img-')) {
                const { label, data: imageData } = images[index];
                const meta = metaMap.get(label);

                newFancySelectionObj.image = {
                    index,
                    label,
                    meta,
                    imageData,
                    dict,
                };
            } else if (id.startsWith('pal-')) {
                newFancySelectionObj.palette = paletteFiles.find(
                    (f) => f.hash === fileHash,
                )?.palettes[index];
            }
            return newFancySelectionObj;
        },
        [selectionMap, images, metaMap],
    );

    const handleMktN64Checked: React.MouseEventHandler<HTMLInputElement> =
        useCallback(
            (e) => {
                const target = findTarget(e);
                if (!target) {
                    return;
                }
                const id = target.value;

                if (!id) {
                    return;
                }
                const fancySelectionObj = getFancySelectionObj(id);

                if (target.checked) {
                    addSelection({ fancySelectionObjs: [fancySelectionObj] });
                } else {
                    removeSelection({
                        fancySelectionObjs: [fancySelectionObj],
                    });
                }
            },
            [getFancySelectionObj],
        );

    return handleMktN64Checked;
}

function findTarget(
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
