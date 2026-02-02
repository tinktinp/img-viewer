import type { PluginElementAudio } from '../../plugin/plugin';
import { toHex } from '../../utils/toHex';
import type { DcsStreamDetailsBnk } from './bnk';
import type { DcsItem } from './DcsItem';
import { dcsStreamDetails } from './DcsStreamDetails';

export interface DcsElementAudio
    extends PluginElementAudio,
        DcsElementAudioProps {}

export interface DcsElementAudioProps {
    item: DcsItem;
    sectionId: string;
    streamId: number;
    streamIdx: number;
    streamsDetails?: DcsStreamDetailsBnk;
}

export function makeDcsElementAudio(
    props: DcsElementAudioProps,
): DcsElementAudio {
    const { streamId, streamIdx } = props;
    const name = streamGetName(props);
    return {
        ...props,
        type: 'audio',
        id: `audio-stream-${streamIdx}}`,
        name,
        async toWav() {
            return elementToWav(this);
        },
        details() {
            return dcsStreamDetails(this);
        },
    };
}

function streamGetName(props: DcsElementAudioProps) {
    const { streamId, streamIdx } = props;

    if (props.item.dcsType === 'romset') {
        return `Stream #${streamIdx} ${toHex(streamId)}`;
    } else {
        const { rawStreamPointer } =
            props.streamsDetails as DcsStreamDetailsBnk;
        return `Stream #${streamIdx} ${toHex(rawStreamPointer)}`;
    }
}

async function elementToWav(element: DcsElementAudio) {
    const { item, streamId } = element;
    let buffer: Uint8Array;
    if (item.dcsType === 'bnk' && item.itemInfo?.type === 'bnk') {
        // const ptrBase = item.itemInfo.filePtrInWasmHeap;
        // const originalStreamId = streamId - ptrBase;
        // console.log('bnk: streamId is', {
        //     streamId,
        //     ptrBase,
        //     originalStreamId,
        // });

        buffer = item.decoder.extractStreamFromPtr(streamId).slice(0);
    } else {
        buffer = item.decoder.extractStream(streamId).slice(0);
    }
    return buffer;
}
