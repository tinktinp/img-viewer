import type { Plugin } from '../../plugin';
import { DcsItem } from './DcsItem';
import { getRomSet } from './getRomSet';

let idNum = 0;
function getNextItemId() {
    return `dcs-item-${idNum++}`;
}

const itemLabelPrefix = 'Dcs';

export class DcsPlugin implements Plugin<DcsItem> {
    async getItemsFromFiles(files: File[]): Promise<DcsItem[]> {
        const items = files.flatMap((f) => {
            const lcfname = f.name.toLowerCase();
            if (lcfname.endsWith('.u2') || lcfname === 'u2.rom' || lcfname === 'su2.l1') {
                const item = new DcsItem({
                    id: getNextItemId(),
                    label: `${itemLabelPrefix}/${f.webkitRelativePath}`,
                    roms: getRomSet(files, f),
                });
                return [item];
            } else {
                return [];
            }
        });

        return items;
    }
}


