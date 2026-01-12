import {
    type ChangeEventHandler,
    useCallback,
    useDebugValue,
    useMemo,
    useState,
} from 'react';
import styles from './App.module.css';
import { ArcadeRomsPlugin } from './arcade-roms/ArcadeRomsPlugin';
import {
    type CategorizedFiles,
    type FileNameAndData,
    filterFiles,
} from './asm/filterFiles';
import {
    filterMktPcFiles,
    type MktPcFileNameAndData,
} from './asm/mktPcImageFile';
import { clearCache } from './cacheFiles';
import { type BasicItem, FancySelect } from './FancySelect';
import { ForkMe } from './ForkMe';
// import HexView from './HexView';
import { ImageLibrary } from './ImageLibrary';
import { Layout, LayoutHeader, LayoutMain, LayoutSidebar } from './Layout';
import { MktPcImages } from './MktPcImages';
import { MklkImages } from './mklk/react/MklkImages';
import { MktN64Images } from './mkt-n64/MktN64Images';
import { MktN64Roms } from './mkt-n64-roms/mktN64Roms';
import { PaletteComponent } from './PaletteComponent';
import type { Plugin, PluginItem } from './plugin/plugin';
import { PluginItemComponent } from './plugin-react/PluginImages';
import { ScriptListLibrary } from './ScriptList';
import { clearSelection } from './Selection';
import { SequenceListLibrary } from './SequenceList';
import { SettingsProvider } from './Settings';
import { Sidebar } from './Sidebar';
import { useImageLibrary } from './useImageLibrary';

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

interface FileItem extends BasicItem {
    file: UploadedFile | FileNameAndData | undefined;
    isPluginItem?: boolean;
}

const plugins: Plugin[] = [new MktN64Roms(), new ArcadeRomsPlugin()];

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

function usePluginItems() {
    const [pluginItems, setPluginItems] = useState<
        Awaited<ReturnType<Plugin['getItemsFromFiles']>>[]
    >([]);
    useDebugValue(pluginItems);

    return { pluginItems, setPluginItems };
}

function useSelectedItem() {
    const [selectedItem, setSelectedItem] = useState<FileItem | undefined>();
    useDebugValue(selectedItem, (item) =>
        item ? { id: item.id, label: item.label } : undefined,
    );

    return { selectedItem, setSelectedItem };
}

