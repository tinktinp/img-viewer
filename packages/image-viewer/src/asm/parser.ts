const asmLineMatcher =
    /^(?<label>[\w$?]+:?)?(?:\s+(?<instruction>[.$\w]+)?)?\s*(?<args>(?:[-~:|\[\]/\w,()*.@<>+_$=?]|(?:"[^"]*")|(?:'[^']*')|(?:, +)|else +|if +|\s+)*)?\s*(?<comment>;.*)?$/;

const asmWholeLineComment = /^\s*[;*]/;
const asmWhitespaceLine = /^\s+$/;

export interface AsmFileMetaData {
    filename: string;
    lineNo: number;
}

export function parseAsmLine(
    line: string,
    { filename, lineNo }: AsmFileMetaData,
) {
    if (line.match(asmWholeLineComment)) {
        return { comment: line, line };
    }
    if (line.match(asmWhitespaceLine)) {
        // empty line
        return {};
    }
    const match = asmLineMatcher.exec(line);
    if (!match || !match.groups) {
        const trimmed = line.replace('\u001a', '').trim();
        if (trimmed.length > 0) {
            console.log(
                filename,
                ': failed to parse line! ',
                JSON.stringify(line),
                lineNo,
            );
        }
        return {};
    }
    let { label, instruction, args, comment } = match.groups;

    if (label?.endsWith(':')) label = label.substring(0, label.length - 1);

    return { label, instruction, args, comment, line };
}

export class AsmSymbol {
    public name: string;
    constructor(name: string) {
        this.name = name;
    }
}

export type DataEntry = SymbolicDataEntry | LiteralDataEntry;

export interface SymbolicDataEntry {
    kind: 'symbolic';
    comment: string;
    label: string;
    data: number | AsmSymbol[];
}

export interface LiteralDataEntry {
    kind: 'literal';
    comment: string;
    label: string;
    data: ArrayBuffer;
}
export function makeLiteralDataEntry({
    label = '',
    data = new ArrayBuffer(),
    comment = '',
}: Omit<Partial<LiteralDataEntry>, 'kind'> = {}): LiteralDataEntry {
    return {
        kind: 'literal',
        label,
        data,
        comment,
    };
}

class State {
    public endian: 'little' | 'big' = 'little';
    public dataView: DataView;
    public pos: number = 0;
    public align: number = 1;

    constructor(dataView: DataView) {
        this.dataView = dataView;
    }
}

const instructions = {
    '.align': processAlign,
    '.byte': processByte,
} as const;

function isKnownInstruction(
    instruction: string,
): instruction is keyof typeof instructions {
    return instruction in instructions;
}

function processAlign(_instruction: string, args: string, state: State) {
    const newAlign = Number.parseInt(args);
    if (Number.isFinite(newAlign)) {
        state.align = newAlign;
    }
}

function processByte(_instruction: string, args: string, state: State) {
    const bytes = args.split(/,\s*|\s+/);
    for (const byte of bytes) {
        if (!byte.length) continue;
        const byteAsNumber = Number.parseInt(byte);
        if (byteAsNumber < 0) state.dataView.setInt8(state.pos, byteAsNumber);
        else state.dataView.setUint8(state.pos, byteAsNumber);
        state.pos++;
    }
    let padding = bytes.length % state.align;
    while (padding > 0) {
        console.log('padding!');
        state.dataView.setUint8(state.pos++, 0);
        padding--;
    }
}

export function parseLiteralDataEntries(
    lines: IteratorObject<string>,
    metaData: AsmFileMetaData,
): LiteralDataEntry[] {
    const rv: LiteralDataEntry[] = [];

    let cur: Omit<LiteralDataEntry, 'kind'> = makeLiteralDataEntry();
    let runningComments: string[] = [];
    const state: State = new State(new DataView(new ArrayBuffer()));

    lines.forEach((line) => {
        const { label, instruction, args, comment } = parseAsmLine(
            line,
            metaData,
        );
        if (label) {
            appendDataEntry(label, comment);
        }

        if (comment && !instruction) {
            runningComments.push(comment);
        }

        if (instruction) {
            if (isKnownInstruction(instruction)) {
                instructions[instruction](instruction, args, state);
            }
        }
    });

    // since our queue to append an entry is the next label,
    // we need a special case to append the very last created entry
    if ((cur.label && rv.length === 0) || !Object.is(cur, rv[rv.length - 1])) {
        appendDataEntryOnly();
    }
    return rv;

    function appendDataEntry(label: string, comment: string) {
        if (cur.label) {
            appendDataEntryOnly();
        }
        cur = {
            label,
            comment: runningComments.join('\n'),
            data: new ArrayBuffer(1024, {
                maxByteLength: 10 * 1024 * 1024,
            }),
        };
        state.dataView = new DataView(cur.data);
        state.pos = 0;

        runningComments = [];
        if (comment) {
            cur.comment =
                cur.comment.length > 0 ? `${cur.comment}\n${comment}` : comment;
        }
    }

    function appendDataEntryOnly() {
        cur.data = cur.data.slice(0, state.pos);
        rv.push(makeLiteralDataEntry(cur));
    }
}
