# img-viewer

This is a web based viewer for `IMG` files. `IMG` files were used in Midway games in the late 80s and 90s.

Live version: [ImgViewer](https://tinktinp.github.io/img-viewer/)

It now also supports files from Mortal Kombat Trilogy (N64 and PSX/PC), and sprite files found in MKLK.

Also check out my other repos:
- [hexpat](https://github.com/tinktinp/hexpat) files for loading the sprites in the ImHex hex editor
- [watcom-debug-symbols](https://github.com/tinktinp/watcom-debug-symbols) for extracting the symbols from PC MKT and other files with Watcom debugging symbols

## What are `IMG` files?

`IMG` files are image libraries. They contain:
- a list of images
  - images have some metadata such as width/height, animation x/y, which palette to use, etc, as well as the uncompressed pixel data
  - the pixel data is 8 bits per pixel, and are indexes into the palette
- a list of palettes
  - palettes don't have to be directly used by any images
- a list of "sequences" or animation
  - these are lists of images, along with how many "ticks" to display them, and some other metadata
- a list of "scripts"
  - these are a list of "sequences"
  - basically they are longer animations that are made out of shorter animations
- a few more optional fields not yet handled
  - point tables
  - damage tables
  - alternative palettes


## What does this web-app do?

This program lets you "upload" (the browser) a folder containing `.IMG` files. It filters
out other types of files. It lets you choose a file to explore. It picks the first file
to display by default.

Once a file is chosen, it attempts to display all of the images, all of the palettes, and all of the sequences and scripts (both animations) contained in that file. It also shows most of the meta data.

To do this, it re-encodes the individual images or animations as png's or gif's

### Features

 - Download Button: select images, palettes, sequences and scripts and click Download to download them
  - images down as PNGs
  - palettes download as [ACT files](https://mugen.fandom.com/wiki/List_of_M.U.G.E.N_file_formats#ACT)
  - sequences and scripts download as GIFs
- Drag and Drop
  - just the built in browser feature, but some effort was put in to make sure the files are named appropriately
  - Palettes will save as PNGs when dropped into a folder
  - the PNG is an indexed PNG that does contain the palette
- Right Click -> Save Link As
- Right Click -> Save Image As
  - this is broken in Chrome, use Save Link As instead

### Known To Work

At least some IMG files from these games are known to work.

This app might crash while loading certain files. It may display others incorrectly. 

- Mortal Kombat II
- Mortal Kombat 3 / Ultimate Mortal Kombat 3 / Mortal Kombat Trilogy
- NARC
- NBA Hangtime
- NBA Jam
- Open Ice
- Road Kill
- Revolution X
- SmashTV
- Total Carnage
- WWF Wrestlemania

### MKT N64

[More details here.](packages/image-viewer/src/asm/README.md)

The leak for this game contains image data in the form of basically hex dumps in assembly language files.  These images are compressed in various ways. There a lot of old, backup, or cut versions of the sprites, including some that did not appear in any version of the game.

Some of the files, especially the palettes, seem to be for a different version of the game. There is a lot more manual choose of palettes and dictionaries needed for this one.

### MKT PSX / PC (DOS / Windows)

There has not been a leak of this game to my knowledge. This tool can load the `.dat` sprite files for both the characters and stages. Some versions name them `.bin`. 

Note that the audio files are not supported, but sometimes have the same file extension. 

The `.bin` files named after the characters in the root of the PC version and the `code/` folder of the PSX are not supported. They contain the animation data (the various `anitab`s) but no actual graphics. 

Most characters have 3 files, plus appear in some common files such as `stances.dat`. There seem to be a lot of duplicate frames that appear in all three files. The `bq` and `fat` files themselves may appear to contain duplicate sprites within the same file, but upon closer inspection, you'll see that they have multiple image headers pointing to the same pixels.

The Saturn version is not supported yet. (It appears to have the same files but encoded in big endian byte order).

### Client-side Only / Service Worker

This web app is client or browser only; there is no server side code. It does need
a static web server. For that I am using Github pages.

It does use a [Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API). This is an in-browser proxy. 

When it re-encodes images as pngs or gifs, it stores them in the browser's [Cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache) using a Javascript browser API. 

The Service Worker is used to give these cached images fake urls. The fake urls make drag and drop work better. When you drag an image out of the browser, it names it after the url. So the Service Worker is used to give the images names.

This name is also used by some browsers for Right-Click->Save Image As. Unfortunately Chrome bypasses the Service Worker for that. So I also wrapped the images in a link with the `download` attribute.

## Running locally

If you clone this repo to run locally or do local development, you'll need NodeJS v24 and the pnpm package manager.

```sh
$ pnpm install
$ pnpm run dev
```

## CLI

There's a simple command line interface.

```sh
node --import jiti/register packages/image-viewer/cli/cli.ts dump-rom  --outdir=/path/to/some/folder --maincpu /path/to/mk2.maincpu --gfxrom /path/to/mk2.gfxrom
```

```sh
node --import jiti/register packages/image-viewer/cli/cli.ts dump-rom  --mk1 --outdir=/path/to/some/folder --maincpu /path/to/mkr4.maincpu --gfxrom /path/to/gfxrom
```

## TODO

A rough list of future enhancements.

- support BDB/BDD files
- fix remaining crashes
- fix files that are not decoded correctly (some animation sizes seem to be wrong / huge)

## Special Thanks

- ermaccer
  - I used ermaccer's [midway.img](https://github.com/ermaccer/midway.img) as a reference at times, especially for working out how to convert the palettes from 15 bit to 24 bit
  - And a few other things, including [UMK3IOS.MeshSetTool](https://github.com/ermaccer/UMK3IOS.MeshSetTool)
- leanny
- nacho
- the Tablet Of Knowledge