import DcsDecoder from '@tinktinp/dcs-decoder';

import { BasePluginItem, type PluginItem } from '../../plugin/plugin';
import { makeDcsElementAudio } from './DcsElement';

export interface DcsItemProps {
    id: string;
    label: string;
    roms: File[];
}
export class DcsItem
    extends BasePluginItem
    implements PluginItem, DcsItemProps
{
    id: string;
    label: string;
    roms: File[];
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
        // TODO: actually call this
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
            streams.map((s) =>
                makeDcsElementAudio({
                    item: this,
                    sectionId: 'streams',
                    streamId: s,
                }),
            ),
        );

        this.dispatchElementsFinishedLoading();
    }
}

async function loadRoms(item: DcsItem) {
    const { decoder, roms } = item;

    for (const rom of roms) {
        const romNumber = getRomNumber(rom);
        decoder.addRom(romNumber, new Uint8Array(await rom.arrayBuffer()));
        console.log(
            'added rom ',
            rom.webkitRelativePath,
            'as romNumber',
            romNumber,
        );
    }
    console.log(decoder);
    const checkRomsResult = decoder.checkRoms();
    console.log(decoder.checkRoms());
    if (checkRomsResult === 1) {
        console.log('success');
        decoder.softBoot();
        const sig = decoder.getSignature();
        console.log(sig);
        const maxTrackNumber = decoder.getMaxTrackNumber();
        console.log(maxTrackNumber);
        const streams: number[] = decoder.listStreams();
        console.log('streams', streams);
        return { sig, maxTrackNumber, streams };
        // const buffer = decoder.extractStream(streams[0]).slice(0);
        // console.log(buffer);
        // const url = URL.createObjectURL(
        //     new Blob([buffer], { type: 'audio/wave' }),
        // );
        // console.log(url);
    }
    return { sig: '', maxTrackNumber: 0, streams: [] };
}

function getRomNumber(rom: File): number {
    const match = rom.name.match(/[.][uU]([0-9])$/);
    return Number.parseInt(match?.[1] as string);
}
