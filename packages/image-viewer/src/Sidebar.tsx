import type { ImageLibrary } from './useImageLibrary';
import { ImageDetails } from './ImageDetails';
import { ImageLibraryDetails } from './ImageLibraryDetails';
import { useSelection } from './Selection';
import { SettingsPanel } from './SettingsPanel';
import { Download } from './Download';
import { PaletteDetails } from './PaletteDetails';

export interface SidebarProps {
    imageLibrary: ImageLibrary;
}
export function Sidebar({ imageLibrary }: SidebarProps) {
    const { images: selectedImages, palettes: selectedPalettes } =
        useSelection();
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
        </>
    );
}
