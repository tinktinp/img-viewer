import styles from './MklkDetails.module.css';
import type { MklkImage, MklkSelectionObj } from '../MklkTypes';

export function MklkDetails({
    selectionObj,
}: {
    selectionObj: MklkSelectionObj;
}) {
    if (selectionObj.image) {
        return <MklkImageDetails image={selectionObj.image} />;
    }
}

export function MklkImageDetails({ image }: { image: MklkImage }) {
    return (
        <table className={styles.imageDetails}>
            <caption>Image Details</caption>
            <tbody>
                <tr>
                    <th scope="row">Name</th>
                    <td>{image.name}</td>
                </tr>
                <tr>
                    <th scope="row">Width</th>
                    <td>{image.width}</td>
                </tr>
                <tr>
                    <th scope="row">Height</th>
                    <td>{image.height}</td>
                </tr>
            </tbody>
        </table>
    );
}

