import {
    AnimationToggle,
    FpsComponent,
    MktPalettePicker,
    TransparencyStylePicker,
    ZoomPicker,
} from './Settings';
import styles from './SettingsPanel.module.css';

export function SettingsPanel({ mode }: { mode: 'img' | 'mkt' }) {
    return (
        <div className={styles.settingsPanel}>
            <div className={styles.heading}>Settings</div>
            {mode === 'mkt' && <MktPalettePicker />}
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
