import {
    type ChangeEventHandler,
    type CSSProperties,
    useCallback,
    useRef,
    useState,
} from 'react';
import styles from './App.module.css';
import type { CategorizedFiles, FileNameAndData } from './asm/filterFiles';
import type { MktPcFileNameAndData } from './asm/mktPcImageFile';
import {
    type BasicItem,
    FancySelect,
    type FancySelectProps,
} from './FancySelect';
import { LayoutHeader } from './Layout';
import type { PluginItem } from './plugin';

export interface UploadedFile {
    name: string;
    buffer: ArrayBuffer;
    text?: string; // never present
}

export interface FileItem extends BasicItem {
    file: UploadedFile | FileNameAndData | undefined;
    isPluginItem?: boolean;
}

export interface AppHeaderProps {
    handleFiles: ChangeEventHandler<HTMLInputElement>;
    handleFileChosenV2: (args: { selectedItem: FileItem | null }) => void;
    files: UploadedFile[];
    flatPluginClaimedFiles: PluginItem[];
    mktFiles: CategorizedFiles | undefined;
    mktPcFiles: MktPcFileNameAndData[];
    mklkFiles: UploadedFile[];
    allFiles: File[] | undefined;
    pluginItems: PluginItem[][];
}
export function AppHeader(props: AppHeaderProps) {
    const {
        handleFiles,
        handleFileChosenV2,
        files,
        flatPluginClaimedFiles,
        mktFiles,
        mktPcFiles,
        mklkFiles,
        allFiles,
        pluginItems,
    } = props;

    const headerRef = useRef<HTMLDivElement>(null);
    const [headerStylesOverride, setHeaderStylesOverride] = useState<
        CSSProperties | undefined
    >();
    const [headerFillerStylesOverride, setHeaderFillerStylesOverride] =
        useState<CSSProperties | undefined>();
    const onIsOpenChange: FancySelectProps['onIsOpenChange'] = useCallback(
        (
            changes: Parameters<
                Required<FancySelectProps>['onIsOpenChange']
            >[0],
        ) => {
            if (changes.isOpen && headerRef.current) {
                const rect = headerRef.current.getBoundingClientRect();
                const { left, top, height } = rect;
                console.log(rect);
                setHeaderStylesOverride({
                    position: 'fixed',
                    left,
                    right: left,
                    top,
                });
                setHeaderFillerStylesOverride({
                    height,
                    marginBottom: '1rem',
                });
            } else {
                setHeaderStylesOverride(undefined);
                setHeaderFillerStylesOverride(undefined);
            }
        },
        [],
    );

    return (
        <LayoutHeader>
            <div
                style={headerFillerStylesOverride}
                className={styles.headerFiller}
            />
            <div
                ref={headerRef}
                style={headerStylesOverride}
                className={styles.headerInputWrapper}
            >
                <input
                    onChange={handleFiles}
                    type="file"
                    id="file-picker"
                    name="fileList"
                    webkitdirectory="webkitdirectory"
                    multiple
                />
                <FancySelect
                    onIsOpenChange={onIsOpenChange}
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
                            There is no supported file that has been loaded.
                        </div>

                        <div className={styles.noFile}>
                            {' '}
                            Only IMG files are supported. And .att files. And
                            also .dat files and .sprite files.
                        </div>

                        <div className={styles.noFile}>
                            You must consult the Elder Gods.
                        </div>
                    </>
                )}
        </LayoutHeader>
    );
}
