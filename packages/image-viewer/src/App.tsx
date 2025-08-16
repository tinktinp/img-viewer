import { useCallback, useRef, useState, type ChangeEventHandler } from 'react';

import { useImageLibrary } from './useImageLibrary';
import { Layout, LayoutHeader, LayoutMain, LayoutSidebar } from './Layout';
import { SettingsProvider } from './Settings';
import { SelectionProvider, type Selection } from './Selection';
import { Sidebar } from './Sidebar';
import { ImageLibrary } from './ImageLibrary';
import { PaletteComponent } from './PaletteComponent';
import HexView from './HexView';
import { clearCache } from './cacheFiles';
import styles from './App.module.css';
import { SequenceListLibrary } from './SequenceList';
import { ScriptListLibrary } from './ScriptList';
import { ForkMe } from './ForkMe';

declare module 'react' {
    interface InputHTMLAttributes<T> extends React.HTMLAttributes<T> {
        webkitdirectory?: 'webkitdirectory';
    }
}

declare global {
    interface FileList {
        [Symbol.iterator](): ArrayIterator<File>;
    }
}

interface UploadedFile {
    name: string;
    buffer: ArrayBuffer;
}

const nameRegex = /(?<main>.+?)(?<number>[0-9]*)(?<suffix>[.].*)?$/;
function sortNames(a: string, b: string) {
    const aPieces = a.match(nameRegex)?.groups as {
        main: string;
        number: string;
        suffix: string;
    };
    const bPieces = b.match(nameRegex)?.groups as {
        main: string;
        number: string;
        suffix: string;
    };
    if (aPieces.suffix === bPieces.suffix) {
        if (aPieces.main === bPieces.main) {
            const an = Number.parseInt(aPieces.number);
            const bn = Number.parseInt(bPieces.number);

            if (an === bn) return 0;
            else if (an < bn) return -1;
            else return 1;
        } else if (aPieces.main < bPieces.main) {
            return -1;
        } else {
            return 1;
        }
    } else if (aPieces.suffix < bPieces.suffix) {
        return -1;
    } else {
        return 1;
    }
}

export function App() {
    const selectionRef = useRef<Selection>(null);
    const [allFiles, setAllFiles] = useState<FileList>([]);
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [selectedFile, setSelectedFile] = useState<
        UploadedFile | undefined
    >();
    const imageLibrary = useImageLibrary(
        selectedFile?.buffer,
        selectedFile?.name || '',
    );

    const handleFiles: ChangeEventHandler<HTMLInputElement> = useCallback(
        async (e) => {
            if (e.target.files === null) return;

            const uploadedFiles = [];
            const files: FileList = e.target.files;
            setAllFiles(files);
            for (const file of files) {
                if (file.name.toLowerCase().endsWith('.img')) {
                    uploadedFiles.push({
                        name: file.webkitRelativePath || file.name,
                        buffer: await file.arrayBuffer(),
                    });
                } else {
                    console.log('skipping ', file);
                }
            }
            uploadedFiles.sort((a, b) => sortNames(a.name, b.name));
            setFiles(uploadedFiles);
            if (uploadedFiles.length > 0) {
                setSelectedFile(uploadedFiles[0]);
                selectionRef.current?.clearSelection();
            }
        },
        [],
    );
    const handleFileChosen: ChangeEventHandler<HTMLSelectElement> = useCallback(
        (e) => {
            setSelectedFile(files.find((f) => f.name === e.target.value));
            selectionRef.current?.clearSelection();
            clearCache();
        },
        [files],
    );

    return (
        <SettingsProvider>
            <SelectionProvider ref={selectionRef}>
                <ForkMe />
                <div className="content">
                    <Layout>
                        <LayoutHeader>
                            <div style={{ marginBottom: '1rem' }}>
                                <input
                                    onChange={handleFiles}
                                    type="file"
                                    id="file-picker"
                                    name="fileList"
                                    webkitdirectory="webkitdirectory"
                                    multiple
                                />

                                <select
                                    onChange={handleFileChosen}
                                    value={selectedFile?.name}
                                >
                                    {files.map((f) => (
                                        <option key={f.name} value={f.name}>
                                            {f.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div
                                style={{
                                    fontStyle: 'italic',
                                }}
                            >
                                THERE IS NO KNOWLEDGE THAT IS NOT POWER
                            </div>
                            {allFiles.length > 0 && !files.length && (
                                <>
                                    <div className={styles.noFile}>
                                        There is no supported file that has been
                                        loaded.
                                    </div>

                                    <div className={styles.noFile}>
                                        {' '}
                                        Only IMG files are supported.
                                    </div>

                                    <div className={styles.noFile}>
                                        You must consult the Elder Gods.
                                    </div>
                                </>
                            )}
                        </LayoutHeader>

                        {imageLibrary && (
                            <LayoutMain>
                                <div>Images</div>
                                <div className={styles.itemsContainer}>
                                    <ImageLibrary
                                        imageLibrary={imageLibrary}
                                    ></ImageLibrary>
                                </div>
                                <div>Palettes</div>
                                <div className={styles.itemsContainer}>
                                    <PaletteComponent
                                        imageLibrary={imageLibrary}
                                    />
                                </div>
                                <div>Sequences</div>
                                <div className={styles.itemsContainer}>
                                    <SequenceListLibrary
                                        imageLibrary={imageLibrary}
                                    />
                                </div>
                                <div>Scripts</div>
                                <div className={styles.itemsContainer}>
                                    <ScriptListLibrary
                                        imageLibrary={imageLibrary}
                                    />
                                </div>
                                {/*  <HexView buffer={imageLibrary.buffer} />*/}
                            </LayoutMain>
                        )}
                        {imageLibrary && (
                            <LayoutSidebar>
                                <Sidebar imageLibrary={imageLibrary} />
                            </LayoutSidebar>
                        )}
                    </Layout>
                </div>
            </SelectionProvider>
        </SettingsProvider>
    );
}

export default App;
