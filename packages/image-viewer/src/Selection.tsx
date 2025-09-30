import {
    createContext,
    type JSX,
    type Ref,
    useContext,
    useImperativeHandle,
    useMemo,
    useState,
} from 'react';
import type { WithChildren } from './WithChildren';

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
    addSelection: (toAdd: Partial<Selection>) => void;
    removeSelection: (toRemove: Partial<Selection>) => void;
    clearSelection: () => void;
}

const defaultSelection: Selection = {
    images: [],
    palettes: [],
    sequences: [],
    scripts: [],
    fancySelectionObjs: [],
    addSelection() {
        throw new Error('Not implemented');
    },

    removeSelection() {
        throw new Error('Not implemented');
    },
    clearSelection() {
        throw new Error('Not implemented');
    },
};

export const SelectionContext = createContext<Selection>(defaultSelection);

export function SelectionProvider({
    children,
    ref,
}: WithChildren & { ref?: Ref<Selection> }) {
    const [selection, setSelection] = useState<Selection>(defaultSelection);

    const value = useMemo(() => {
        return {
            ...selection,
            addSelection: (toAdd: Partial<Selection>) => {
                setSelection({
                    ...selection,
                    images: [...selection.images, ...(toAdd.images || [])],
                    palettes: [
                        ...selection.palettes,
                        ...(toAdd.palettes || []),
                    ],
                    sequences: [
                        ...selection.sequences,
                        ...(toAdd.sequences || []),
                    ],
                    scripts: [...selection.scripts, ...(toAdd.scripts || [])],
                    fancySelectionObjs: [
                        ...selection.fancySelectionObjs,
                        ...(toAdd.fancySelectionObjs || []),
                    ],
                });
            },
            removeSelection: (toRemove: Partial<Selection>) => {
                setSelection({
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
                });
            },
            clearSelection: () => {
                setSelection({ ...defaultSelection });
            },
        };
    }, [selection]);

    useImperativeHandle(ref, () => {
        return value;
    }, [value]);
    return (
        <SelectionContext.Provider value={value}>
            {children}
        </SelectionContext.Provider>
    );
}

export function useSelection() {
    return useContext(SelectionContext);
}
