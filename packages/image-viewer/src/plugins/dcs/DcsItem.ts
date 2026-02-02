import DcsDecoder from '@tinktinp/dcs-decoder';

import { BasePluginItem, type PluginItem } from '../../plugin/plugin';
import {
    type BnkInfo,
    type DcsStreamDetailsBnk,
    getStreams,
    parseBnk,
    parseSnd4,
} from './bnk';
import { makeDcsElementAudio } from './DcsElement';
import type { DcsRomSet } from './getRomSet';

export type DcsType = 'romset' | 'bnk';

export type DcsItemInfo = DcsItemInfoRomset | DcsItemInfoBnk;

export interface DcsItemProps {
    id: string;
    label: string;
    roms: DcsRomSet[];
    dcsType: DcsType;
}
export class DcsItem
    extends BasePluginItem
    implements PluginItem, DcsItemProps
{
    id: string;
    label: string;
    roms: DcsRomSet[];
    dcsType: DcsType;
    decoder: InstanceType<typeof DcsDecoder.DCSDecoderWasm>;
    itemInfo?: DcsItemInfo;
    itemInfoPromise?: Promise<DcsItemInfo>;

    constructor({ id, label, roms, dcsType }: DcsItemProps) {
        super();
        this.id = id;
        this.label = label;
        this.roms = roms;
        this.dcsType = dcsType;

        this.decoder = new DcsDecoder.DCSDecoderWasm();
        this.decoder.setMasterVolume(255);
    }

    async unload() {
        this.decoder.delete();
    }

    async loadElements() {
        if (this.itemInfoPromise === undefined) {
            this.itemInfoPromise =
                this.dcsType === 'bnk' ? loadBnk(this) : loadRoms(this);
        }
        this.itemInfo = await this.itemInfoPromise;

        const { streams, sig } = this.itemInfo;

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
                    streamsDetails: (this?.itemInfo as DcsItemInfoBnk)
                        ?.streamsDetails?.[idx],
                }),
            ),
        );

        this.dispatchElementsFinishedLoading();
    }
}

export interface DcsItemInfoRomset {
    type: 'romset';
    sig: string;
    maxTrackNumber: number;
    streams: number[];
}

async function loadRoms(item: DcsItem): Promise<DcsItemInfoRomset> {
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
        // console.log({ sig });
        const maxTrackNumber = decoder.getMaxTrackNumber();
        console.log({ maxTrackNumber });
        const streams: number[] = decoder.listStreams();
        // console.log('streams', streams);
        return { type: 'romset', sig, maxTrackNumber, streams };
    }
    return { type: 'romset', sig: '', maxTrackNumber: 0, streams: [] };
}

export interface DcsItemInfoBnk {
    type: 'bnk';
    sig: string;
    maxTrackNumber: number;
    streams: number[];
    streamsDetails: DcsStreamDetailsBnk[];
    bnkInfo: BnkInfo;
    filePtrInWasmHeap: number;
}

async function loadBnk(item: DcsItem): Promise<DcsItemInfoBnk> {
    const { decoder, roms } = item;
    const rom = roms[0];

    decoder.softBoot();

    const buffer = new Uint8Array(await rom.file.arrayBuffer());
    const filePtrInWasmHeap = DcsDecoder._malloc(buffer.byteLength);
    // console.log('loadBnk', { filePtrInWasmHeap });
    DcsDecoder.HEAPU8.set(buffer, filePtrInWasmHeap);

    let bnkInfo: BnkInfo;
    if (item.roms[0].file.name.toLowerCase().endsWith('snd4')) {
        bnkInfo = parseSnd4(buffer);
    } else {
        bnkInfo = parseBnk(buffer);
    }
    const { sig, trackProgramCount } = bnkInfo;
    const streamsDetails = getStreams(bnkInfo);
    const streams = streamsDetails.map(
        (s) => s.streamPointer + filePtrInWasmHeap,
    );

    // // const stream = ptr + 0x254;
    // const stream = ptr + 0x577f + 0x11b;
    // console.log({ ptr, stream });

    return {
        type: 'bnk',
        sig,
        maxTrackNumber: trackProgramCount - 1,
        streams,
        streamsDetails,
        bnkInfo,
        filePtrInWasmHeap,
    };
}
