import type { ImageLibrary } from './useImageLibrary';
import styles from './ImageDetails.module.css';
import type { Entry } from './parse-image-header';

export function EntryDetails({ entry }: { entry: Entry }) {
    const { image, sequence } = entry;

    return (
        <tr>
            <td>{entry.itemIndex}</td>
            <td>
                {image?.imageHeader.name}
                {sequence?.name}
            </td>
            <td>{entry.ticks}</td>
            <td>
                {entry.deltaX},{entry.deltaY}
            </td>
        </tr>
    );
}

export function EntriesDetails({
    entries,
}: {
    imageLibrary: ImageLibrary;
    entries: Entry[];
}) {
    return (
        <table className={styles.imageDetails}>
            <thead>
                <tr>
                    <th
                        title={
                            entries?.[0].image
                                ? 'Image Index Number'
                                : 'Sequence Index Number'
                        }
                    >
                        #
                    </th>
                    <th>Name</th>
                    <th>Ticks</th>
                    <th>Delta x,y</th>
                </tr>
            </thead>
            <tbody>
                {entries.map((entry, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                    <EntryDetails key={i} entry={entry} />
                ))}
            </tbody>
        </table>
    );
}
