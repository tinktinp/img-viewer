import {
    memo,
    useMemo,
    type ClassAttributes,
    type CSSProperties,
    type HTMLAttributes,
    type JSX,
    type ReactNode,
} from 'react';
import { useSettingsOpt } from './Settings';

export type ZoomCssProviderProps = JSX.IntrinsicAttributes &
    ClassAttributes<HTMLDivElement> &
    HTMLAttributes<HTMLDivElement> & { children?: ReactNode };

export const ZoomCssProvider = memo(function ZoomCssProvider({
    style,
    children,
    ...props
}: ZoomCssProviderProps) {
    const { zoom } = useSettingsOpt('zoom');
    const zoomStyle: CSSProperties = useMemo(
        () => ({ ...style, '--zoom': zoom }) as CSSProperties,
        [zoom, style],
    );
    return (
        <div style={zoomStyle} {...props}>
            {children}
        </div>
    );
});
