import {
    type ClassAttributes,
    type CSSProperties,
    type HTMLAttributes,
    type JSX,
    memo,
    type ReactNode,
    useMemo,
} from 'react';
import { useSettingsOpt } from '../Settings';
import styles from './ZoomCSSProviderDisplayContents.module.css';

export type ZoomCssProviderDisplayContentsProps = JSX.IntrinsicAttributes &
    ClassAttributes<HTMLDivElement> &
    HTMLAttributes<HTMLDivElement> & { children?: ReactNode };

export const ZoomCssProviderDisplayContents = memo(function ZoomCssProviderDisplayContents({
    style,
    children,
    ...props
}: ZoomCssProviderDisplayContentsProps) {
    const { zoom } = useSettingsOpt('zoom');
    const zoomStyle: CSSProperties = useMemo(
        () => ({ ...style, '--zoom': zoom }) as CSSProperties,
        [zoom, style],
    );
    return (
        <div className={styles.wrapper} style={zoomStyle} {...props}>
            {children}
        </div>
    );
});
