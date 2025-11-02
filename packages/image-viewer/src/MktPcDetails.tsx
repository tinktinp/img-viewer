import type { MktPcImage, MktPcPalette } from './asm/mktPcImageFile';
import styles from './MktPcDetails.module.css';
import type { MktSelectionObj } from './MktPcImages';

export function MktPcDetails({
    selectionObj,
}: {
    selectionObj: MktSelectionObj;
}) {
    if (selectionObj.image) {
        return <MktPcImageDetails image={selectionObj.image} />;
    } else if (selectionObj.palette) {
        return <MktPcPaletteDetails palette={selectionObj.palette} />;
    }
}

export function MktPcImageDetails({ image }: { image: MktPcImage }) {
    let captionType = 'Image';
    if (image.isFloor) captionType = 'Floor';
    if (image.isTile) captionType = 'Tile';

    return (
        <table className={styles.imageDetails}>
            <caption>{captionType} Details</caption>
            <tbody>
                <tr>
                    <th scope="row">Id</th>
                    <td>{image.id}</td>
                </tr>
                <tr>
                    <th scope="row">Data Offset</th>
                    <td>{image.dataOffset}</td>
                </tr>

                <tr>
                    <th scope="row">Width</th>
                    <td>{image.width}</td>
                </tr>
                <tr>
                    <th scope="row">Height</th>
                    <td>{image.height}</td>
                </tr>

                <tr>
                    <th scope="row">X,Y Offset</th>
                    <td>
                        {image.xOffset}, {image.yOffset}
                    </td>
                </tr>

                <tr>
                    <th scope="row">Palette</th>
                    <td>{image.paletteId}</td>
                </tr>
                <tr>
                    <th scope="row">File Id</th>
                    <td>{image.fileId}</td>
                </tr>
                <tr>
                    <th scope="row">Type</th>
                    <td>{image.type}</td>
                </tr>
                <tr>
                    <th scope="row">Compression Type</th>
                    <td>{image.compressionType}</td>
                </tr>
            </tbody>
        </table>
    );
}

export function MktPcPaletteDetails({ palette }: { palette: MktPcPalette }) {
    return (
        <table className={styles.imageDetails}>
            <caption>Palette {palette.id}</caption>
            <tbody>
                <tr>
                    <th scope="row">Size</th>
                    <td>{palette.paletteSize}</td>
                </tr>
            </tbody>
        </table>
    );
}
