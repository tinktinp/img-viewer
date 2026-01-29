import type { Plugin } from '../../plugin';
import { DcsItem } from './DcsItem';

let idNum = 0;
function getNextItemId() {
    return `dcs-item-${idNum++}`;
}

const itemLabelPrefix = 'Dcs';

export class DcsPlugin implements Plugin<DcsItem> {
    async getItemsFromFiles(files: File[]): Promise<DcsItem[]> {
        const items = files.flatMap((f) => {
            if (f.name.toLowerCase().endsWith('.u2')) {
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

function getRomSet(files: File[], f: File): File[] {
    const rs: File[] = [];
    const strlen = f.webkitRelativePath.length;
    const prefix = f.webkitRelativePath.substring(0, strlen - f.name.length)
    for (const currFile of files) {
        if (currFile.webkitRelativePath.startsWith(prefix) && currFile.name.match(/[.][uU][0-9]$/)) {
            rs.push(currFile);
        }
    }

    return rs;
}

