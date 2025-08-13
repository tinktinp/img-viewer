import type { ImageLibrary } from './useImageLibrary';
import styles from './ImageLibraryDetails.module.css';

export function ImageLibraryDetails({
    imageLibrary,
}: {
    imageLibrary: ImageLibrary;
}) {
    const { libraryHeader } = imageLibrary;

    return (
        <table className={styles.imageLibraryDetails}>
            <caption>Image Library Details</caption>
            <tbody>
                <tr>
                    <th scope="row">Images</th>
                    <td>{libraryHeader.imageCount}</td>
                </tr>
                <tr>
                    <th scope="row">Palettes</th>
                    <td>{libraryHeader.paletteCount}</td>
                </tr>
                <tr>
                    <th scope="row">Offset to headers</th>
                    <td>0x{libraryHeader.offset.toString(16)}</td>
                </tr>
                <tr>
                    <th scope="row">Version</th>
                    <td>0x{libraryHeader.version.toString(16)}</td>
                </tr>
                <tr>
                    <th scope="row">Sequences</th>
                    <td>{libraryHeader.sequenceCount}</td>
                </tr>
                <tr>
                    <th scope="row">Scripts</th>
                    <td>{libraryHeader.scriptCount}</td>
                </tr>
                <tr>
                    <th scope="row">Damage Tables</th>
                    <td>{libraryHeader.damageTableCount}</td>
                </tr>
                <tr>
                    <th scope="row">Format</th>
                    <td>0x{libraryHeader.format.toString(16)}</td>
                </tr>
                <tr>
                    <th scope="row">Buffer Scripts</th>
                    <td>
                        {libraryHeader.bufferScripts
                            .map((bs) => `0x${bs.toString(16)}`)
                            .join(' ')}
                    </td>
                </tr>
            </tbody>
        </table>
    );
}
