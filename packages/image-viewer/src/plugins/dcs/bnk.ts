/**
 * bnk files are found in Carnevil and maybe other games.
 * They are similarish to the rom files, but mostly in
 * little endian and the header is different.
 */

import { BufferPtr } from '../../asm/BufferPtr';
import { toHex } from '../../utils/toHex';

export interface BnkInfo {
    sig: string;
    trackProgramCount: number;
    tracksAndAudioLen: number;
    trackProgramTable: TrackProgramIndex[];
}

/**
 * Gets some metadata from a .bnk file
 */
export function parseBnk(buffer: Uint8Array): BnkInfo {
    const headerOffset = 0x80;
    const headerSize = 6;

    const ptr = new BufferPtr(buffer);

    const sig = ptr.getCString();

    ptr.offset = 0x80;

    const trackProgramCount = ptr.getAndInc16();
    const tracksAndAudioLen = ptr.getAndInc32();

    const trackProgramTable = parseTrackProgramIndex(ptr, trackProgramCount);

    const trackProgramTableSize = trackProgramCount * 4;
    const trackProgramBaseOffset =
        headerOffset + headerSize + trackProgramTableSize;

    trackProgramTable.forEach((tpi) => {
        if (tpi.index !== 0xffff_ffff) {
            tpi.trackProgram = parseTrackProgram(
                buffer,
                tpi.index + trackProgramBaseOffset,
            );
        }
    });

    const rv = {
        sig,
        trackProgramCount,
        tracksAndAudioLen,
        trackProgramTable,
    };
    console.log(rv);
    return rv;
}

export type TrackProgramType =
    | 'byte-code-program'
    | 'deferred-track'
    | 'deferred-indirect-track'
    | 'unknown';

const tpRawTypeToType = {
    1: 'byte-code-program',
    2: 'deferred-track',
    3: 'deferred-indirect-track',
} as const;

export interface TrackProgram {
    rawType: number;
    type: TrackProgramType;
    channel: number;
    ops: OpAndArgs[];
}

export interface TrackProgramIndex {
    index: number;
    trackProgram?: TrackProgram;
}

function parseTrackProgramIndex(ptr: BufferPtr, trackProgramCount: number) {
    const trackProgramTable: TrackProgramIndex[] = [];

    for (let i = 0; i < trackProgramCount; i++) {
        trackProgramTable.push({
            index: ptr.getAndInc32(),
        });
    }

    return trackProgramTable;
}

/**
 * Parse a track program.
 *
 * This largely duplicates DCSDecoder's implementation. Or would be if I implemented all the opcodes.
 */
function parseTrackProgram(buffer: Uint8Array, offset: number): TrackProgram {
    const ptr = new BufferPtr(buffer, offset);
    // console.log('parsing trackProgram at', toHex(offset));

    const rawType = ptr.getAndInc();
    const type =
        tpRawTypeToType[rawType as keyof typeof tpRawTypeToType] ?? 'unknown';

    const channel = ptr.getAndInc();

    let ops: OpAndArgs[] = [];
    if (type === 'byte-code-program') {
        ops = parseByteCodeTrackProgram(ptr);
    }

    return {
        rawType,
        type,
        channel,
        ops,
    };
}

export enum Op {
    EndTrack = 0x0,
    PlayStream = 0x1,
    StopChannel = 0x2,
    QueueTrack = 0x3,
    SetChannelTimer = 0x4,
    StartDeferred = 0x5,
    SetVariable = 0x6,
    SetMixingLevel = 0x7,
    IncMixingLevel = 0x8,
    DecMixingLevel = 0x9,
    SetMixingLevelFade = 0xa,
    IncMixingLevelFade = 0xb,
    DecMixingLevelFade = 0xc,
    NoOp = 0xd,
    StartLoop = 0xe,
    EndLoop = 0xf,
}

const opArgSize = {
    [Op.EndTrack]: 0,
    [Op.PlayStream]: 5,
    [Op.StopChannel]: 1,
    [Op.QueueTrack]: 2,
    [Op.SetChannelTimer]: 3,
    [Op.StartDeferred]: 1,
    [Op.SetVariable]: 2,
    [Op.SetMixingLevel]: 2,
    [Op.IncMixingLevel]: 2,
    [Op.DecMixingLevel]: 2,
    [Op.SetMixingLevelFade]: 4,
    [Op.IncMixingLevelFade]: 4,
    [Op.DecMixingLevelFade]: 4,
    [Op.NoOp]: 0,
    [Op.StartLoop]: 1,
    [Op.EndLoop]: 0,
};

export interface TrackProgramOpCode {
    waitPrefix: number;
    op: Op;
}

function parseByteCodeTrackProgram(ptr: BufferPtr) {
    const ops: OpAndArgs[] = [];
    while (true) {
        const op = parseByteCodeOpCode(ptr);
        ops.push(op);
        if (op.op === Op.EndTrack) {
            break;
        }
    }
    return ops;
}

export interface OpPlayStreamArgs {
    channel: number;
    rawStreamPointer: number;
    streamPointer: number;
    repeats: number;
}

export interface OpMixingLevelArgs {
    channel: number;
    level: number;
}

export type OpArgs = OpPlayStreamArgs | OpMixingLevelArgs;

export interface OpAndArgs {
    waitPrefix: number;
    op: Op;
    opName: string;
    args: OpArgs | undefined;
}

function parseByteCodeOpCode(ptr: BufferPtr): OpAndArgs {
    const waitPrefix = ptr.getAndInc16();
    const op: Op = ptr.getAndInc();
    const opName = Op[op];
    const finalOffset = opArgSize[op] + ptr.offset;

    let args: OpArgs | undefined;
    switch (op) {
        case Op.PlayStream: {
            const channel = ptr.getAndInc();
            const streamPointerOffset = ptr.offset;
            // streamPointer is 24 bits, in big endian,
            // even though for bnk files everything else was
            // changed over to little endian. 🤷‍♂️
            const rawStreamPointer =
                (ptr.getAndInc() << 16) |
                (ptr.getAndInc() << 8) |
                ptr.getAndInc();
            const streamPointer = rawStreamPointer + streamPointerOffset;
            const repeats = ptr.getAndInc();
            args = {
                channel,
                rawStreamPointer,
                streamPointer,
                repeats,
            };

            break;
        }

        case Op.SetMixingLevel:
        case Op.IncMixingLevel:
        case Op.DecMixingLevel: {
            args = {
                channel: ptr.getAndInc(),
                level: ptr.getAndInc(),
            };
            break;
        }
    }

    // I don't feel like fully parsing each op code
    // but lets at least set the offset like we did
    // so that we can parse the next one correctly!
    ptr.offset = finalOffset;

    return {
        waitPrefix,
        op,
        opName,
        args,
    };
}

export interface DcsStreamDetailsBnk {
    streamPointer: number;
    rawStreamPointer: number;
}

export function getStreams(bnkInfo: BnkInfo): DcsStreamDetailsBnk[] {
    const spSet = new Set<number>();

    return bnkInfo.trackProgramTable.flatMap(({ trackProgram }) => {
        if (!trackProgram) {
            return [];
        }

        return trackProgram.ops.flatMap((op) => {
            if (op.op === Op.PlayStream) {
                const args = op.args as OpPlayStreamArgs;
                if (!spSet.has(args.rawStreamPointer)) {
                    spSet.add(args.rawStreamPointer);
                    return [
                        {
                            streamPointer: args.streamPointer,
                            rawStreamPointer: args.rawStreamPointer,
                        },
                    ];
                }
                return [];
            }
            return [];
        });
    });
}
