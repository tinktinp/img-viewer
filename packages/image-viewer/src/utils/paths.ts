/**
 * Adds `\u{200B}` around any forward or backslashes.
 * This tells the browser it can break the line on either side of the slash.
 * @returns A new string that can break around slashes.
 */
export function pathAddNwbs(path?: string | undefined) {
    return path?.replaceAll(/\/|\\/g, '\u{200B}/\u{200B}');
}