# img-viewer

This is a web based viewer for `IMG` files. `IMG` files were used in Midway games in the late 80s and 90s.

[ImgViewer](https://tinktinp.github.io/img-viewer/)

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
- leanny
- nacho
- the Tablet Of Knowledge