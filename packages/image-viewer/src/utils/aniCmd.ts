import type { BufferPtr } from '../asm/BufferPtr';

export const AniCmdMap = {
    end: 0x0,
    jump: 1,
    flip: 2,
    adjustx: 3,
    adjustxy: 4,
    nosleep: 5,
    calla: 6,
    sound: 7,
    ochar_jump: 8,
    flip_v: 9,
    offset_xy: 10,
    sladd: 11,
    slani: 12,
    swpal: 13,
    slani_sleep: 14,
    ochar_sound: 15,
};

export const aniCmdMapIntToStr = [
    'end',
    'jump',
    'flip',
    'adjustx',
    'adjustxy',
    'nosleep',
    'calla',
    'sound',
    'ochar_jump',
    'flip_v',
    'offset_xy',
    'sladd',
    'slani',
    'swpal',
    'slani_sleep',
    'ochar_sound',
] as const;

export type AniCmdTypeSansFrame = keyof typeof AniCmdMap;
export type AniCmdType = keyof typeof AniCmdMap | 'frame';

export type AniCmd =
    | AniCmdFrame
    | AniCmdEnd
    | AniCmdAdjustX
    | AniCmdAdjustXY
    | AniCmdCallA
    | AniCmdFlip
    | AniCmdFlipV
    | AniCmdJump
    | AniCmdNoSleep
    | AniCmdSound
    | AniCmdOCharJump
    | AniCmdOffsetXY
    | AniCmdSlaveAdd
    | AniCmdSlaveAni
    | AniCmdSlaveAniSleep
    | AniCmdSwapPalette
    | AniCmdOCharSound;

export type AniCmdWithFrameOffset = Extract<AniCmd, { frameOffset: number }>;

type OBF<T> = Omit<T, AniCmdBaseFields>;

type AniCmdSubfieldOnly =
    | OBF<AniCmdFrame>
    | OBF<AniCmdEnd>
    | OBF<AniCmdAdjustX>
    | OBF<AniCmdAdjustXY>
    | OBF<AniCmdCallA>
    | OBF<AniCmdFlip>
    | OBF<AniCmdFlipV>
    | OBF<AniCmdJump>
    | OBF<AniCmdNoSleep>
    | OBF<AniCmdSound>
    | OBF<AniCmdOCharJump>
    | OBF<AniCmdOffsetXY>
    | OBF<AniCmdSlaveAdd>
    | OBF<AniCmdSlaveAni>
    | OBF<AniCmdSlaveAniSleep>
    | OBF<AniCmdSwapPalette>
    | OBF<AniCmdOCharSound>;

export interface AniCmdBase {
    anitabIndex: number;
    aniAddr: number;
    /** How many bytes this aniCmd is.
     * 4 bytes for a regular frame, 8 for 'jump', 12 for ochar_jump,
     * etc. Usually 4, 8 or 12. */
    aniCmdSizeInBytes: number;
}

type AniCmdBaseFields = keyof AniCmdBase;

export interface AniCmdFrame extends AniCmdBase {
    cmd: 'frame';
    frameOffset: number;
}

export interface AniCmdEnd extends AniCmdBase {
    cmd: 'end';
}

export interface AniCmdJump extends AniCmdBase {
    cmd: 'jump';
    nextFrame: number; // 32bit
}

export interface AniCmdFlip extends AniCmdBase {
    cmd: 'flip';
}

export interface AniCmdAdjustX extends AniCmdBase {
    cmd: 'adjustx';
    x: number; // 32bit read, 16 bit used multiplied by 80/100 (N64)
}

export interface AniCmdAdjustXY extends AniCmdBase {
    cmd: 'adjustxy';
    x: number;
    y: number; // 32 bit read, 16 for x and 16 for y, x * 80/100, y * *85/100;
}

export interface AniCmdNoSleep extends AniCmdBase {
    cmd: 'nosleep';
}

