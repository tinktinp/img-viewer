import { Download } from './Download';
import { ImageDetails } from './ImageDetails';
import { ImageLibraryDetails } from './ImageLibraryDetails';
import type { MklkFileHeader } from './mklk/MklkTypes';
import { MklkFileDetails } from './mklk/react/MklkDetails';
import type { MklkRef } from './mklk/react/MklkImages';
import { PaletteDetails } from './PaletteDetails';
import { useSelection } from './Selection';
import { SequenceDetails } from './SequenceDetails';
import { SettingsPanel } from './SettingsPanel';
import type { ImageLibrary } from './useImageLibrary';

export interface SidebarProps {
    imageLibrary?: ImageLibrary;
    mode: 'img' | 'mktn64' | 'mktpc' | 'mklk';
    modeData: unknown;
}
export function Sidebar({ imageLibrary, mode, modeData }: SidebarProps) {
    const { fancySelectionObjs } = useSelection();
    return (
        <>
            <Download imageLibrary={imageLibrary} />
            <SettingsPanel mode={mode} />
            {imageLibrary && (
                <ImageLibrarySidebar imageLibrary={imageLibrary} />
            )}
            {mode === 'mklk' && modeData && (
                <MklkFileDetails {...(modeData as MklkRef)} />
            )}
            {fancySelectionObjs.map((f, idx) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: blah
                <f.SideBarComponent key={idx} />
            ))}
        </>
    );
}

export interface ImageLibrarySidebarProps {
    imageLibrary: ImageLibrary;
}
export function ImageLibrarySidebar({
    imageLibrary,
}: ImageLibrarySidebarProps) {
    const {
        images: selectedImages,
        palettes: selectedPalettes,
        sequences: selectedSequences,
        scripts: selectedScripts,
    } = useSelection();
    return (
        <>
            <ImageLibraryDetails
                imageLibrary={imageLibrary}
            ></ImageLibraryDetails>

            {selectedImages.map((imageIndex) => (
                <ImageDetails
                    key={imageIndex}
                    imageLibrary={imageLibrary}
                    imageIndex={imageIndex}
                />
            ))}

            {selectedPalettes.map((index) => (
                <PaletteDetails
                    key={index}
                    imageLibrary={imageLibrary}
                    paletteIndex={index}
                />
            ))}

            {selectedSequences.map((index) => (
                <SequenceDetails
                    key={index}
                    imageLibrary={imageLibrary}
                    sequenceIndex={index}
                />
            ))}

            {selectedScripts.map((index) => (
                <SequenceDetails
                    key={index}
                    imageLibrary={imageLibrary}
                    sequenceIndex={index}
                    script
                />
            ))}
        </>
    );
}
