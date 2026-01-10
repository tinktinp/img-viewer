export function toHex(n: number, padLen = 8): string {
    let asStr = Math.abs(n).toString(16).padStart(padLen, '0');
    const neg = n < 0 ? '-' : '';
    if (asStr.length > 4) {
        const sepIdx = asStr.length - 4;
        asStr = `${asStr.substring(0, sepIdx)}_${asStr.substring(sepIdx, asStr.length)}`;
    }
    asStr = `${neg}0x${asStr}`;
    return asStr;
}
