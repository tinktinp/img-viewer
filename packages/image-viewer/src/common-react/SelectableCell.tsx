import {
    type CSSProperties,
    Fragment,
    memo,
    type ReactNode,
    useMemo,
} from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Checkerboard } from './Checkerboard';
import { Loading } from './Loading';
import styles from './SelectableCell.module.css';

export interface SelectableCellProps {
    name: string;
    name2?: string;
    children?: ReactNode;
    value?: string;
    checkerboard?: boolean;
    width?: number;
    height?: number;
    isLoading?: boolean;
}

/**
 * This is the wrapper around an image, palette, etc.
 *
 * It wraps it's children in a label and adds a checkbox.
 *
 * It adds the background checkerboard or background color.
 *
 * It shows a Loading indicator when needed.
 *
 * The actual image is passed in `children`. This is just the chrome.
 *
 * Note: it does not take `onChecked` (anymore) for performance reasons.
 * This is to avoid re-rendering if the `onChecked` callback changes.
 * Because events bubble up, what you should do instead is add an event
 * handler for `onClick` higher up.
 */
export const SelectableCell = memo(function SelectableCell({
    name,
    name2,
    children,
    value,
    checkerboard = true,
    width,
    height,
    isLoading = false,
}: SelectableCellProps) {
    const checkerboardProps = useMemo(() => {
        const props: { style?: CSSProperties } = {
            style: {
                minWidth: width && `calc(${width}px * var(--zoom))`,
                minHeight: height && `calc(${height}px * var(--zoom))`,
            },
        };

        if (!checkerboard) {
            delete props.style;
        }
        return props;
    }, [height, width, checkerboard]);

    const MaybeCheckerboard = checkerboard ? Checkerboard : Fragment;
    return (
        <label className={styles.imageCell}>
            {isLoading && <Loading />}
            <input type="checkbox" value={value} />
            <MaybeCheckerboard {...checkerboardProps}>
                <ErrorBoundary fallbackRender={Fallback}>
                    {children}
                </ErrorBoundary>
            </MaybeCheckerboard>

            <div>
                <div>{name}</div>
                {name2 && <div className={styles.name2}>{name2}</div>}
            </div>
        </label>
    );
});

function Fallback() {
    return 'Error';
}
