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
  --emit-tsd=DCSDecoder.d.ts \
  ./src/DCSDecoder.cpp  ./src/DCSDecoderNative.cpp -o "$OUTDIR"/DCSDecoder.mjs