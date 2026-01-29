import type { PluginElementAudio } from '../../plugin/plugin';
import type { DcsItem } from './DcsItem';

export interface DcsElementAudio
    extends PluginElementAudio,
        DcsElementAudioProps {}

export interface DcsElementAudioProps {
    item: DcsItem;
    sectionId: string;
    streamId: number;
}

export function makeDcsElementAudio(
    props: DcsElementAudioProps,
): DcsElementAudio {
    const { streamId } = props;
    return {
        ...props,
        type: 'audio',
        id: `audio-stream-${streamId}}`,
        name: `Stream ${streamId}`,
        async toWav() {
            return elementToWav(this);
        },
    };
}

async function elementToWav(element: DcsElementAudio) {
    const { item, streamId } = element;
    const buffer = item.decoder.extractStream(streamId).slice(0);
    return buffer;
}
