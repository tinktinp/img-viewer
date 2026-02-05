import {
    type ChangeEventHandler,
    useCallback,
    useDebugValue,
    useMemo,
    useState,
} from 'react';
import styles from './App.module.css';
import { AppHeader, type FileItem, type UploadedFile } from './AppHeader';
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
import { ForkMe } from './ForkMe';
// import HexView from './HexView';
import { ImageLibrary } from './ImageLibrary';
import { Layout, LayoutMain, LayoutSidebar } from './Layout';
import { MktPcImages } from './MktPcImages';
import { MklkImages } from './mklk/react/MklkImages';
import { MktN64Images } from './mkt-n64/MktN64Images';
import { MktN64Roms } from './mkt-n64-roms/mktN64Roms';
import { PaletteComponent } from './PaletteComponent';
import type { Plugin, PluginItem } from './plugin/plugin';
import { PluginItemComponent } from './plugin-react/PluginImages';
import { DcsPlugin } from './plugins/dcs/DcsPlugin';
import { ScriptListLibrary } from './ScriptList';
import { clearSelection } from './Selection';
import { SequenceListLibrary } from './SequenceList';
import { SettingsProvider } from './Settings';
import { Sidebar } from './Sidebar';
import { Umk3IosPlugin } from './umk3-ios/Umk3IosPlugin';
import { useImageLibrary } from './useImageLibrary';
import { sortNames } from './utils/sortNames';

console.log('There is no knowledge that is not power. Feb 4th, 2026.');

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

const plugins: Plugin[] = [
    new MktN64Roms(),
    new ArcadeRomsPlugin(),
    new Umk3IosPlugin(),
    new DcsPlugin(),
];

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
                sortNames(a.webkitRelativePath, b.webkitRelativePath),
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
                    <AppHeader
                        handleFiles={handleFiles}
                        handleFileChosenV2={handleFileChosenV2}
                        files={files}
                        flatPluginClaimedFiles={flatPluginClaimedFiles}
                        mktFiles={mktFiles}
                        mktPcFiles={mktPcFiles}
                        mklkFiles={mklkFiles}
                        allFiles={allFiles}
                        pluginItems={pluginItems}
                    />

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
