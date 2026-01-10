import { useCallback, useMemo } from 'react';
import CachedPngImg from './CachedPngImg';
import type { ImageLibraryProps } from './ImageLibrary';
import styles from './ImageLibrary.module.css';
import type { Palettes } from './parse-image-header';
import { addSelection, removeSelection } from './Selection';
import { useSettings } from './Settings';
import { encodePaletteAsPng } from './toPng';

export function PaletteComponent({ imageLibrary }: ImageLibraryProps) {
    const { zoom } = useSettings();

    const handleChecked: React.ChangeEventHandler<
        HTMLInputElement & { value: string; checked: boolean }
    > = useCallback((e) => {
        const paletteIndex = Number.parseInt(e.currentTarget.value);
        if (e.currentTarget.checked) {
            addSelection({ palettes: [paletteIndex] });
        } else {
            removeSelection({ palettes: [paletteIndex] });
        }
    }, []);

    return imageLibrary.palettes.map((palette, i) => {
        const paddedIndex = i.toString().padStart(3, '0');
        const urlParts = [
            'palettes',
            paddedIndex,
            `${paddedIndex}-${palette.paletteHeader.name}.png`,
        ];
        return (
            <label
                className={styles.imageCell}
                key={`${i}_${palette.paletteHeader.name}`}
            >
                <input
                    style={{ justifySelf: 'right' }}
                    type="checkbox"
                    onChange={handleChecked}
                    value={i}
                />
                <DrawPalettePng
                    palette={palette}
                    urlParts={urlParts}
                    zoom={zoom}
                />

                <div>{palette.paletteHeader.name}</div>
            </label>
        );
    });
}

const DrawPalettePng = ({
    palette,
    zoom,
    urlParts,
}: {
    palette: Palettes;
    zoom: number;
    urlParts: string[];
}) => {
    const { paletteHeader, paletteData } = palette;
    const data = useMemo(() => {
        return encodePaletteAsPng({ paletteHeader, paletteData });
    }, [paletteHeader, paletteData]);

    return (
        <CachedPngImg
            data={data}
            urlParts={urlParts}
            name={paletteHeader.name}
            zoom={zoom * 8}
            width={16}
        />
    );
};
