import type { FC, ReactNode } from 'react';
import { Fragment } from 'react/jsx-runtime';
import styles from './EntryDetails.module.css';
import imageDetailsStyles from './ImageDetails.module.css';
import type { Entry } from './parse-image-header';
import type { ImageLibrary } from './useImageLibrary';

export function EntryDetails({
    entry,
    expand = false,
    className,
}: {
    entry: Entry;
    expand?: boolean;
    className?: string;
}) {
    const { image, sequence } = entry;
    const Wrapper: FC<{ children: ReactNode }> = expand
        ? ({ children }) => (
              <details open>
                  <summary>{children}</summary>
              </details>
          )
        : Fragment;

    return (
        <tr className={className}>
            <td>
                <Wrapper>{entry.itemIndex}</Wrapper>
            </td>
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
    imageLibrary,
    entries,
}: {
    imageLibrary: ImageLibrary;
    entries: Entry[];
}) {
    const isImage = entries?.[0].image;
    const isSequence = Boolean(entries?.[0].sequence);

    return (
        <table className={imageDetailsStyles.imageDetails}>
            <thead>
                <tr>
                    <th
                        title={
                            isImage
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
                    <Fragment key={i}>
                        <EntryDetails
                            entry={entry}
                            expand={isSequence}
                            className={styles.summary}
                        />

                        {isSequence && (
                            <>
                                {/* <tr className={styles.summary}>
                                    <td colSpan={4}>
                                        <details>
                                            <summary>Test</summary>
                                        </details>
                                    </td>
                                </tr> */}
                                <tr className={styles.details}>
                                    <td colSpan={4}>
                                        <EntriesDetails
                                            imageLibrary={imageLibrary}
                                            entries={entry.sequence!.entries}
                                        />
                                    </td>
                                </tr>
                            </>
                        )}
                    </Fragment>
                ))}
            </tbody>
        </table>
    );
}
