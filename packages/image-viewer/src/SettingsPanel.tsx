import {
    AnimationToggle,
    FpsComponent,
    Mkt64AutoPaletteToggle,
    MktN64DictPicker,
    MktPaletteFormatPicker,
    MktPalettePicker,
    TransparencyStylePicker,
    ZoomPicker,
} from './Settings';
import styles from './SettingsPanel.module.css';

export function SettingsPanel({ mode }: { mode: 'img' | 'mktn64' | 'mktpc' | 'mklk' }) {
    return (
        <div className={styles.settingsPanel}>
            <div className={styles.heading}>Settings</div>
            {mode === 'mktn64' && (
                <>
                    <Mkt64AutoPaletteToggle />
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