export interface AniCmdCallA extends AniCmdBase {
    cmd: 'calla';
    proc: number; // 32bit, index into proc table
}

export interface AniCmdSound extends AniCmdBase {
    cmd: 'sound';
    sound: number; // 32bit
}

/**
 * conditional jump
 */
export interface AniCmdOCharJump extends AniCmdBase {
    cmd: 'ochar_jump';
    ochar: number; // 32bit, character id
    nextFrame: number; // 32bit, frame to jump to if character id matches
}

export interface AniCmdFlipV extends AniCmdBase {
    cmd: 'flip_v';
}

export interface AniCmdOffsetXY extends AniCmdBase {
    cmd: 'offset_xy';
    offsetX: number; // 16 bit, * 80/100
    offsetY: number; // 16 bit, * 85/100
}

export interface AniCmdSlaveAdd extends AniCmdBase {
    cmd: 'sladd';
    frameOffset: number; // 32 bit
}

export interface AniCmdSlaveAni extends AniCmdBase {
    cmd: 'slani';
    frameOffset: number; // 32 bit
}

export interface AniCmdSlaveAniSleep extends AniCmdBase {
    cmd: 'slani_sleep';
    frameOffset: number; // 32 bit
}

export interface AniCmdSwapPalette extends AniCmdBase {
    cmd: 'swpal';
    paletteFrame: number; // 32 bit
}

export interface AniCmdOCharSound extends AniCmdBase {
    cmd: 'ochar_sound';
    sound: number; // 32bit
}

/**
 * Read an AniCmd from a BufferPtr. The BufferPtr's
 * offset will be incremented.
 *
 * @param ptr ptr to read from. It is incremented.
 * @returns a new AniCmd object
 */
export function parseAniEntry(
    ptr: BufferPtr,
    segmentStart: number,
    anitabIndex: number,
): AniCmd {
    const startOffset = ptr.offset;
    const aniAddr = ptr.offset - segmentStart;
    const cmdInt = ptr.getAndInc32();
    if (cmdInt in aniCmdMapIntToStr) {
        const cmd = aniCmdMapIntToStr[cmdInt];
        const subfields = parseAniSubtypeFields(cmd, ptr);

        return {
            anitabIndex,
            aniAddr,
            aniCmdSizeInBytes: ptr.offset - startOffset,
            ...subfields,
        };
    } else {
        return {
            anitabIndex,
            aniAddr,
            aniCmdSizeInBytes: 4,
            cmd: 'frame',
            frameOffset: cmdInt,
        };
    }
}

function parseAniSubtypeFields(
    cmd: AniCmdTypeSansFrame,
    ptr: BufferPtr<ArrayBufferLike>,
): AniCmdSubfieldOnly {
    switch (cmd) {
        case 'jump':
            return {
                cmd,
                nextFrame: ptr.getAndInc32(),
            };
        case 'adjustx':
            return {
                cmd,
                x: ptr.getAndInc32(),
            };
        case 'adjustxy':
            return {
                cmd,
                x: ptr.getAndInc16(),
                y: ptr.getAndInc16(),
            };
        case 'calla':
            return {
                cmd,
                proc: ptr.getAndInc32(),
            };
        case 'sound':
        case 'ochar_sound':
            return {
                cmd,
                sound: ptr.getAndInc32(),
            };
        case 'ochar_jump':
            return {
                cmd,
                ochar: ptr.getAndInc32(),
                nextFrame: ptr.getAndInc32(),
            };
        case 'offset_xy':
            return {
                cmd,
                offsetX: ptr.getAndInc16(),
                offsetY: ptr.getAndInc16(),
            };
        case 'sladd':
        case 'slani':
        case 'slani_sleep':
            return {
                cmd,
                frameOffset: ptr.getAndInc32(),
            };
        case 'swpal':
            return {
                cmd,
                paletteFrame: ptr.getAndInc32(),
            };

        case 'end':
        case 'flip':
        case 'flip_v':
        case 'nosleep':
            return { cmd };
    }
}
