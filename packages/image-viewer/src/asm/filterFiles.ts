import { encodeBuffersAsPng } from '../toPng';
import { mktN64DecompressImage as mktN64DecompressImage } from './decompressMktN64';
import {
    parseLiteralDataEntries,
    type AsmLine,
    type LiteralDataEntry,
} from './parser';

const fileTypes = [
    { ext: '.att', type: 'imgData' },
    { ext: '.atd', type: 'animation' },
    { ext: '.atz', type: 'animation' },
    { ext: '.s', type: 'animation' }, // Not usually, but these sometimes are like `.atd` files
    { ext: '.s', type: 'palette' },
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

export async function filterFiles(files: File[]): Promise<CategorizedFiles> {
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
                // don't break here; grab more than just one of each type of file
            }
        }
    }

    return outFiles;
}

export function isStaticPaletteFile(f: {name: string}) {
    return (
        f.name.toLowerCase().endsWith('imgpal.s') ||
        f.name.toLowerCase().endsWith('mkbkpal.s')
    );
}

/**
 * This only returns files in the same directory as the `mainFile`.
 * But, as a special exception, it does include `imgpal.s` and `mkbkpal.s`,
 * which contain palettes but are normally not stored with the other graphics.
 */
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
            isStaticPaletteFile(f) ||
            (f.name.startsWith(`${base}/`) &&
                !f.name.includes('/', base.length + 1)),
    );
}

export function mktN64ProcessImageFile(imgFile: FileNameAndData) {
    const images = parseLiteralDataEntries(imgFile.text.split('\n'), {
        filename: imgFile.name,
        lineNo: 0,
    });
    return images;
}

function isProbablyPalette(p: LiteralDataEntry) {
    if (p.label.endsWith('_CLT')) {
        // filter out the palette table (Color Lookup Table)
        // We want palettes, not tables with pointers to palettes.
        return false;
    }
    if (p.data.byteLength <= 0) {
        // filter out empty palettes
        return false;
    }
    let firstInstrLine: AsmLine | undefined;
    for (const l of p.asmLines) {
        if (l.instruction) {
            firstInstrLine = l;
            break;
        }
    }
    if (
        !firstInstrLine?.args ||
        firstInstrLine?.instruction?.toLocaleLowerCase() !== '.word'
    ) {
        // all the palettes seem to start with a `.word`.
        return false;
    }
    try {
        if (!firstInstrLine.args.match(/^\s*[0-9+-]/)) {
            return false;
        }
        const paletteLen = Number.parseInt(firstInstrLine.args);
        if (paletteLen < 1 || paletteLen > 256) {
            return false;
        }
    } catch (_e) {
        return false;
    }

    return true;
}

export function mktN64ProcessPaletteFiles(paletteFiles: FileNameAndData[]) {
    return paletteFiles.flatMap(mktN64ProcessPaletteFile);
}

export function mktN64ProcessPaletteFile(file: FileNameAndData) {
    const results = [];
    const palettes = parseLiteralDataEntries(file.text.split('\n'), {
        filename: file.name,
        lineNo: 0,
    }).filter(isProbablyPalette);

    if (palettes.length > 0) {
        results.push({
            name: file.name,
            palettes,
        });
    }
    return results;
}

export interface MktN64Dict extends LiteralDataEntry {
    filename: string;
}

export function processDictionary(
    dict?: FileNameAndData,
): MktN64Dict | undefined {
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

export function mktN64ImageDecompressToPng(
    meta: ImageMetaData | undefined,
    imageData: ArrayBufferLike,
    paletteData: ArrayBufferLike | number[][],
    paletteFormat: string,
    dictData?: ArrayBufferLike,
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
    const decompressedImageData = mktN64DecompressImage(
        new Uint8Array(imageData),
        dictData ? new Uint8Array(dictData) : undefined,
        meta || {
            animationFilename: 'none',
            name: 'missing-meta',
            width,
            height,
            xOffset: 0,
            yOffset: 0,
        },
    );

    // console.log(decompressedImageData);

    const png = encodeBuffersAsPng(
        decompressedImageData.slice(0, width * height),
        Array.isArray(paletteData) ? paletteData : new Uint8Array(paletteData),
        paletteFormat,
        width,
        height,
    );

    return png;
}

type AtdScannerState = 'none' | 'in-img-meta';
export interface ImageMetaData {
    animationFilename: string;
    name: string;
    frameName?: string;
    width: number;
    /** width without padding */
    realWidth?: number;
    height: number;
    xOffset: number;
    yOffset: number;
    paletteName?: string;
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
        animationFilename: 'none',
        name,
        width,
        height,
        xOffset: 0,
        yOffset: 0,
    };
}

