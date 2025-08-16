import type { JSX } from 'react/jsx-runtime';
import styles from './HexView.module.css';
import { Fragment, useMemo } from 'react';

function preventDefault(e: { preventDefault: () => void }) {
    e.preventDefault();
}

export function HexView({ buffer }: { buffer: ArrayBuffer }) {
    const view = useMemo(() => {
        return new DataView(buffer);
    }, [buffer]);
    const bytesPerRow = 16;
    const maxRows = 25;
    const len = view.byteLength;
    const rows: JSX.Element[] = [];

    for (let row = 0; row <= len / bytesPerRow && row < maxRows; row++) {
        const hexCol1 = getHexColumn(view, row * bytesPerRow, bytesPerRow / 2);
        const hexCol2 = getHexColumn(
            view,
            row * bytesPerRow + bytesPerRow / 2,
            bytesPerRow / 2,
        );

        rows.push(
            <Fragment key={row}>
                <div className={styles.address}>{row.toString(16)}0:</div>
                <div className={styles.hexColumnGroup}>
                    <div className={styles.hexColumn}>
                        {formatHexColumn(hexCol1)}
                    </div>
                    <div className={styles.hexColumn}>
                        {formatHexColumn(hexCol2)}
                    </div>
                </div>
                <div className={styles.ascii}>
                    {formatAscii(hexCol1)} {formatAscii(hexCol2)}
                </div>
            </Fragment>,
        );
    }
    // return <div contentEditable="true" onBeforeInput={preventDefault} onPaste={preventDefault} className={styles.hexView}>{rows}</div>;
    return <div className={styles.hexView}>{rows}</div>;
}

function formatAscii(column: number[]) {
    return (
        column
            .map((d) => (d < 127 && d > 21 ? String.fromCharCode(d) : '.'))
            // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
            //.map((c, i) => <div key={i}>{c}</div>)
            .join('')
    );
}

function formatHexColumn(column: number[]) {
    return column
        .map((d) => d.toString(16).toUpperCase().padStart(2, '0'))
        .join(' ');
}

function getHexColumn(
    view: DataView<ArrayBufferLike>,
    offset: number,
    length: number,
) {
    const data: number[] = [];
    for (let i = offset; i < offset + length && i < view.byteLength; i++) {
        data.push(view.getUint8(i));
    }
    return data;
}

export default HexView;
