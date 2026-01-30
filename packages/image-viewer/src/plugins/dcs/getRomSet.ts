export interface DcsRomSet {
    file: File;
    romNumber: number;
}

export function getRomSet(files: File[], f: File): DcsRomSet[] {
    const rs: DcsRomSet[] = [];
    const strlen = f.webkitRelativePath.length;
    const prefix = f.webkitRelativePath.substring(0, strlen - f.name.length);
    for (const currFile of files) {
        if (currFile.webkitRelativePath.startsWith(prefix)) {
            let match = currFile.name.match(/[.]u([0-9])$/i);
            if (!match) {
                match = currFile.name.match(/u([0-9])[.]rom$/i);
            }
            if (!match) {
                match = currFile.name.match(/su([0-9])[.]l1$/i);
            }
            if (match) {
                rs.push({
                    file: currFile,
                    romNumber: Number.parseInt(match?.[1] as string),
                });
            }
        }
    }

    return rs;
}
