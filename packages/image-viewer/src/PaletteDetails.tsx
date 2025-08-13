import type { ImageLibrary } from './useImageLibrary';
import styles from './ImageDetails.module.css';

export function PaletteDetails({
    imageLibrary,
    paletteIndex,
}: {
    imageLibrary: ImageLibrary;
    paletteIndex: number;
}) {
    if (!imageLibrary.palettes[paletteIndex]) {
        return;
    }
    const { libraryHeader } = imageLibrary;
    const { paletteHeader } = imageLibrary.palettes[paletteIndex];

    return (
        <table className={styles.imageDetails}>
            <caption>Palette Details</caption>
            <tbody>
                <tr>
                    <th scope="row">Name</th>
                    <td>{paletteHeader.name}</td>
                </tr>
                <tr>
                    <th scope="row">Flags</th>
                    <td>0x{paletteHeader.flags.toString(16)}</td>
                </tr>
                <tr>
                    <th scope="row">Data Pointer</th>
                    <td>{paletteHeader.dataPointer}</td>
                </tr>
                <tr>
                    <th scope="row">Unused</th>
                    <td>{paletteHeader.unused}</td>
                </tr>
                <tr>
                    <th scope="row" title="Bits Per Pixel">
                        BPP
                    </th>
                    <td>{paletteHeader.bitsPerPixel}</td>
                </tr>
                <tr>
                    <th scope="row" title="Number Of Colors">
                        Colors
                    </th>
                    <td>{paletteHeader.numberOfColors}</td>
                </tr>
                <tr>
                    <th scope="row">Color Ind</th>
                    <td>{paletteHeader.colorIndicator}</td>
                </tr>
                <tr>
                    <th scope="row">Color Map</th>
                    <td>{paletteHeader.colorMap}</td>
                </tr>
            </tbody>
        </table>
    );
}
