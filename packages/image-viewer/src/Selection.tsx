import { Store, useStore } from '@tanstack/react-store';
import { createContext, type JSX } from 'react';

export interface FancySelectionObj {
    SideBarComponent: () => JSX.Element;
    onDownload: () => void;
}

export interface Selection {
    images: number[];
    palettes: number[];
    sequences: number[];
    scripts: number[];
    fancySelectionObjs: FancySelectionObj[];
}

const defaultSelection: Selection = {
    images: [],
    palettes: [],
    sequences: [],
    scripts: [],
    fancySelectionObjs: [],
};

export const SelectionContext = createContext<Selection>(defaultSelection);
export const selectionStore = new Store(defaultSelection);

type EqualityFn<T> = (objA: T, objB: T) => boolean;
interface UseStoreOptions<T> {
    equal?: EqualityFn<T>;
}

export function useSelectionStore<TSelected = NoInfer<Selection>>(
    selector?: (state: NoInfer<Selection>) => TSelected,
    options?: UseStoreOptions<TSelected>,
) {
    return useStore<Selection, TSelected>(selectionStore, selector, options);
}

export function useSelectionImages() {
    return useSelectionStore((state) => state.images);
}
export function useSelectionPalettes() {
    return useSelectionStore((state) => state.palettes);
}
export function useSelectionScripts() {
    return useSelectionStore((state) => state.scripts);
}
export function useSelectionSequences() {
    return useSelectionStore((state) => state.sequences);
}
export function useSelectionFancy() {
    return useSelectionStore((state) => state.fancySelectionObjs);
}

export function addSelection(toAdd: Partial<Selection>) {
    selectionStore.setState((selection) => {
        return {
            ...selection,
            images: [...selection.images, ...(toAdd.images || [])],
            palettes: [...selection.palettes, ...(toAdd.palettes || [])],
            sequences: [...selection.sequences, ...(toAdd.sequences || [])],
            scripts: [...selection.scripts, ...(toAdd.scripts || [])],
            fancySelectionObjs: [
                ...selection.fancySelectionObjs,
                ...(toAdd.fancySelectionObjs || []),
            ],
        };
    });
}

export function removeSelection(toRemove: Partial<Selection>) {
    selectionStore.setState((selection) => {
        return {
            ...selection,
            images: selection.images.filter(
                (v) => !toRemove.images?.includes(v),
            ),
            palettes: selection.palettes.filter(
                (v) => !toRemove.palettes?.includes(v),
            ),
            sequences: selection.sequences.filter(
                (v) => !toRemove.sequences?.includes(v),
            ),
            scripts: selection.scripts.filter(
                (v) => !toRemove.scripts?.includes(v),
            ),
            fancySelectionObjs: selection.fancySelectionObjs.filter(
                (v) => !toRemove.fancySelectionObjs?.includes(v),
            ),
        };
    });
}

export function clearSelection() {
    selectionStore.setState({ ...defaultSelection });
}
