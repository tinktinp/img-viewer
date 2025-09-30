/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
} from 'react';
import type { WithChildren } from './WithChildren';
import type { LiteralDataEntry } from './asm/parser';
import type { MktN64Dict } from './asm/filterFiles';

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
        palettes: LiteralDataEntry[];
    }[];
    mktPaletteFormat: string;
    mktDicts: MktN64Dict[];
    mktDictIndex: number;
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
    setSettings: () => console.error('setSettings called without a provider!'),
};

export const SettingsContext = createContext<Settings>(defaultSettings);

export function SettingsProvider({ children }: WithChildren) {
    const [settings, setSettings] = useState<Settings>(defaultSettings);
    const value = useMemo(() => {
        return {
            ...settings,
            setSettings: (newSettings: Partial<Settings>) => {
                setSettings((oldSettings) => {
                    return {
                        ...oldSettings,
                        ...newSettings,
                    };
                });
            },
        };
    }, [settings]);

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    return useContext(SettingsContext);
}

export function TransparencyStylePicker() {
    const options = ['checkered', 'white', 'magenta', 'green', 'blue'];

    const { transparencyStyle, setSettings } = useSettings();

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
    const { zoom, setSettings } = useSettings();

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
    const { animation, setSettings } = useSettings();

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

export function FpsComponent() {
    const { fps, ticksPerFrame, setSettings } = useSettings();
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
    const { mktPalettes, mktPalette, setSettings } = useSettings();

    const updateSettings: React.ChangeEventHandler<HTMLSelectElement> =
        useCallback(
            (e) => {
                setSettings({
                    mktPalette: JSON.parse(e.target.value),
                });
            },
            [setSettings],
        );

    return (
        <label>
            Palette{' '}
            <select
                onChange={updateSettings}
                value={JSON.stringify(mktPalette)}
            >
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
            </select>
        </label>
    );
}

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
    const { mktPaletteFormat, setSettings } = useSettings();

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
    const { mktDicts, mktDictIndex, setSettings } = useSettings();

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
            <select onChange={updateSettings} value={JSON.stringify(mktDictIndex)}>
                {mktDicts.map((d, dIdx) => (
                    <option value={JSON.stringify(dIdx)} key={`${dIdx}`}>
                        {d.filename}
                    </option>
                ))}
            </select>
        </label>
    );
}
