import fs from 'node:fs';
import { expect, test } from '@rstest/core';
import { parseAsmLine, parseLiteralDataEntries } from './parser';

const someBytesAsm = fs.readFileSync(__dirname + '/fixture/someBytes.asm', {
    encoding: 'ascii',
});

const filename = 'example.asm';
const lineNo = 1;
const options = {
    filename,
    lineNo,
};

function m(args: Partial<ReturnType<typeof parseAsmLine>>) {
    return {
        args: undefined,
        comment: undefined,
        instruction: undefined,
        label: undefined,
        ...args,
    };
}

test('parses a label by itself', () => {
    const line = 'MY_IMG:';
    const result = parseAsmLine(line, options);
    expect(result).toMatchObject(m({ label: 'MY_IMG' }));
});

test('parses a label with other stuff', () => {
    const line = 'MY_IMG	.long	OTHER_LABEL,0';
    const result = parseAsmLine(line, options);
    expect(result).toMatchObject(
        m({ label: 'MY_IMG', instruction: '.long', args: 'OTHER_LABEL,0' }),
    );
});

test('parses a .long without a label', () => {
    const line = '	.long	OTHER_LABEL,0';
    const result = parseAsmLine(line, options);
    expect(result).toMatchObject(
        m({ instruction: '.long', args: 'OTHER_LABEL,0' }),
    );
});

test('parses someBytes.asm correct', () => {
    const lines = someBytesAsm.split('\n');
    const result = parseLiteralDataEntries(
        lines as unknown as IteratorObject<string>,
        options,
    );
    console.log('result is', result);
    expect(result[0].label).toEqual('SOME_IMG');
    expect(result[0].comment).toEqual('; This IMG is really cool');
    expect(result[0].data.byteLength).toBe(32);
});
