export const dummyPalette: [number, number, number, number][] = [];

for (let i = 0; i < 255; i++) {
    dummyPalette.push([
        (i * 4) % 256,
        (i * 4) % 256,
        (i * 4) % 256,
        i === 0 ? 0 : 255,
    ]);
}