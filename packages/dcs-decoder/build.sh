#!/bin/sh

OUTDIR=src/build
mkdir -p "$OUTDIR"
/usr/local/bin/emcc \
  -O2 \
  -flto \
  -lembind \
  -sMODULARIZE \
  -sENVIRONMENT='web,worker' \
  -sEXPORTED_FUNCTIONS='_malloc,_free' \
  -sEXPORTED_RUNTIME_METHODS='ccall,cwrap,getValue,setValue,HEAPU8,writeArrayToMemory' \
  --emit-tsd=DCSDecoder.d.ts \
  -Wno-delete-abstract-non-virtual-dtor \
  ./src/DCSDecoder.cpp  ./src/DCSDecoderNative.cpp  ./src/TsBindings.cpp -o "$OUTDIR"/DCSDecoder.mjs