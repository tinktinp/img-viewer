#!/bin/sh

# prod cflags
CFLAGS="-O2"

# debug cflags
# CFLAGS="-Og -g3 -gsource-map=inline -sASSERTIONS"

OUTDIR=src/build
mkdir -p "$OUTDIR"
/usr/local/bin/emcc \
  "$CFLAGS" \
  -flto \
  -lembind \
  -sMODULARIZE \
  -sENVIRONMENT='web,worker' \
  -sALLOW_MEMORY_GROWTH \
  -sEXPORTED_FUNCTIONS='_malloc,_free' \
  -sEXPORTED_RUNTIME_METHODS='ccall,cwrap,getValue,setValue,HEAPU8,writeArrayToMemory' \
  --emit-tsd=DCSDecoder.d.ts \
  -Wno-delete-abstract-non-virtual-dtor \
  ./src/DCSDecoder.cpp  ./src/DCSDecoderNative.cpp  ./src/TsBindings.cpp -o "$OUTDIR"/DCSDecoder.mjs