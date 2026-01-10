// debuggingRegion.modules.name
// debuggingRegion.globalSymbolsTable. moduleIndex, isData, isCode, name

import fs from 'node:fs';

const dumpAll = true;
const dumpModules = true;
const doAddressStuff = false;

const filename = process.argv[2];

const segment1size = 0x3b2d5;
const segment1base = 0x266b4;
const segment2size = 0x5d140;
const segment2base = 0x8ca54;

const modsToDump = [
    'NEWPALS.ASM',
    'GRAPH1.ASM',
    'GRAPH2.ASM',
    'GRAPH3.ASM',
    'GRAPH4.ASM',
    'GRAPH5.ASM',
    'GRAPH6.ASM',
];

interface WatcomDebugSymbolsJson {
    debuggingRegion: {
        modules: {
            moduleIndex: number;
            name: string;
        }[];
        globalSymbolsTable: {
            addressOffset: number;
            addressSegment: number;
            moduleIndex: number;
            isStatic: boolean;
            isData: boolean;
            isCode: boolean;
            name: string;
        }[];
    };
}

const inputJson: WatcomDebugSymbolsJson = JSON.parse(
    fs.readFileSync(filename, 'utf-8'),
);

const outputArray = [];
const moduleHt = {};

for (const { name, moduleIndex } of inputJson.debuggingRegion.modules) {
    if (!dumpAll && !modsToDump.includes(name)) continue;
    const outMod = {
        moduleIndex,
        name,
        symbols: [],
    };
    outputArray.push(outMod);
    moduleHt[moduleIndex] = outMod;
}

inputJson.debuggingRegion.globalSymbolsTable.sort((a, b) => {
    return (
        cmp(a.moduleIndex, b.moduleIndex) ||
        cmp(a.addressSegment, b.addressSegment) ||
        cmp(a.addressOffset, b.addressOffset) ||
        0
    );
});

for (const s of inputJson.debuggingRegion.globalSymbolsTable) {
    if (s.moduleIndex in moduleHt) {
        if (doAddressStuff) {
            moduleHt[s.moduleIndex].symbols.push({
                name: s.name,
                segment: s.addressSegment,
                offset: s.addressOffset,
            });
        } else {
            moduleHt[s.moduleIndex].symbols.push(s.name);
        }
    }
}

dumpModules && console.log(JSON.stringify(outputArray, null, 4));

doAddressStuff &&
    outputArray.forEach((m) => {
        m.symbols.forEach((s, i) => {
            const segment = s.segment === 2 ? 'segment2base' : 'segment1base';
            if (m.name === 'NEWPALS.ASM') {
                // console.log(
                //     'Palette %s @ 0x%s + %s;',
                //     s.name.padEnd(12, ' '),
                //     s.offset.toString(16).padStart(6, '0'),
                //     s.segment === 2 ? 'segment2base' : 'segment1base',
                // );
            } else {
                let type = 'sprite';
                const nextI = i + 1;
                if (nextI in m.symbols) {
                    const size = m.symbols[nextI].offset - s.offset;
                    // console.log('size:', size);
                    if (size > 12) {
                        type = 'sprite_with_pal';
                    } else if (size < 12) {
                        type = 'sprite_simple';
                    }
                }
                console.log(
                    '%s %s @ 0x%s + %s;',
                    type.padEnd(15, ' '),
                    s.name.padEnd(12, ' '),
                    s.offset.toString(16).padStart(6, '0'),
                    segment,
                );
            }
        });
    });

function cmp(a: number, b: number) {
    if (a > b) return 1;
    if (a < b) return -1;
    return 0;
}
