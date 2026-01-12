import { BufferPtr } from '../asm/BufferPtr';
import { processPaletteInFormat } from '../palettes/palettes';
import { BasePluginItem, type PluginElement, type PluginItem } from '../plugin';
import {
    type ArcadeRomsElementPalette,
    makeArcadeRomsElementImage,
    makeArcadeRomsElementPalette,
} from './ArcadeRomsElement';
import type { RomInfo } from './RomInfo';
import { decodeAsRaw, dumpRomMetadata, extendPalette } from './roms';

export interface ArcadeRomsItemProps {
    id: string;
    label: string;
    romInfo: RomInfo;
    cpuFile: File;
    cpuBuffer: ArrayBufferLike;
    gfxFile: File;
    gfxBuffer: ArrayBufferLike;
}
export class ArcadeRomsItem
    extends BasePluginItem
    implements PluginItem, ArcadeRomsItemProps
{
    id: string;
    label: string;
    romInfo: RomInfo;

    cpuFile: File;
    cpuBuffer: ArrayBufferLike;
    gfxFile: File;
    gfxBuffer: ArrayBufferLike;
    paletteMap: Map<number, ArcadeRomsElementPalette>;

    constructor({
        id,
        label,
        romInfo,
        cpuFile,
        cpuBuffer,
        gfxFile,
        gfxBuffer,
    }: ArcadeRomsItemProps) {
        super();
        this.id = id;
        this.label = label;
        this.romInfo = romInfo;
        this.cpuFile = cpuFile;
        this.cpuBuffer = cpuBuffer;
        this.gfxFile = gfxFile;
        this.gfxBuffer = gfxBuffer;
        this.paletteMap = new Map();
    }

    async loadElements() {
        const results = dumpRomMetadata({
            maincpu: this.cpuBuffer,
            gfxrom: this.gfxBuffer,
            mk1Mode: !!this.romInfo.mk1Mode,
        });

        const imageSectionsCount = Math.ceil(results.length / 255);
        const imageSections: PluginElement[] = [];
        for (let i = 0; i < imageSectionsCount; i++) {
            imageSections.push({
                type: 'section',
                id: `images-${i}`,
                sectionId: 'root',
                name: `Images (${i * 255 + 1} to ${Math.min((i + 1) * 255, results.length) + 1})`,
            });
        }
        this.dispatchElementsLoaded([
            ...imageSections,
            {
                type: 'section',
                id: 'palettes',
                sectionId: 'root',
                name: 'Palettes',
            },
        ]);

        const paletteMap = new Map(
            results.flatMap((r) => {
                if (r.paletteAddr) {
                    const { rgb } = processPaletteInFormat(
                        new BufferPtr(this.cpuBuffer, r.paletteAddr),
                        '',
                        'XRGB1555',
                    );
                    if (
                        rgb &&
                        rgb.length > 0 &&
                        rgb.length < 255 &&
                        rgb?.[0]?.length === 4
                    ) {
                        // const palette = extendPalette(
                        //     rgb as [number, number, number, number][],
                        // );
                        const pe = makeArcadeRomsElementPalette({
                            item: this,
                            rgbaData: rgb,
                            paletteAddr: r.paletteAddr,
                        });
                        return [[r.paletteAddr, pe]];
                    }
                }
                return [];
            }),
        );
        this.paletteMap = paletteMap;
        const paletteElements = paletteMap.values().toArray();
        this.dispatchElementsLoaded(paletteElements);

        let lastPalette = paletteElements[0];
        const imageElements = results.flatMap((metadata, idx) => {
            const { paletteAddr } = metadata;
            if (paletteAddr) {
                const paletteElement = paletteMap.get(paletteAddr);
                if (paletteElement) {
                    lastPalette = paletteElement;
                }
            }

            const indexedPixelData = decodeAsRaw(
                metadata,
                new Uint8Array(this.gfxBuffer),
            );
            if (
                indexedPixelData &&
                indexedPixelData.byteLength > 0 &&
                !isAllZeros(indexedPixelData)
            ) {
                return [
                    makeArcadeRomsElementImage({
                        item: this,
                        metadata,
                        indexedPixelData,
                        palette: lastPalette,
                        sectionId: `images-${Math.floor(idx / 255)}`,
                    }),
                ];
            }
            return [];
        });

        this.dispatchElementsLoaded(imageElements);

        this.dispatchElementsFinishedLoading();
    }
}

function isZero(n: number) {
    return n === 0;
}
function isAllZeros(buffer: Uint8Array) {
    return buffer.every(isZero);
}
