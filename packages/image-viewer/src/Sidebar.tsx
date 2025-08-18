import { Download } from './Download';
import { ImageDetails } from './ImageDetails';
import { ImageLibraryDetails } from './ImageLibraryDetails';
import { PaletteDetails } from './PaletteDetails';
import { useSelection } from './Selection';
import { SequenceDetails } from './SequenceDetails';
import { SettingsPanel } from './SettingsPanel';
import type { ImageLibrary } from './useImageLibrary';

export interface SidebarProps {
    imageLibrary: ImageLibrary;
}
export function Sidebar({ imageLibrary }: SidebarProps) {
    const {
        images: selectedImages,
        palettes: selectedPalettes,
        sequences: selectedSequences,
        scripts: selectedScripts,
    } = useSelection();
    return (
        <>
            <Download imageLibrary={imageLibrary} />
            <SettingsPanel />
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
