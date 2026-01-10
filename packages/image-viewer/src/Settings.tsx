/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
import {
    createContext,
    memo,
    use,
    useCallback,
    useContext,
    useDeferredValue,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';
import type { WithChildren } from './WithChildren';
import type { LiteralDataEntry } from './asm/parser';
import type { MktN64Dict } from './asm/filterFiles';
import { FancySelect } from './FancySelect';

export type TransparencyStyle =
    | 'magenta'
    | 'checkered'
    | 'white'
    | 'green'
    | 'blue';
export interface Settings {
    transparencyStyle: TransparencyStyle;
    zoom: number;
    animation: boolean;
    fps: number;
    ticksPerFrame: number;
    mktPalette: [number, number];
    mktPalettes: {
        name: string;
        hash: string;
        palettes: LiteralDataEntry[];
    }[];
    mktPaletteFormat: string;
    mktDicts: MktN64Dict[];
    mktDictIndex: number;
    autoPalette: boolean;
    setSettings: (newSettings: Partial<Settings>) => void;
}
const defaultSettings: Settings = {
    transparencyStyle: 'checkered',
    zoom: 1,
    animation: true,
    fps: 54.70684,
    ticksPerFrame: 5,
    mktPalette: [0, 0],
    mktPalettes: [],
    mktPaletteFormat: 'RGBX5551',
    mktDicts: [],
    mktDictIndex: 0,
    autoPalette: false,
    setSettings: () => console.error('setSettings called without a provider!'),
};

export const SettingsContext = createContext<Settings>(defaultSettings);
export const SetSettingsContext = createContext<
    (newSettings: Partial<Settings>) => void
>(defaultSettings.setSettings);

let settingsFullSnapshot: Settings = defaultSettings;
let settingsNotifiers: (() => void)[] = [];

export function SettingsProvider({ children }: WithChildren) {
    const [settings, setSettings] = useState<Settings>(defaultSettings);

    const fancySetSettings = useCallback((newSettings: Partial<Settings>) => {
        setSettings((oldSettings) => {
            settingsFullSnapshot = {
                ...oldSettings,
                ...newSettings,
            };
            setTimeout(() => settingsNotifiers.forEach((s) => s()), 0);
            return settingsFullSnapshot;
        });
    }, []);

    const value = useMemo(() => {
        return {
            ...settings,
            setSettings: fancySetSettings,
        };
    }, [settings, fancySetSettings]);

    return (
        <SetSettingsContext.Provider value={fancySetSettings}>
            <SettingsContext.Provider value={value}>
                {children}
            </SettingsContext.Provider>
        </SetSettingsContext.Provider>
    );
}

export function useSettings() {
    return useContext(SettingsContext);
}

export function useSetSettings() {
    return useContext(SetSettingsContext);
}

function settingsSubscribe(onChange: () => void) {
    settingsNotifiers.push(onChange);
    return function settingsUnsubscribe() {
        settingsNotifiers = settingsNotifiers.filter((s) => s !== onChange);
    };
}
export function getSettingsSnapshot<S extends keyof Settings>(
    ...names: S[]
): Pick<Settings, S | 'setSettings'> {
    const s: Pick<Settings, S> = {} as Pick<Settings, S>;
    for (const n of names) {
        if (n !== 'setSettings') {
            s[n] = settingsFullSnapshot[n];
        }
    }
    return s as Pick<Settings, S | 'setSettings'>;
}

/**
 * A version of useSettings that is optimized by using useSyncExternalStore
 */
export function useSettingsOpt<S extends keyof Settings>(
    ...names: S[]
): Pick<Settings, S | 'setSettings'> {
    // snapshotCache is used to store the per client cache
    let snapshotCache = getSettingsSnapshot(...names);
    const setSettings = use(SetSettingsContext);
    snapshotCache.setSettings = setSettings;

    // biome-ignore lint/correctness/useExhaustiveDependencies: snapshotCache used as state
    const getSnapshot = useCallback(() => {
        const newSnapshot = getSettingsSnapshot(...names);
        let needsUpdate = false;
        for (const key of Object.keys(newSnapshot)) {
            if (
                key !== 'setSettings' &&
                // @ts-expect-error
                snapshotCache[key] !== newSnapshot[key]
            ) {
                needsUpdate = true;
                break;
            }
        }
        if (needsUpdate) {
            snapshotCache = newSnapshot;
            snapshotCache.setSettings = setSettings;
        }
        return snapshotCache;
    }, [names]);

    return useSyncExternalStore(settingsSubscribe, getSnapshot);
}

export function TransparencyStylePicker() {
    const options = ['checkered', 'white', 'magenta', 'green', 'blue'];

    const { transparencyStyle, setSettings } =
        useSettingsOpt('transparencyStyle');

    const updateSettings: React.ChangeEventHandler<HTMLSelectElement> =
        useCallback(
            (e) => {
                setSettings({
                    transparencyStyle: e.target.value as TransparencyStyle,
                });
            },
            [setSettings],
        );

    return (
        <label>
            Transparency Style{' '}
            <select onChange={updateSettings} value={transparencyStyle}>
                {options.map((v) => (
                    <option value={v} key={v}>
                        {v}
                    </option>
                ))}
            </select>
        </label>
    );
}

export function ZoomPicker() {
    const { zoom, setSettings } = useSettingsOpt('zoom');

    const updateSettings: React.ChangeEventHandler<HTMLInputElement> =
        useCallback(
            (e) => {
                setSettings({
                    zoom: Number.parseFloat(e.target.value),
                });
            },
            [setSettings],
        );

    return (
        <label>
            Zoom{' '}
            <input
                type="number"
                min={0.25}
                step={'any'}
                max={100}
                onChange={updateSettings}
                value={zoom}
            />
        </label>
    );
}

export function AnimationToggle() {
    const { animation, setSettings } = useSettingsOpt('animation');

    const updateSettings: React.ChangeEventHandler<HTMLInputElement> =
        useCallback(
            (e) => {
                setSettings({
                    animation: e.target.checked,
                });
            },
            [setSettings],
        );

    return (
        <label>
            Animation
            <input
                type="checkbox"
                onChange={updateSettings}
                checked={animation}
            />
        </label>
    );
}

export function Mkt64AutoPaletteToggle() {
    const { autoPalette, setSettings } = useSettingsOpt('autoPalette');

    const updateSettings: React.ChangeEventHandler<HTMLInputElement> =
        useCallback(
            (e) => {
                setSettings({
                    autoPalette: e.target.checked,
                });
            },
            [setSettings],
        );

    return (
        <label>
            Auto Palette (WIP)
            <input
                type="checkbox"
                onChange={updateSettings}
                checked={autoPalette}
            />
        </label>
    );
}

export function FpsComponent() {
    const { fps, ticksPerFrame, setSettings } = useSettingsOpt(
        'fps',
        'ticksPerFrame',
    );
    const fpsRef = useRef<HTMLInputElement | null>(null);
    const tpfRef = useRef<HTMLInputElement | null>(null);

    const updateSettings: React.ChangeEventHandler<HTMLInputElement> =
        useCallback(() => {
            if (!fpsRef.current || !tpfRef.current) return;
            setSettings({
                fps: Number.parseFloat(fpsRef.current.value),
                ticksPerFrame: Number.parseFloat(tpfRef.current.value),
            });
        }, [setSettings]);

    return (
        <>
            <label title="Frames Per Second">
                FPS{' '}
                <input
                    ref={fpsRef}
                    type="number"
                    onChange={updateSettings}
                    value={fps}
                />
            </label>
            <label title="Ticks Per Frame">
                TPF{' '}
                <input
                    ref={tpfRef}
                    type="number"
                    onChange={updateSettings}
                    value={ticksPerFrame}
                />
            </label>
        </>
    );
}

export function MktPalettePicker() {
    const {
        mktPalettes: realMktPalettes,
        mktPalette: realMktPalette,
        setSettings,
    } = useSettingsOpt('mktPalette', 'mktPalettes');
    const mktPalettes = useDeferredValue(realMktPalettes, []);
    const mktPalette = useDeferredValue(realMktPalette, [0, 0]);
    console.log('rendering palette picker');

    const updateSettings = useCallback(
        ({ selectedItem }: { selectedItem: PaletteItem | null }) => {
            setSettings({
                mktPalette: selectedItem?.value,
            });
        },
        [setSettings],
    );

    const items = useMktN64PalettePickerInternal({ mktPalettes });
    return (
        <div>
            <FancySelect
                label="Palette"
                items={items}
                onSelectedItemChange={updateSettings}
                defaultSelectedItem={items.find(
                    (item: PaletteItem) =>
                        item.id === `${mktPalette[0]}_${mktPalette[1]}`,
                )}
            />
        </div>
    );
}

interface MktN64PalettePickerInternalProps {
    mktPalettes: { name: string; hash: string; palettes: LiteralDataEntry[] }[];
}

interface PaletteItem {
    label: string;
    id: string;
    value: [number, number];
    inputValue: string;
}

function useMktN64PalettePickerInternal({
    mktPalettes,
}: MktN64PalettePickerInternalProps): PaletteItem[] {
    return useMemo(() => {
        return mktPalettes.flatMap((paletteFile, pfIdx) =>
            paletteFile.palettes.map((palette, pIdx) => ({
                label: `${paletteFile.name}/${palette.label} (${palette.data.byteLength / 2})`,
                id: `${pfIdx}_${pIdx}`,
                value: [pfIdx, pIdx],
                inputValue: palette.label,
            })),
        );
    }, [mktPalettes]);
    // return (
    //     <>
    //         {mktPalettes.map((paletteFile, pfIdx) => (
    //             <optgroup key={pfIdx} label={paletteFile.name}>
    //                 {paletteFile.palettes.map((palette, pIdx) => (
    //                     <option
    //                         value={JSON.stringify([pfIdx, pIdx])}
    //                         key={`${pfIdx}_${pIdx}`}
    //                     >
    //                         {palette.label} ({palette.data.byteLength / 2})
    //                     </option>
    //                 ))}
    //             </optgroup>
    //         ))}
    //     </>
    // );
}

const MktN64PalettePickerInternal = memo(function MktN64PalettePickerInternal({
    mktPalettes,
}: MktN64PalettePickerInternalProps) {
    return (
        <>
            {mktPalettes.map((paletteFile, pfIdx) => (
                <optgroup key={pfIdx} label={paletteFile.name}>
                    {paletteFile.palettes.map((palette, pIdx) => (
                        <option
                            value={JSON.stringify([pfIdx, pIdx])}
                            key={`${pfIdx}_${pIdx}`}
                        >
                            {palette.label} ({palette.data.byteLength / 2})
                        </option>
                    ))}
                </optgroup>
            ))}
        </>
    );
});

const paletteFormats = [
    'RGBX5551',
    'XRGB1555',
    'RGB565',
    'RGB655',
    'RGB556',
    'BGRX5551',
    'XBGR1555',
    'BGR565',
    'BGR655',
    'BGR556',
];

export function MktPaletteFormatPicker() {
    const { mktPaletteFormat, setSettings } =
        useSettingsOpt('mktPaletteFormat');

    const updateSettings: React.ChangeEventHandler<HTMLSelectElement> =
        useCallback(
            (e) => {
                setSettings({
                    mktPaletteFormat: e.target.value,
                });
            },
            [setSettings],
        );

    return (
        <label>
            Palette Format{' '}
            <select onChange={updateSettings} value={mktPaletteFormat}>
                {paletteFormats.map((paletteFormat) => (
                    <option value={paletteFormat} key={paletteFormat}>
                        {paletteFormat}
                    </option>
                ))}
            </select>
        </label>
    );
}

export function MktN64DictPicker() {
    const { mktDicts, mktDictIndex, setSettings } = useSettingsOpt(
        'mktDicts',
        'mktDictIndex',
    );

    const updateSettings: React.ChangeEventHandler<HTMLSelectElement> =
        useCallback(
            (e) => {
                setSettings({
                    mktDictIndex: JSON.parse(e.target.value),
                });
            },
            [setSettings],
        );

    return (
        <label>
            Dict{' '}
            <select
                onChange={updateSettings}
                value={JSON.stringify(mktDictIndex)}
            >
                {mktDicts.map((d, dIdx) => (
                    <option value={JSON.stringify(dIdx)} key={`${dIdx}`}>
                        {d.filename}
                    </option>
                ))}
            </select>
        </label>
    );
}
