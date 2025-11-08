import type { FancySelectionObj } from '../Selection';

export interface MklkImage {
    name: string;
    width: number;
    height: number;
    data: Uint8Array;
}


export interface MklkSelectionObj extends FancySelectionObj {
    image: MklkImage;
}
