export const nameRegex = /(?<main>.+?)(?<number>[0-9]*)(?<suffix>[.].*)?$/;

export function sortNames(a: string, b: string) {
    const aPieces = a.match(nameRegex)?.groups as {
        main: string;
        number: string;
        suffix: string;
    };
    const bPieces = b.match(nameRegex)?.groups as {
        main: string;
        number: string;
        suffix: string;
    };
    if (aPieces.suffix === bPieces.suffix) {
        if (aPieces.main === bPieces.main) {
            const an = Number.parseInt(aPieces.number);
            const bn = Number.parseInt(bPieces.number);

            if (an === bn) return 0;
            else if (an < bn) return -1;
            else return 1;
        } else if (aPieces.main < bPieces.main) {
            return -1;
        } else {
            return 1;
        }
    } else if (aPieces.suffix < bPieces.suffix) {
        return -1;
    } else {
        return 1;
    }
}
