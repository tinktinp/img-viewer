import type { ImageMetaData } from './asm/filterFiles';
import type { MktN64SelectionObj } from './MktImages';
import styles from './MktPcDetails.module.css';

export function MktN64Details({
    selectionObj,
}: {
    selectionObj: MktN64SelectionObj;
}) {
    if (selectionObj.image) {
        return <MktN64ImageDetails selectionObj={selectionObj} />;
    } else if (selectionObj.palette) {
        return <MktN64PaletteDetails selectionObj={selectionObj} />;
    }
}

export function MktN64ImageDetails({
    selectionObj,
}: {
    selectionObj: MktN64SelectionObj;
}) {
    const { image } = selectionObj;
    if (!image) return undefined;
    const meta: Partial<ImageMetaData> = image.meta || {};
    const dictParts = image.dict?.filename.split('/');
    const dictName = dictParts ? dictParts[dictParts.length - 1] : '(none)';

    return (
        <table className={styles.imageDetails}>
            <caption>Image Details</caption>
            <tbody>
                <tr>
                    <th scope="row">Name</th>
                    <td>{meta.name || image.label}</td>
                </tr>
                <tr>
                    <th scope="row">Width</th>
                    <td>{meta.width}</td>
                </tr>
                <tr>
                    <th scope="row">Height</th>
                    <td>{meta.height}</td>
                </tr>
                <tr>
                    <th scope="row">X,Y Offset</th>
                    <td>
                        {meta.xOffset}, {meta.yOffset}
                    </td>
                </tr>
                <tr>
                    <th scope="row">Dict Used</th>
                    <td>{dictName}</td>
                </tr>
            </tbody>
        </table>
    );
}

export function MktN64PaletteDetails({
    selectionObj,
}: {
    selectionObj: MktN64SelectionObj;
}) {
    const { palette } = selectionObj;
    if (!palette) return undefined;
    return (
        <table className={styles.imageDetails}>
            <caption>Palette {palette.label}</caption>
            <tbody>
                <tr>
                    <th scope="row">Name</th>
                    <td>{palette.label}</td>
                </tr>
                <tr>
                    <th scope="row">Size</th>
                    <td>{palette.data.byteLength / 2}</td>
                </tr>
            </tbody>
        </table>
    );
}