const imageLabelLineRegex = /\s+.word\s+(?<name>[A-Za-z0-9_]+(_IMG))/;
// const spaceRegex = /(?:,\s*)|\s+/.source;
const spaceRegex = /(?:(?:,\s*)|\s+)/.source;
const digitRegex = (name: string) => new RegExp(`(?<${name}>[0-9+-]+)`).source;
const imageMetadataRegex = new RegExp(
    `\\s+[.]half\\s+${digitRegex('height')}${spaceRegex}${digitRegex('width')}${spaceRegex}${digitRegex('yOffset')}${spaceRegex}${digitRegex('xOffset')}`,
);
const imagePaletteNameLineRegex = new RegExp(
    `\\s+[.]word\\s+(?<paletteName>[A-Za-z_]+)`,
);
const labelLineRegExp = /^(?<labelName>[A-Za-z][A-Za-z0-9_]*):?\s?/;
const wordSymbolRegExp = /\s+.word\s+(?<name>[a-zA-Z][A-Za-z0-9_]*)/;

export function linksRecurse(
    grandParents: string[],
    visited: Set<string>,
    chain: string[],
    links: Map<string, string[]>,
) {
    return grandParents.flatMap((grandParent): string[][] => {
        if (!visited.has(grandParent)) {
            visited.add(grandParent);
            const nextChain = [grandParent, ...chain];
            const nextParents = links.get(grandParent);
            if (nextParents === undefined || nextParents.length === 0) {
                return [nextChain];
            }
            return linksRecurse(nextParents, visited, nextChain, links);
        }
        return [];
    });
}

/**
 * Get all the parent labels. Returns an array parents, starting at the root
 */
export function linksGetParents(links: Map<string, string[]>, key: string) {
    const parents = links.get(key);
    if (parents === undefined) {
        return [];
    }
    const visited = new Set<string>([key]);
    const results = linksRecurse(parents, visited, [], links);
    // console.log(`parents for ${key}`, results);
    return results;
}

function updateLabelToPaletteMap(
    map: Map<string, Set<string>>,
    parents: string[][],
    palette: string,
) {
    for (const tree of parents) {
        for (const label of tree) {
            const set = map.get(label);
            if (set) {
                set.add(palette);
            } else {
                map.set(label, new Set([palette]));
            }
        }
    }
}

function findPaletteForLabel(
    links: Map<string, string[]>,
    labelToPalettes: Map<string, Set<string>>,
    name: string,
): string | undefined {
    const parents = linksGetParents(links, name);
    for (const tree of parents) {
        for (const label of tree) {
            const set = labelToPalettes.get(label);
            if (set && set.size === 1) {
                return Array.from(set.values())[0];
            }
        }
    }

    return undefined;
}

export function extractImageMetaDataFromAtd(animation: FileNameAndData) {
    const links = new Map<string, string[]>();
    const lines = animation.text.split('\n');
    let state: AtdScannerState = 'none';
    let stateImgName = '';
    let currentLabel = '';
    const results = new Map<string, ImageMetaData>();
    let lastImageMeta: ImageMetaData | undefined;
    const labelToPalettes: Map<string, Set<string>> = new Map();

    for (const line of lines) {
        if (currentLabel) {
            const linkMatch = line.match(wordSymbolRegExp);
            if (linkMatch?.groups) {
                const { name } = linkMatch.groups;
                const parents = links.get(name);
                if (parents === undefined) {
                    links.set(name, [currentLabel]);
                } else {
                    parents.push(currentLabel);
                }
            }
        }

        const labelMatch = line.match(labelLineRegExp);
        if (labelMatch?.groups) {
            currentLabel = labelMatch.groups.labelName;
        } else if (state === 'none') {
            const match = line.match(imageLabelLineRegex);
            if (match?.groups) {
                const { name } = match.groups;
                stateImgName = name;
                state = 'in-img-meta';
            } else if (
                lastImageMeta &&
                lastImageMeta.frameName === currentLabel
            ) {
                const paletteMatch = line.match(imagePaletteNameLineRegex);
                if (paletteMatch?.groups) {
                    const { paletteName } = paletteMatch.groups;
                    lastImageMeta.paletteName = paletteName;

                    const parents = linksGetParents(links, currentLabel);
                    updateLabelToPaletteMap(
                        labelToPalettes,
                        parents,
                        paletteName,
                    );
                }
            } else {
                // console.log(`${animation.name}: line no match 1`, line);
            }
        } else if (state === 'in-img-meta') {
            const match = line.match(imageMetadataRegex);
            if (match?.groups) {
                const { width, height, xOffset, yOffset } = match.groups;
                lastImageMeta = {
                    animationFilename: animation.name,
                    name: stateImgName,
                    frameName: currentLabel,
                    width: (Number.parseInt(width) + 3) & ~3,
                    realWidth: Number.parseInt(width),
                    height: Number.parseInt(height),
                    xOffset: Number.parseInt(xOffset),
                    yOffset: Number.parseInt(yOffset),
                };
                results.set(stateImgName, lastImageMeta);
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

    results.values().forEach((v) => {
        if (v.paletteName === undefined) {
            v.paletteName = findPaletteForLabel(links, labelToPalettes, v.name);
        }
    });
    // console.log(Array.from(links.entries()));
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

export function extractImageMetaDataFromAtdsMulti(animations: FileNameAndData[]) {
    const allAnimations = animations.flatMap((a) => {
         return extractImageMetaDataFromAtd(a).values().toArray();
    });

    const rv = Map.groupBy(allAnimations, (a) => {
        return a.name
    });
    return rv;
}