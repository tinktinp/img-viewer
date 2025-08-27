# asm folder

The code in this folder is related to parsing assembly language files that contain
images, palettes, and animations.

These types of files are closer to hex dumps and contain data rather than code, although
sometimes they contain both.

Usually the images and palettes are generated from some other sources (perhaps IMG files),
but the animations may be hand written.

## MKT file types

All of these, except for the LOG file, are actually assembly language files. But they only contain data and not code. They're basically hex dumps, with each section labelled, and some pieces of data being labels (pointers) to other data.

Some files appear to originally have had file extensions with more than 3 characters, and those appear to have 8.3-ized.

- .RGB - palette data, as assembly language `.half`, `.word`, etc. Typically contains a single palette, which consists of a label, a 32 bit word with the palette size, and then that many more 16bit color entries
- .ATD - animation data and image metadata. Very important, because it contains the height and width of the images
- LOG - a log file from when the images were compressed. Contains the widthxheight of the images too, and which format they were compressed with
- .ASM - animation data, these seem to be from the arcade version. They use a different style of assembly and many have include directives from other arcade files. But these files exist for Trilogy specific characters including JCAGE.
- .ATT - The actual image data. The first byte describes how the image is compressed. There is no other metadata (no width, height, or palette), so some of the other files will be needed to used with these, unless you want to do a lot of guessing
- .DCT - compression dictionary files. Some images are compressed using a dictionary. This is needed to properly decompress the image. You can decompress it without the dictionary, as not every pixels uses the dictionary, but it will be have speckles in it of wrong/missing pixels.
  - For some reason these don't contain labels
- .PAL - Palette data. Unlike the RGB files, these contain multiple palettes. They also contain `<charname>_CLT` tables, which are tables of the palettes. This implies that, somewhere else, the palettes are referenced as offsets into this table (instead of by name/label).
- .S - assembly language files. These typically are files that only include other files. So some files are not referred to directly in the makefiles, but are `#include`ed in here. Even though these files are in assembly language, they are using the C preprocessor. `#include` works like copy/paste, so the other files may not be properly understood without the context of the files that include them (the assembly would see them as one big file)
- .O - object files, the output of calling the assembler or compiler
  - `ELF 32-bit MSB relocatable, MIPS, MIPS-I version 1 (SYSV), not stripped`
  - ELF is a well known format, still used by Linux today, and standard tools such as `objdump`, `nm`, etc, should be able to read them and output data from them. But, since we also have the source code, there is little reason to do so.
- IMGPAL.S - this might be the palettes actually used in the game. There are some commented out ones too
- MKGUYS.C - this one defines which palettes and alt palettes are used for which characters, among other things



