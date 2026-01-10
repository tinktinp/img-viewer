// TODO: we should be able pass this in an an array since that's what the png lib wants
export const dummyPalette = new ArrayBuffer(2 * 256);
function initDummyPalette() {
    const dp = new DataView(dummyPalette);
    for (let i = 0; i < dp.byteLength; i += 2) {
        // cycle through various gray levels
        const imod = i % 32;
        dp.setUint16(i, imod | (imod << 5) | (imod << 10), false);
    }
}
initDummyPalette();