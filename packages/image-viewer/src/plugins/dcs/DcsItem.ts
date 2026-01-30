import DcsDecoder from '@tinktinp/dcs-decoder';

import { BasePluginItem, type PluginItem } from '../../plugin/plugin';
import { makeDcsElementAudio } from './DcsElement';
import type { DcsRomSet } from './getRomSet';

export interface DcsItemProps {
    id: string;
    label: string;
    roms: DcsRomSet[];
}
export class DcsItem
    extends BasePluginItem
    implements PluginItem, DcsItemProps
{
    id: string;
    label: string;
    roms: DcsRomSet[];
    decoder: InstanceType<typeof DcsDecoder.DCSDecoderWasm>;

    constructor({ id, label, roms }: DcsItemProps) {
        super();
        this.id = id;
        this.label = label;
        this.roms = roms;

        this.decoder = new DcsDecoder.DCSDecoderWasm();
        this.decoder.setMasterVolume(255);
    }

    async unload() {
        this.decoder.delete();
    }

    async loadElements() {
        const { streams, sig } = await loadRoms(this);

        this.dispatchElementsLoaded([
            {
                type: 'section',
                id: 'streams',
                sectionId: 'root',
                name: 'Streams',
                name2: sig,
            },
            {
                type: 'section',
                id: 'tracks',
                sectionId: 'root',
                name: 'Tracks',
                name2: 'TODO - See also http://mjrnet.org/pinscape/dcsref/DCS_format_reference.html for differences between tracks and streams',
            },
        ]);

        this.dispatchElementsLoaded(
            streams.map((s, idx) =>
                makeDcsElementAudio({
                    item: this,
                    sectionId: 'streams',
                    streamId: s,
                    streamIdx: idx,
                }),
            ),
        );

        this.dispatchElementsFinishedLoading();
    }
}

async function loadRoms(item: DcsItem) {
    const { decoder, roms } = item;

    for (const rom of roms) {
        const romNumber = rom.romNumber;
        decoder.addRom(romNumber, new Uint8Array(await rom.file.arrayBuffer()));
        // console.log(
        //     'added rom ',
        //     rom.webkitRelativePath,
        //     'as romNumber',
        //     romNumber,
        // );
    }
    const checkRomsResult = decoder.checkRoms();
    console.log('checkRomsResult', decoder.checkRoms());
    if (checkRomsResult === 1) {
        decoder.softBoot();
        const sig = decoder.getSignature();
        console.log({ sig });
        const maxTrackNumber = decoder.getMaxTrackNumber();
        console.log({ maxTrackNumber });
        const streams: number[] = decoder.listStreams();
        // console.log('streams', streams);
        return { sig, maxTrackNumber, streams };
    }
    return { sig: '', maxTrackNumber: 0, streams: [] };
}