export function App() {
    const [fileTypeData, setFileTypeData] = useState<unknown>(null);

    const fileTypeComponentRef = useCallback((value: unknown) => {
        if (value) {
            setFileTypeData(() => value);
        }
    }, []);
    const [allFiles, setAllFiles] = useState<File[]>();
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [mktFiles, setMktFiles] = useState<CategorizedFiles>();
    const [mktPcFiles, setMktPcFiles] = useState<MktPcFileNameAndData[]>([]);
    const [mklkFiles, setMklkFiles] = useState<UploadedFile[]>([]);

    const { pluginItems, setPluginItems } = usePluginItems();

    const [selectedFile, setSelectedFile] = useState<
        UploadedFile | FileNameAndData | undefined
    >();
    const { selectedItem, setSelectedItem } = useSelectedItem();
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
    const mklkFileIsSelected = Boolean(
        mklkFiles && selectedFile?.name.toLowerCase().endsWith('.sprite'),
    );

    const handleFiles: ChangeEventHandler<HTMLInputElement> = useCallback(
        async (e) => {
            if (e.target.files === null) return;

            const uploadedFiles: { name: string; buffer: ArrayBuffer }[] = [];
            const mklkFiles = [];
            const files: File[] = Array.from(e.target.files).sort((a, b) =>
                sortNames(a.name, b.name),
            );

            for (const file of files) {
                if (file.name.toLowerCase().endsWith('.img')) {
                    uploadedFiles.push({
                        name: file.webkitRelativePath || file.name,
                        buffer: await file.arrayBuffer(),
                    });
                } else if (file.name.toLowerCase().endsWith('.sprite')) {
                    mklkFiles.push({
                        name: file.webkitRelativePath || file.name,
                        buffer: await file.arrayBuffer(),
                    });
                }
            }
            uploadedFiles.sort((a, b) => sortNames(a.name, b.name));
            mklkFiles.sort((a, b) => sortNames(a.name, b.name));

            const pluginClaimedFiles = await Promise.all(
                plugins.map((p) => p.getItemsFromFiles(files)),
            );

            setAllFiles(files);
            setMktFiles(await filterFiles(files));
            setMktPcFiles(await filterMktPcFiles(files));
            setMklkFiles(mklkFiles);
            setFiles(uploadedFiles);
            setPluginItems(pluginClaimedFiles);
        },
        [setPluginItems],
    );

    const handleFileChosenV2 = useCallback(
        ({ selectedItem: item }: { selectedItem: FileItem | null }) => {
            setSelectedFile(item?.file);
            setSelectedItem(item ? item : undefined);
            clearSelection();
            clearCache();
        },
        [setSelectedItem],
    );

    const emptyFile =
        (selectedFile?.buffer?.byteLength === 0 ||
            selectedFile?.text?.length === 0) &&
        !selectedItem?.isPluginItem;

    const flatPluginClaimedFiles = useMemo(
        () => pluginItems.flat(),
        [pluginItems],
    );

    return (
        <SettingsProvider>
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
                            <FancySelect
                                onSelectedItemChange={handleFileChosenV2}
                                items={[
                                    {
                                        id: 'PLACEHOLDER',
                                        label: 'Choose Your Destiny',
                                        file: undefined,
                                    },
                                    ...files.map((f) => ({
                                        id: f.name,
                                        label: f.name,
                                        file: f,
                                    })),
                                    ...(mktFiles?.imgData || []).map((f) => ({
                                        id: f.name,
                                        label: f.name,
                                        file: f,
                                    })),
                                    ...mktPcFiles.map((f) => ({
                                        id: f.name,
                                        label: f.name,
                                        file: f,
                                    })),
                                    ...mklkFiles.map((f) => ({
                                        id: f.name,
                                        label: f.name,
                                        file: f,
                                    })),
                                    ...(flatPluginClaimedFiles as unknown as FileItem[]),
                                ]}
                            ></FancySelect>
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
                            !mktPcFiles?.length &&
                            !mklkFiles?.length &&
                            !pluginItems?.length && (
                                <>
                                    <div className={styles.noFile}>
                                        There is no supported file that has been
                                        loaded.
                                    </div>

                                    <div className={styles.noFile}>
                                        {' '}
                                        Only IMG files are supported. And .att
                                        files. And also .dat files and .sprite
                                        files.
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
                                <div>
                                    <small>
                                        Your weak, pathetic file is zero bytes.
                                    </small>
                                </div>
                            </div>
                        </LayoutMain>
                    )}

                    {selectedItem?.isPluginItem && (
                        <LayoutMain>
                            <PluginItemComponent
                                selectedItem={
                                    selectedItem as unknown as PluginItem
                                }
                            />
                        </LayoutMain>
                    )}

                    {!emptyFile && attFileIsSelected && (
                        <LayoutMain>
                            <MktN64Images
                                selectedFile={selectedFile as FileNameAndData}
                                mktFiles={mktFiles as CategorizedFiles}
                            />
                        </LayoutMain>
                    )}

                    {!emptyFile && mktpcFileIsSelected && selectedFile && (
                        <LayoutMain>
                            <MktPcImages
                                selectedFile={
                                    selectedFile as MktPcFileNameAndData
                                }
                            />
                        </LayoutMain>
                    )}

                    {!emptyFile && mklkFileIsSelected && selectedFile && (
                        <LayoutMain>
                            <MklkImages
                                selectedFile={selectedFile as UploadedFile}
                                ref={fileTypeComponentRef}
                            />
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
                        mktpcFileIsSelected ||
                        mklkFileIsSelected ||
                        selectedItem?.isPluginItem) && (
                        <LayoutSidebar>
                            <Sidebar
                                mode={
                                    attFileIsSelected
                                        ? 'mktn64'
                                        : mktpcFileIsSelected
                                          ? 'mktpc'
                                          : mklkFileIsSelected
                                            ? 'mklk'
                                            : 'img'
                                }
                                imageLibrary={imageLibrary}
                                modeData={fileTypeData}
                            />
                        </LayoutSidebar>
                    )}
                </Layout>
            </div>
        </SettingsProvider>
    );
}

export default App;
