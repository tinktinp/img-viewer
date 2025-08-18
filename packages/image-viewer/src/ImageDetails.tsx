import styles from './ImageDetails.module.css';
import type { ImageLibrary } from './useImageLibrary';

export function ImageDetails({
    imageLibrary,
    imageIndex,
}: {
    imageLibrary: ImageLibrary;
    imageIndex: number;
}) {
    if (!imageLibrary.images[imageIndex]) {
        return;
    }
    const { libraryHeader } = imageLibrary;
    const { imageHeader } = imageLibrary.images[imageIndex];

    return (
        <table className={styles.imageDetails}>
            <caption>Image Details</caption>
            <tbody>
                <tr>
                    <th scope="row">Name</th>
                    <td>{imageHeader.name}</td>
                </tr>
                <tr>
                    <th scope="row">Flags</th>
                    <td>0x{imageHeader.flags.toString(16)}</td>
                </tr>
                <tr>
                    <th scope="row">X Offset</th>
                    <td>{imageHeader.xOffset}</td>
                </tr>
                <tr>
                    <th scope="row">Y Offset</th>
                    <td>{imageHeader.yOffset}</td>
                </tr>
                <tr>
                    <th scope="row">X Size</th>
                    <td>{imageHeader.xSize}</td>
                </tr>
                <tr>
                    <th scope="row">Y Size</th>
                    <td>{imageHeader.ySize}</td>
                </tr>
                <tr>
                    <th scope="row">Palette</th>
                    <td>{imageHeader.palette}</td>
                </tr>
                <tr>
                    <th scope="row">Offset</th>
                    <td>{imageHeader.imageDataOffset}</td>
                </tr>
                <tr>
                    <th scope="row">Data Pointer</th>
                    <td>{imageHeader.dataPointer}</td>
                </tr>
                <tr>
                    <th scope="row">Unused</th>
                    <td>{imageHeader.unused}</td>
                </tr>
                <tr>
                    <th scope="row">Frame Number</th>
                    <td>{imageHeader.frameNumber}</td>
                </tr>
                <tr>
                    <th scope="row">PT Table</th>
                    <td>{imageHeader.ptTable}</td>
                </tr>
                <tr>
                    <th scope="row">Other Palettes</th>
                    <td>{imageHeader.otherPalettes}</td>
                </tr>
                <tr>
                    <th scope="row">Damage Tables</th>
                    <td>
                        {imageHeader.damageTable
                            .map((bs) => `${bs.toString(10)}`)
                            .join(' ')}
                    </td>
                </tr>
            </tbody>
        </table>
    );
}
