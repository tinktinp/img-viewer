/// <reference types="node" />

import { Console } from 'node:console';
import minimist from 'minimist';
import { dumpRomNode } from '../arcade-roms/roms-cli';
import { dumpMk1Pc } from '../mk1-pc/mk1-pc';

const logger = new Console(process.stdout);

async function main() {
    const argv = minimist(process.argv.slice(2));
    console.log(argv);
    const { _: cmd } = argv;

    if (argv.help || cmd[0] === 'help') {
        display_help();
        process.exit(0);
    } else if (cmd[0] === 'dump-rom') {
        process.exit(await dumpRomCli(argv));
    } else if (cmd[0] === 'dump-mk1-pc') {
        process.exit(
            await dumpMk1Pc({ outdir: argv.outdir, indir: argv.indir }),
        );
    } else {
        logger.log('Unknown subcommand! Try "help" for help!');
        process.exit(1);
    }
}

function display_help() {
    logger.log('Usage image-view <command> [options]\n\n');
    logger.log('Examples:');
    logger.log(
        '    image-viewer dump-rom --mk1 --maincpu=/path/to/maincpu.rom --gfxrom=/path/to/gfxcpu.rom --outdir=/path/to/outdir',
    );
}

function dumpRomCli(argv: minimist.ParsedArgs) {
    const { maincpu, gfxrom, outdir, mk1 = false } = argv;

    if (!maincpu || !gfxrom || !outdir) {
        logger.log(
            'Arguments `maincpu`, `gfxrom`, and `outdir` are all required!',
        );
        return 1;
    }

    dumpRomNode({
        maincpu,
        gfxrom,
        outdir,
        mk1,
    });
}

await main();
