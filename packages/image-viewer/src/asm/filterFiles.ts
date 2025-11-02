import { encodeBuffersAsPng } from '../toPng';
import { decompress_image } from './decompress';
import { parseLiteralDataEntries, type LiteralDataEntry } from './parser';

const fileTypes = [
    { ext: '.att', type: 'imgData' },
    { ext: '.atd', type: 'animation' },
    { ext: '.s', type: 'animation' }, // Not usually, but these sometimes are like `.atd` files
    { ext: '.pal', type: 'palette' },
    { ext: '.rgb', type: 'palette' },
    { ext: '.mas', type: 'palette' }, // sometimes these have palettes too
    { ext: '.dct', type: 'dict' },
] as const;

export interface FileNameAndData {
    name: string;
    text: string;
    buffer?: ArrayBuffer; // never actually set, but simplifies some typing
}

export interface CategorizedFiles {
    imgData: FileNameAndData[];
    animation: FileNameAndData[];
    palette: FileNameAndData[];
    dict: FileNameAndData[];
}

export async function filterFiles(files: FileList): Promise<CategorizedFiles> {
    const outFiles: CategorizedFiles = {
        imgData: [],
        animation: [],
        palette: [],
        dict: [],
    };

    for (const file of files) {
        for (const fileType of fileTypes) {
            if (file.name.toLowerCase().endsWith(fileType.ext)) {
                outFiles[fileType.type].push({
                    name: file.webkitRelativePath || file.name,
                    text: await file.text(),
                });
                break;
            }
        }
    }

    return outFiles;
}

export function filterFilesByDirectory(
    mainFile: FileNameAndData,
    otherFiles: FileNameAndData[],
) {
    const fn = mainFile.name;
    if (!fn.includes('/')) {
        return otherFiles;
    }

    const parts = fn.split('/');
    parts.pop();
    const base = parts.join('/');
    return otherFiles.filter(
        (f) =>
            f.name.startsWith(`${base}/`) &&
            !f.name.includes('/', base.length + 1),
    );
}

export function processImageFile(imgFile: FileNameAndData) {
    const images = parseLiteralDataEntries(imgFile.text.split('\n'), {
        filename: imgFile.name,
        lineNo: 0,
    });
    return images;
}

export function processPaletteFiles(paletteFiles: FileNameAndData[]) {
    const results = [];
    for (const file of paletteFiles) {
        const palettes = parseLiteralDataEntries(file.text.split('\n'), {
            filename: file.name,
            lineNo: 0,
        }).filter(
            (p) => !p.label.endsWith('_CLT') /* filter out the palette table */,
        );
        if (palettes.length > 0) {
            results.push({
                name: file.name,
                palettes,
            });
        }
    }
    return results;
}

export interface MktN64Dict extends LiteralDataEntry {
    filename: string;
}

export function processDictionary(dict?: FileNameAndData): MktN64Dict | undefined {
    if (dict === undefined) return undefined;
    const dictLines = dict.text.split('\n');
    dictLines.unshift('dict:');
    const [dictionary] = parseLiteralDataEntries(dictLines, {
        filename: dict.name,
        lineNo: 0,
    });

    return { ...dictionary, filename: dict.name };
}

export function maxImageIndex(data: Uint8Array<ArrayBufferLike>): number {
    let max = 0;
    for (let i = 0; i < data.byteLength; i++) {
        max = Math.max(max, data[i]);
    }
    return max;
}

const debugDecompress = false;

export function imageToPng(
    meta: ImageMetaData | undefined,
    imageData: ArrayBuffer,
    paletteData: ArrayBuffer,
    paletteFormat: string,
    dictData?: ArrayBuffer,
) {
    const { width = 150, height = 150 } = meta || {};
    const view = new DataView(imageData);
    const firstWord = view.getUint32(0);
    const type = (firstWord >> 24) & 0b11_1111;
    const size = firstWord & 0x00ff_ffff;
    debugDecompress &&
        console.log('decompressing image', {
            type,
            size,
            width: meta ? width : 'unknown',
            height: meta ? height : 'unknown',
            'width*height': width * height,
            'imageData.byteLength': imageData.byteLength,
        });
    const decompressedImageData = decompress_image(
        new Uint8Array(imageData),
        dictData ? new Uint8Array(dictData) : undefined,
        meta || { name: 'missing-meta', width, height, xOffset: 0, yOffset: 0 },
    );

    const png = encodeBuffersAsPng(
        decompressedImageData.slice(0, width * height),
        new Uint8Array(paletteData),
        paletteFormat,
        width,
        height,
    );

    return png;
}

type AtdScannerState = 'none' | 'in-img-meta';
export interface ImageMetaData {
    name: string;
    width: number;
    height: number;
    xOffset: number;
    yOffset: number;
}

/**
 * Creates an ImageMetaData object given a name and length
 */
export function guessMetaData(name: string, length: number): ImageMetaData {
    let width = 150;
    let height = 150;
    for (let curWidth = Math.sqrt(length) / 2; curWidth < length; curWidth++) {
        if (length % curWidth === 0) {
            width = curWidth;
            height = length / curWidth;
            break;
        }
    }

    return {
        name,
        width,
        height,
        xOffset: 0,
        yOffset: 0,
    };
}

const imageLabelLineRegex = /\s+.word\s+(?<name>[A-Za-z0-9_]+_IMG)/;
// const spaceRegex = /(?:,\s*)|\s+/.source;
const spaceRegex = /(?:(?:,\s*)|\s+)/.source;
const digitRegex = (name: string) => new RegExp(`(?<${name}>[0-9+-]+)`).source;
const imageMetadataRegex = new RegExp(
    `\\s+[.]half\\s+${digitRegex('height')}${spaceRegex}${digitRegex('width')}${spaceRegex}${digitRegex('yOffset')}${spaceRegex}${digitRegex('xOffset')}`,
);
export function extractImageMetaDataFromAtd(animation: FileNameAndData) {
    const lines = animation.text.split('\n');
    let state: AtdScannerState = 'none';
    let stateImgName = '';
    const results = new Map<string, ImageMetaData>();

    for (const line of lines) {
        if (state === 'none') {
            const match = line.match(imageLabelLineRegex);
            if (match?.groups) {
                const { name } = match.groups;
                stateImgName = name;
                state = 'in-img-meta';
            } else {
                // console.log('line no match 1', line);
            }
        } else if (state === 'in-img-meta') {
            const match = line.match(imageMetadataRegex);
            if (match?.groups) {
                const { width, height, xOffset, yOffset } = match.groups;
                results.set(stateImgName, {
                    name: stateImgName,
                    // width: (Number.parseInt(width) + 3) & ~3,
                    width: (Number.parseInt(width) + 3) & 0b1111_1111_1111_1100,
                    height: Number.parseInt(height),
                    xOffset: Number.parseInt(xOffset),
                    yOffset: Number.parseInt(yOffset),
                });
                stateImgName = '';
                state = 'none';
            } else {
                if (line.includes('half')) {
                    console.warn(
                        'line has "half" but does not match regex!',
                        line,
                    );
                }
                // console.log('line no match 2', line);
            }
        }
    }

    return results;
}

export function extractImageMetaDataFromAtds(animations: FileNameAndData[]) {
    const entries = animations.flatMap((a) => {
        const rv = extractImageMetaDataFromAtd(a).entries().toArray();
        // console.log(`rv for ${a.name}`, rv);
        return rv;
    });

    return new Map(entries);
}
