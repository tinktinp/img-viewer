import type { Plugin } from '../plugin';
import { ArcadeRomsItem } from './ArcadeRomsItem';
import { supportedRoms } from './RomInfo';

let idNum = 0;
function getNextItemId() {
    return `arcade-roms-item-${idNum++}`;
}

const itemLabelPrefix = 'ArcadeRom';

export class ArcadeRomsPlugin implements Plugin<ArcadeRomsItem> {
    async getItemsFromFiles(files: File[]): Promise<ArcadeRomsItem[]> {
        const filenameMap = new Map(
            files.map((f) => {
                //
                return [f.name, f];
            }),
        );
        const items = supportedRoms.map(async (romInfo) => {
            const cpuFile = filenameMap.get(romInfo.cpuFile);
            const gfxFile = filenameMap.get(romInfo.gfxFile);

            if (cpuFile !== undefined && gfxFile !== undefined) {
                const item = new ArcadeRomsItem({
                    id: getNextItemId(),
                    label: `${itemLabelPrefix}/${romInfo.name}`,
                    cpuFile,
                    cpuBuffer: await cpuFile.arrayBuffer(),
                    gfxFile,
                    gfxBuffer: await gfxFile.arrayBuffer(),
                    romInfo,
                });
                return [item];
            } else {
                return [];
            }
        });
        return (await Promise.all(items)).flat();
    }
}
