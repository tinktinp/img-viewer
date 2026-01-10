import type { ImageMetaData } from '../asm/filterFiles';
import type { MktN64SelectionObj } from './useMktN64HandleSelection';
import styles from './MktN64Details.module.css';
import { pathAddNwbs } from '../utils/paths';
import { mktN64GetImageInfo } from '../asm/decompressMktN64';
import { primeFactors } from '../utils/primes';

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
    const info = mktN64GetImageInfo(new Uint8Array(image.imageData));

    return (
        <table className={styles.imageDetails}>
            <caption>Image Details</caption>
            <tbody>
                <tr>
                    <th scope="row">Name</th>
                    <td>{meta.name || image.label}</td>
                </tr>
                <tr>
                    <th scope="row">Frame Name</th>
                    <td>{meta.frameName}</td>
                </tr>
                {meta.width && meta.realWidth && (
                    <>
                        <tr>
                            <th scope="row">Width</th>
                            <td>{meta.realWidth}</td>
                        </tr>
                        <tr>
                            <th scope="row">Width Padding</th>
                            <td>{meta.width - meta?.realWidth}</td>
                        </tr>
                    </>
                )}
                {meta.realWidth === undefined && (
                    <tr>
                        <th scope="row">Width</th>
                        <td>{meta.width}</td>
                    </tr>
                )}
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
                    <th scope="row">Palette Name</th>
                    <td>{meta.paletteName}</td>
                </tr>

                <tr>
                    <th scope="row">Ani File</th>
                    <td>{pathAddNwbs(meta.animationFilename)}</td>
                </tr>

                <tr>
                    <th scope="row">Dict Used</th>
                    <td>{dictName}</td>
                </tr>

                <tr>
                    <th scope="row">Type</th>
                    <td>{info.type}</td>
                </tr>

                <tr>
                    <th scope="row">Type Name</th>
                    <td>
                        {info.typeName || info.type}
                        {info.knownType ? '' : ' (Unknown Type!)'}
                    </td>
                </tr>
                <tr>
                    <th scope="row">Size (From Header)</th>
                    <td>{info.size.toLocaleString()}</td>
                </tr>
                <tr>
                    <th scope="row">Size's Factors</th>
                    <td>{primeFactors(info.size).join(', ')}</td>
                </tr>
                <tr>
                    <th scope="row">Size (From Meta)</th>
                    <td>
                        {(
                            (meta.height || 0) * (meta.width || 0)
                        ).toLocaleString()}
                    </td>
                </tr>
                <tr>
                    <th scope="row">Needs Dict?</th>
                    <td>{info.needsDict ? 'yes' : 'no'}</td>
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
