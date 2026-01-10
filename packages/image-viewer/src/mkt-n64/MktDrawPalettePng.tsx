import { encodeBuffersAsPng } from '../toPng';

export const mktN64PaletteToPng = ({
    palette,
    paletteFormat,
}: {
    palette: ArrayBuffer;
    paletteFormat: string;
}) => {
    const paletteCopy = palette.slice();
    const imageData = [];
    for (let i = 0; i < paletteCopy.byteLength / 2; i++) {
        imageData[i] = i;
    }
    while (imageData.length % 16 !== 0) imageData.push(0);
    const imageForPalette = new Uint8Array(imageData);

    return encodeBuffersAsPng(
        imageForPalette,
        new Uint8Array(paletteCopy),
        paletteFormat,
        16,
        imageForPalette.byteLength / 16,
    );
};
