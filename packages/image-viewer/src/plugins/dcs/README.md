# DCS

> DCS [Digital Compression System] is the audio system used in the classic Williams/​Bally/​Midway pinball machines of the 1990s.


This is a plugin uses the [DCSExplorer](https://github.com/mjrgh/DCSExplorer) library (though a custom wasm wrapper). Most of the info about DCS comes from that project and related website [DCS Audio Format Technical Reference](http://mjrnet.org/pinscape/dcsref/DCS_format_reference.html).

> DCS (initials for Digital Compression System) consists of a family of proprietary digital audio compression formats, along with a run-time system tailored to the real-time event-driven playback environment of an arcade game.

DCSExplorer was patched to support MK4.

## Known to work
- MK2
- MK3
- UMK3
- MK4
- NBA Hangtime
- Carnevil
- Wargods

Img-viewer looks for files with certain names, such as `u2.rom`, `*.u2`, `su2.l1`, `*.bnk` (for Carnevil), and `wargods_` for Wargods.

For Wargods, you need to use Mame's `chdman` to uncompress the `.chd` disk image first.

For Carnevil, you need to extract the individual `*.bnk` files.

For some romsets, it might be helpful to copy and rename just the sound roms to their own folder.

## wikipedia

https://en.wikipedia.org/wiki/Digital_Compression_System

Wikipedia mentions DCS2 and later games using RAM based systems, which I think means the files are stored on hard drives, like in Carnevil and Wargods' cases.

