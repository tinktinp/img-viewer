import type { PluginDetailsObj } from '../../plugin/plugin';
import { toHex } from '../../utils/toHex';
import type { DcsElementAudio } from './DcsElement';

export async function dcsStreamDetails(
    el: DcsElementAudio,
): Promise<PluginDetailsObj> {
    const { formatSubType, formatType, nBytes, nFrames } =
        el.item.decoder.getStreamInfo(el.streamId);

    return {
        caption: 'Stream Details',
        row: [
            { key: 'streamIdx', header: 'Stream #', data: el.streamIdx.toString() },
            {
                key: 'streamId',
                header: 'Offset',
                data: toHex(el.streamId),
            },
            {
                key: 'duration',
                header: 'Duration',
                data: (7.68 * nFrames / 1000).toLocaleString(),
            },
            {
                key: 'nFrames',
                header: 'Frames',
                data: nFrames.toString(),
            },
            {
                key: 'nBytes',
                header: 'Compressed Bytes',
                data: nBytes.toString(),
            },
            {
                key: 'formatType',
                header: 'Format Type',
                data: formatType.toString(),
            },
            {
                key: 'formatSubType',
                header: 'Format Subtype',
                data: formatSubType.toString(),
            },
        ],
    };
}
