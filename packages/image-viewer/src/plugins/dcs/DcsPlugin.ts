import { BufferPtr } from '../../asm/BufferPtr';
import type { Plugin } from '../../plugin';
import { toHex } from '../../utils/toHex';
import { DcsItem } from './DcsItem';
import { getRomSet } from './getRomSet';
import {
    type Dir4Container,
    filterWiffBySectionType,
    parseDir4,
    parseWiffDiskImg,
} from './wiff';

let idNum = 0;
function getNextItemId() {
    return `dcs-item-${idNum++}`;
}

const itemLabelPrefix = 'Dcs';

export class DcsPlugin implements Plugin<DcsItem> {
    async getItemsFromFiles(files: File[]): Promise<DcsItem[]> {
        const items = files.map(async (f) => {
            const lcfname = f.name.toLowerCase();
            if (
                lcfname.endsWith('.u2') ||
                lcfname === 'u2.rom' ||
                lcfname === 'su2.l1'
            ) {
                const item = new DcsItem({
                    id: getNextItemId(),
                    label: `${itemLabelPrefix}/${f.webkitRelativePath}`,
                    roms: getRomSet(files, f),
                    dcsType: 'romset',
                });
                return [item];
            } else if (lcfname.endsWith('.bnk') || lcfname.endsWith('.snd4')) {
                const item = new DcsItem({
                    id: getNextItemId(),
                    label: `${itemLabelPrefix}/${f.webkitRelativePath}`,
                    roms: [{ romNumber: -1, file: f }],
                    dcsType: 'bnk',
                });
                return [item];
            } else if (
                lcfname.startsWith('wargods_11-07-1996') ||
                lcfname.startsWith('wargods_08-15-1996') ||
                lcfname.startsWith('wargods_12-11-1995')
            ) {
                return getWargodsItems(f);
            } else {
                return [];
            }
        });

        return (await Promise.all(items)).flat();
    }
}

async function getWargodsItems(f: File) {
    const buffer = await f.arrayBuffer();

    const wiffs = parseWiffDiskImg(new Uint8Array(buffer));
    if (wiffs) {
        const dir4Containers = wiffs
            .flatMap((wiff) => filterWiffBySectionType(wiff, 'DIR4'))
            .flatMap((dc) => {
                try {
                    // console.log(dc);
                    return [
                        parseDir4(
                            new BufferPtr(
                                new Uint8Array(
                                    buffer,
                                    dc.sectionDataOffset,
                                    dc.sectionSize,
                                ),
                            ),
                        ),
                    ];
                } catch (e) {
                    console.log(e);
                    return [{}];
                }
            });

        const fileIdMap = dir4containerToMap(dir4Containers as Dir4Container[]);
        const fileIdSndMap = fileIdMap.get('SND4') || new Map();

        const snd4s = wiffs.flatMap((wiff) =>
            filterWiffBySectionType(wiff, 'SND4'),
        );
        // console.log(snd4s);
        const items = snd4s.map((snd4) => {
            const sndBuffer = new Uint8Array(
                buffer,
                snd4.sectionDataOffset,
                snd4.sectionSize,
            );
            const sndPtr = new BufferPtr(sndBuffer);
            const fileId = sndPtr.get32();
            const filename = `${fileIdSndMap.get(fileId)} - ${toHex(snd4.sectionDataOffset)}.snd4`;
            const fakeRom = {
                romNumber: -1,
                file: new File([sndBuffer], filename),
            };
            // console.log(fakeRom);
            return new DcsItem({
                id: getNextItemId(),
                label: `${itemLabelPrefix}/${f.webkitRelativePath}/${filename}`,
                roms: [fakeRom],
                dcsType: 'bnk',
            });
        });
        return items;
    }

    return [];
}

function dir4containerToMap(dir4Containers: Dir4Container[]) {
    const m = new Map<string, Map<number, string>>();
    for (const container of dir4Containers) {
        for (const section of container.sections) {
            let ms = m.get(section.fileType);
            if (!ms) {
                ms = new Map();
                m.set(section.fileType, ms);
            }
            for (const file of section.files) {
                ms.set(file.fileId, file.filename);
            }
        }
    }

    return m;
}
