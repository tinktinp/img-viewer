import { withClass } from './WithChildren';
import styles from './Checkerboard.module.css';
import { useSettings } from './Settings';

export const InnerCheckerboard = withClass(styles.checkerboard);

export type CheckerboardProps = Parameters<typeof InnerCheckerboard>[0];

export function Checkerboard(props: CheckerboardProps) {
    const { transparencyStyle } = useSettings();

    return (
        <InnerCheckerboard
            data-style={transparencyStyle}
            {...props}
        ></InnerCheckerboard>
    );
}
