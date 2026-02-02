import type { PluginDetailsObj } from '../../plugin/plugin';
import { toHex } from '../../utils/toHex';
import type { DcsElementAudio } from './DcsElement';
import type { DcsItemInfoBnk } from './DcsItem';

export async function dcsStreamDetails(
    el: DcsElementAudio,
): Promise<PluginDetailsObj> {
    const { item } = el;
    const { dcsType } = item;
    const streamInfo =
        dcsType === 'romset'
            ? el.item.decoder.getStreamInfo(el.streamId)
            : el.item.decoder.getStreamInfoFromPtr(el.streamId);
    const { formatSubType, formatType, nBytes, nFrames } = streamInfo;

    // if (item.dcsType === 'bnk' && item.itemInfo?.type === 'bnk') {
    //     const ptrBase = item.itemInfo.filePtrInWasmHeap;
    //     const originalStreamId = streamId - ptrBase;
    //     console.log('bnk: details: streamId is', {
    //         streamId,
    //         ptrBase,
    //         originalStreamId,
    //     });
    // }

    const fileOffset =
        dcsType === 'bnk'
            ? toHex(
                  el.streamId -
                      (el.item.itemInfo as DcsItemInfoBnk).filePtrInWasmHeap,
              )
            : undefined;

    const fileOffsetSection = fileOffset
        ? [
              {
                  key: 'fileOffset',
                  header: 'Offset',
                  data: fileOffset,
              },
          ]
        : [];

    const rawStreamPointer = el.streamsDetails?.rawStreamPointer;
    const rawStreamPointerSection = rawStreamPointer
        ? [
              {
                  key: 'streamPtr',
                  header: 'Stream Pointer',
                  data: toHex(rawStreamPointer),
              },
          ]
        : [
              {
                  key: 'streamPtr',
                  header: 'Stream Pointer',
                  data: toHex(el.streamId),
              },
          ];

    return {
        caption: 'Stream Details',
        row: [
            {
                key: 'streamIdx',
                header: 'Stream #',
                data: el.streamIdx.toString(),
            },
            ...rawStreamPointerSection,
            ...fileOffsetSection,
            {
                key: 'duration',
                header: 'Duration',
                data: ((7.68 * nFrames) / 1000).toLocaleString(),
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
