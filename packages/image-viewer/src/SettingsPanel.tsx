import {
    AnimationToggle,
    FpsComponent,
    MktN64DictPicker,
    MktPaletteFormatPicker,
    MktPalettePicker,
    TransparencyStylePicker,
    ZoomPicker,
} from './Settings';
import styles from './SettingsPanel.module.css';

export function SettingsPanel({ mode }: { mode: 'img' | 'mktn64' | 'mktpc' }) {
    return (
        <div className={styles.settingsPanel}>
            <div className={styles.heading}>Settings</div>
            {mode === 'mktn64' && (
                <>
                    <MktPalettePicker />
                    <MktPaletteFormatPicker />
                    <MktN64DictPicker />
                </>
            )}
            <TransparencyStylePicker />
            <ZoomPicker />
            {mode === 'img' && (
                <>
                    <AnimationToggle />
                    <FpsComponent />
                </>
            )}
        </div>
    );
}
