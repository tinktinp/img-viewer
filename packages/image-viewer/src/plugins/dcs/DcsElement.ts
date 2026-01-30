import type { PluginElementAudio } from '../../plugin/plugin';
import { toHex } from '../../utils/toHex';
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
}

export function makeDcsElementAudio(
    props: DcsElementAudioProps,
): DcsElementAudio {
    const { streamId, streamIdx } = props;
    return {
        ...props,
        type: 'audio',
        id: `audio-stream-${streamId}}`,
        name: `Stream #${streamIdx} ${toHex(streamId)}`,
        async toWav() {
            return elementToWav(this);
        },
        details() {
            return dcsStreamDetails(this);
        },
    };
}

async function elementToWav(element: DcsElementAudio) {
    const { item, streamId } = element;
    const buffer = item.decoder.extractStream(streamId).slice(0);
    return buffer;
}
