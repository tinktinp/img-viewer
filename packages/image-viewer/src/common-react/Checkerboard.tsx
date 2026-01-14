import { memo } from 'react';
import { useSettingsOpt } from '../Settings';
import { withClass } from '../WithChildren';
import styles from './Checkerboard.module.css';

export const InnerCheckerboard = withClass(styles.checkerboard);

export type CheckerboardProps = Parameters<typeof InnerCheckerboard>[0];

export const Checkerboard = memo(function Checkerboard(
    props: CheckerboardProps,
) {
    const { transparencyStyle } = useSettingsOpt('transparencyStyle');

    return (
        <InnerCheckerboard
            data-style={transparencyStyle}
            {...props}
        ></InnerCheckerboard>
    );
});
