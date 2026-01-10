/** biome-ignore-all lint/complexity/useArrowFunction: <explanation> */
import { Store, useStore } from '@tanstack/react-store';
import { createContext, type ReactNode, useContext, useState } from 'react';
import type { PluginElement } from '../plugin/plugin';
import { create } from 'domain';

export type StoreData = {
    bySection: Record<'root' | string, PluginElement[]>;
    byId: Record<string, PluginElement>;
};
// export type StoreData = Record<string, PluginElement[]>;

export function createDefaultStateObject() {
    return {
        bySection: {
            root: [],
        },
        byId: {},
    };
}

const StoreContext = createContext(new Store<StoreData>(createDefaultStateObject()));
export const StoreProvider = ({ children }: { children: ReactNode }) => {
    const [store] = useState(() => new Store<StoreData>(createDefaultStateObject()));

    return (
        <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
    );
};

type EqualityFn<T> = (objA: T, objB: T) => boolean;
interface UseStoreOptions<T> {
    equal?: EqualityFn<T>;
}

export function useGetStoreFromContext() {
    const store = useContext(StoreContext);

    return store;
}

export const useStoreFromContext = function <
    TState extends StoreData,
    TSelected = NoInfer<TState>,
>(
    selector?: (state: NoInfer<TState>) => TSelected,
    options?: UseStoreOptions<TSelected>,
): TSelected {
    const store = useGetStoreFromContext();

    return useStore<TState, TSelected>(
        store as unknown as Store<TState>,
        selector,
        options,
    );
};

export function usePluginElementsBySectionId(sectionId: string) {
    const pluginElements = useStoreFromContext((state) => state.bySection[sectionId]);
    if (pluginElements === undefined) return [];

    return pluginElements;
}
