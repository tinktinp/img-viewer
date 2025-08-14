import type { ImageLibrary } from './useImageLibrary';
import styles from './ImageDetails.module.css';
import type { SequenceScript } from './parse-image-header';
import { EntriesDetails, EntryDetails } from './EntryDetails';

export function SequenceDetails({
    imageLibrary,
    sequenceIndex,
}: {
    imageLibrary: ImageLibrary;
    sequenceIndex: number;
}) {
    if (!imageLibrary.sequences[sequenceIndex]) {
        return;
    }
    const { libraryHeader } = imageLibrary;
    const sequence: SequenceScript = imageLibrary.sequences[sequenceIndex];
    return (
        <table className={styles.imageDetails}>
            <caption>Sequence Details</caption>
            <tbody>
                <tr>
                    <th scope="row">Name</th>
                    <td>{sequence.name}</td>
                </tr>
                <tr>
                    <th scope="row">Flags</th>
                    <td>0x{sequence.flags.toString(16)}</td>
                </tr>
                <tr>
                    <th scope="row">Frames</th>
                    <td>{sequence.number}</td>
                </tr>
                <tr>
                    <th scope="row">Total Ticks</th>
                    <td>
                        {sequence.entries.reduce(
                            (total, cur) => cur.ticks + total,
                            0,
                        )}
                    </td>
                </tr>
                <tr>
                    <th scope="row">Start x,y</th>
                    <td>
                        {sequence.startX},{sequence.startY}
                    </td>
                </tr>

                <tr>
                    <th scope="row">Damage Tables</th>
                    <td>
                        {[
                            sequence.damageTable0,
                            sequence.damageTable1,
                            sequence.damageTable2,
                            sequence.damageTable3,
                            sequence.damageTable4,
                            sequence.damageTable5,
                        ]
                            .map((bs) => `${bs?.toString(10)}`)
                            .join(' ')}
                    </td>
                </tr>

                <tr>
                    <th colSpan={2}>Entries</th>
                </tr>
                <tr>
                    <td colSpan={2}>
                        <EntriesDetails
                            imageLibrary={imageLibrary}
                            entries={sequence.entries}
                        />
                    </td>
                </tr>
            </tbody>
        </table>
    );
}
