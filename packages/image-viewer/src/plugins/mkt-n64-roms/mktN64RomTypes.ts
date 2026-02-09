import type {
    PluginElementImage,
    PluginElementPalette,
    PluginItem,
    PluginItemProps,
} from '../../plugin/plugin';
import type {
    AniCmd,
    AniCmdWithFrameOffset,
} from '../../utils/aniCmd';
import type { RomInfo } from './MktN64RomInfo';

export type MktN64RomItemType = 'character' | 'background';
export type MktN64FileItemProps =
    | MktN64CharacterItemProps
    | MktN64BackgroundItemProps;
export type MktN64FileItem = PluginItem &
    (MktN64CharacterItem | MktN64BackgroundItem);

export interface MktN64FileItemPropsBase extends PluginItemProps {
    type: MktN64RomItemType;
    file: File;
    arrayBuffer: ArrayBuffer;
    romInfo: RomInfo;
    segment: Segment;
    paletteElements?: MktN64RomElementPalette[];
}

export interface MktN64CharacterItemProps extends MktN64FileItemPropsBase {
    type: 'character';
    charDict: Segment;
    charId: number;
}
export interface MktN64CharacterItem
    extends MktN64CharacterItemProps,
        PluginItem {}

// for now background isn't used, just here so that `MktN64FileItem` has two options to make it easier to expand later
export interface MktN64BackgroundItemProps extends MktN64FileItemPropsBase {
    type: 'background';
}
export interface MktN64BackgroundItem
    extends MktN64BackgroundItemProps,
        PluginItem {}
export interface MktN64RomElementImage extends PluginElementImage {
    img: AddressObjImg;
    item: MktN64FileItem;
    dict: Segment;
}

export type PaletteType = 'character1' | 'character2' | 'from-ani';

export interface MktN64RomElementPalette extends PluginElementPalette {
    fileOffset: number;
    paletteType: PaletteType;
    anitabIndex?: number;
    item: MktN64FileItem;
}
type AddressObjType = 'segmentEnd' | 'aniCmd' | 'frame' | 'subframe' | 'img';

/**
 * An address and an object type.
 * To figure out the length of some objects, it is helpful to know where the next
 * object starts.
 */
interface AddressObjBase {
    offset: number;
    type: AddressObjType;
}
export type AddressObj =
    | AddressObjSegmentEnd
    | AddressObjAniCmd
    | AddressObjFrame
    | AddressObjSubframe
    | AddressObjImg;

interface AddressObjSegmentEnd extends AddressObjBase {
    type: 'segmentEnd';
}
interface AddressObjAniCmd extends AddressObjBase {
    type: 'aniCmd';
    aniCmd: AniCmd;
    anitabIndex: number;
}
interface AddressObjFrame extends AddressObjBase {
    type: 'frame';
    frame: Frame;
}
interface AddressObjSubframe extends AddressObjBase {
    type: 'subframe';
    subframe: Subframe;
}
export interface AddressObjImg extends AddressObjBase {
    type: 'img';
    subframe: Subframe;
}

export type PalettePtr = PalettePtrRegular | PalettePtrFromAni;

export interface PalettePtrRegular {
    fileOffset: number;
    paletteType: 'character1' | 'character2';
}
export interface PalettePtrFromAni {
    fileOffset: number;
    paletteType: 'from-ani';
    anitabIndex: number;
}
export interface Segment {
    start: number;
    end: number;
    size: number;
}

export interface Subframe {
    aniCmd: AniCmdWithFrameOffset;
    imgOffset?: number | undefined;
    imgData?: DataView<ArrayBufferLike> | undefined;
    imgSlice?: ArrayBufferLike;
    height?: number;
    width?: number;
    padding?: number;
    yOffset?: number;
    xOffset?: number;
    palette?: number;
    suggestedPalette?: number;
    subOffset: number;
}

export type Frame = Subframe[];

/**
 * Just a subframe as read from memory, without any validation applied
 */
export interface RawSubframe {
    imgOffset: number;
    height: number;
    width: number;
    yOffset: number;
    xOffset: number;
    palette: number;
}
