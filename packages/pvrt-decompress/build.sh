#!/bin/sh

OUTDIR=src/build
mkdir -p "$OUTDIR"
/usr/local/bin/emcc \
  -O2 \
  -flto \
  -sMODULARIZE \
  -sENVIRONMENT='web,worker' \
  -sEXPORTED_FUNCTIONS='_malloc,_free' \
  -sEXPORTED_RUNTIME_METHODS='ccall,cwrap,getValue,setValue,HEAPU8,writeArrayToMemory' \
  -gsource-map=inline \
  --emit-tsd=PVRTDecompress.d.ts \
  ./src/PVRTDecompress.cpp -o "$OUTDIR"/PVRTDecompress.mjs
# -sEXPORTED_FUNCTIONS='_PVRTDecompressPVRTC,_PVRTDecompressETC' 
#-lembind \
