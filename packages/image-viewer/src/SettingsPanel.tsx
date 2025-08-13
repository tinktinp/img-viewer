import { AnimationToggle, TransparencyStylePicker, ZoomPicker } from './Settings';
import styles from './SettingsPanel.module.css';

export function SettingsPanel() {
    return (
        <div className={styles.settingsPanel}>
            <div className={styles.heading}>Settings</div>
            <TransparencyStylePicker />
            <ZoomPicker />
            <AnimationToggle />
        </div>
    );
}
