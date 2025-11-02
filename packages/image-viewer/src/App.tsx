import { type ChangeEventHandler, useCallback, useRef, useState } from 'react';
import styles from './App.module.css';
import { clearCache } from './cacheFiles';
import { ForkMe } from './ForkMe';
import HexView from './HexView';
import { ImageLibrary } from './ImageLibrary';
import { Layout, LayoutHeader, LayoutMain, LayoutSidebar } from './Layout';
import { PaletteComponent } from './PaletteComponent';
import { ScriptListLibrary } from './ScriptList';
import { type Selection, SelectionProvider } from './Selection';
import { SequenceListLibrary } from './SequenceList';
import { SettingsProvider } from './Settings';
import { ImageLibrarySidebar, Sidebar } from './Sidebar';
import { useImageLibrary } from './useImageLibrary';
import {
    filterFiles,
    type CategorizedFiles,
    type FileNameAndData,
} from './asm/filterFiles';
import { MktImages } from './MktImages';
import {
    filterMktPcFiles,
    type MktPcFileNameAndData,
} from './asm/mktPcImageFile';
import { MktPcImages } from './MktPcImages';

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
    text?: string; // never present
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
    const [allFiles, setAllFiles] = useState<FileList>();
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [mktFiles, setMktFiles] = useState<CategorizedFiles>();
    const [mktPcFiles, setMktPcFiles] = useState<MktPcFileNameAndData[]>([]);

    const [selectedFile, setSelectedFile] = useState<
        UploadedFile | FileNameAndData | undefined
    >();
    const imageLibrary = useImageLibrary(
        selectedFile?.buffer,
        selectedFile?.name || '',
    );

    const attFileIsSelected = Boolean(
        mktFiles && selectedFile?.name.toLowerCase().endsWith('att'),
    );
    const mktpcFileIsSelected = Boolean(
        mktFiles &&
            (selectedFile?.name.toLowerCase().endsWith('.dat') ||
                selectedFile?.name.toLowerCase().endsWith('.bin')),
    );
    const handleFiles: ChangeEventHandler<HTMLInputElement> = useCallback(
        async (e) => {
            if (e.target.files === null) return;

            const uploadedFiles: { name: string; buffer: ArrayBuffer }[] = [];
            const files: FileList = e.target.files;
            for (const file of files) {
                if (file.name.toLowerCase().endsWith('.img')) {
                    uploadedFiles.push({
                        name: file.webkitRelativePath || file.name,
                        buffer: await file.arrayBuffer(),
                    });
                }
            }
            uploadedFiles.sort((a, b) => sortNames(a.name, b.name));

            setAllFiles(files);
            setMktFiles(await filterFiles(files));
            setMktPcFiles(await filterMktPcFiles(files));
            setFiles(uploadedFiles);

            // if (uploadedFiles.length > 0) {
            //     setSelectedFile(uploadedFiles[0]);
            //     selectionRef.current?.clearSelection();
            // }
        },
        [],
    );
    const handleFileChosen: ChangeEventHandler<HTMLSelectElement> = useCallback(
        (e) => {
            setSelectedFile(
                files.find((f) => f.name === e.target.value) ||
                    mktFiles?.imgData.find((f) => f.name === e.target.value) ||
                    mktPcFiles.find((f) => f.name === e.target.value),
            );
            selectionRef.current?.clearSelection();
            clearCache();
        },
        [files],
    );

    const emptyFile =
        selectedFile?.buffer?.byteLength === 0 ||
        selectedFile?.text?.length === 0;

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
                                    <option value="PLACEHOLDER">
                                        Choose Your Destiny
                                    </option>
                                    {files.map((f) => (
                                        <option key={f.name} value={f.name}>
                                            {f.name}
                                        </option>
                                    ))}

                                    {mktFiles?.imgData.map((f) => (
                                        <option key={f.name} value={f.name}>
                                            {f.name}
                                        </option>
                                    ))}

                                    {mktPcFiles.map((f) => (
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
                            {(allFiles?.length || 0) > 0 &&
                                !files.length &&
                                !mktFiles?.imgData.length &&
                                !mktPcFiles?.length && (
                                    <>
                                        <div className={styles.noFile}>
                                            There is no supported file that has
                                            been loaded.
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

                        {emptyFile && (
                            <LayoutMain>
                                <div className={styles.nothing}>
                                    You are nothing.
                                </div>
                            </LayoutMain>
                        )}

                        {!emptyFile && attFileIsSelected && (
                            <LayoutMain>
                                <MktImages
                                    selectedFile={selectedFile}
                                    mktFiles={mktFiles}
                                />
                            </LayoutMain>
                        )}

                        {!emptyFile && mktpcFileIsSelected && selectedFile && (
                            <LayoutMain>
                                <MktPcImages selectedFile={selectedFile} />
                            </LayoutMain>
                        )}

                        {!emptyFile &&
                            !attFileIsSelected &&
                            !mktpcFileIsSelected &&
                            imageLibrary && (
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
                        {(imageLibrary ||
                            attFileIsSelected ||
                            mktpcFileIsSelected) && (
                            <LayoutSidebar>
                                <Sidebar
                                    mode={
                                        attFileIsSelected
                                            ? 'mktn64'
                                            : mktpcFileIsSelected
                                              ? 'mktpc'
                                              : 'img'
                                    }
                                    imageLibrary={imageLibrary}
                                />
                            </LayoutSidebar>
                        )}
                    </Layout>
                </div>
            </SelectionProvider>
        </SettingsProvider>
    );
}

export default App;
