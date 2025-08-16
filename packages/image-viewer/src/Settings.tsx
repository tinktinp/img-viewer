import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
} from 'react';
import type { WithChildren } from './WithChildren';

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
    setSettings: (newSettings: Partial<Settings>) => void;
}
const defaultSettings: Settings = {
    transparencyStyle: 'checkered',
    zoom: 1,
    animation: true,
    fps: 54.70684,
    ticksPerFrame: 5,
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
