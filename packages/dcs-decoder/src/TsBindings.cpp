#include <bit>

#include "DCSDecoder.h"
#include "DCSDecoderNative.h"

#include <emscripten/bind.h>
#include <emscripten/val.h>

using namespace emscripten;

EMSCRIPTEN_DECLARE_VAL_TYPE(Uint8Array);

using VecUint8 = std::vector<uint8_t>;


const uint8_t wavHeader[44] = {
'R', 'I', 'F', 'F',
0, 0, 0, 0, // byte length of file - 8
'W', 'A', 'V', 'E',
'f', 'm', 't', ' ',
16, 0, 0, 0, // chunk size - 8
1, 0, // pcm    
1, 0, // 1 channel
0x12, 0x7a, 0, 0, // sample rate of 31,250 or 0x7a12
0x24, 0xF4, 0, 0, // bytes per second: 0xF424
2, 0, // byes per block
16, 0, // bits per sample 
'd', 'a', 't', 'a',
// finally the size
};

class DCSDecoderWasm {
public:
    DCSDecoder::MinHost minHost;
    DCSDecoderNative decoder;
    std::vector<VecUint8> roms;
   
    DCSDecoderWasm() : minHost(), decoder(&minHost) {}

    int getMyInt() const {
        return 42;
    }

    DCSDecoderNative& getDecoder() {
        return decoder;
    }

    // void addRom(int romNumber, std::vector<uint8_t>& data) {
    //     //	void AddROM(int n, const uint8_t *data, size_t size);
    //     decoder.AddROM(romNumber, data.data(), data.size());
    // }

    void addRom(int romNumber, Uint8Array data) {
        int byteLength = data["byteLength"].as<int>();
        // val console = val::global("console");
        // console.call<void>("log", val("foo"), data);

        // Create a new c++ vec, inside a vec of vecs, to hold the rom data.
        // We have to keep a copy of the data because `AddROM` does not
        // copy it, it just holds a pointer.
        VecUint8& v = roms.emplace_back(byteLength);
    
        // val(typed_memory_view(bufferLength, byteBuffer))

        // copy the incoming data from `data` to a c++ vec `v`
        val heapu8 = val::module_property("HEAPU8");
        // EM_ASM("HEAPU8.set($0, $1);", data.as_handle(), v.data());
        heapu8.call<void>("set", data, (long)v.data());

        // EM_ASM("console.log('data info', $0, $1, HEAPU8, $2)", v.data(), v.size());
        // call AddROM
        decoder.AddROM(romNumber, v.data(), v.size());
    }

    uint8_t checkRoms() {
        return decoder.CheckROMs();
    }
    // void SoftBoot()
    void softBoot() {
        decoder.SoftBoot();
    }

    std::string getSignature() {
        return decoder.GetSignature();
    }

    void setMasterVolume(int vol) {
        decoder.SetMasterVolume(vol);
        decoder.SetDefaultVolume(vol);
    }

    // 	int16_t GetNextSample();
    // 	void WriteDataPort(uint8_t b);

    uint16_t getMaxTrackNumber() {
        return decoder.GetMaxTrackNumber();
    }
    // TODO:
    // bool GetTrackInfo(uint16_t trackNumber, TrackInfo &info);
    // StreamInfo GetStreamInfo(const ROMPointer &streamPtr);


     val listStreams() {
        // std::vector<DCSDecoder::ROMPointer> rv;
        auto streams = decoder.ListStreams();
        return val::array(streams.begin(), streams.end());
        // for (auto stream : streams) {
        //     rv.push_back(decoder.MakeROMPointer(stream));
        // }

        // return rv;
    }

    DCSDecoderNative::StreamInfo getStreamInfo(uint32_t stream) {
        DCSDecoder::ROMPointer ptr = decoder.MakeROMPointer(stream);
        DCSDecoderNative::StreamInfo info = decoder.GetStreamInfo(ptr);

        return info;
    }

    DCSDecoderNative::StreamInfo getStreamInfoFromPtr(long p) {
        DCSDecoder::ROMPointer ptr = DCSDecoder::ROMPointer(0, (const uint8_t *)p);
        DCSDecoderNative::StreamInfo info = decoder.GetStreamInfo(ptr);

        return info;
    }

    Uint8Array extractStream(uint32_t stream) {
        DCSDecoder::ROMPointer ptr = decoder.MakeROMPointer(stream);

        return extractStreamFromRomPtr(ptr);
    }

    Uint8Array extractStreamFromPtr(long p) {
        DCSDecoder::ROMPointer ptr = DCSDecoder::ROMPointer(0, (const uint8_t *)p);

        return extractStreamFromRomPtr(ptr);
    }

    Uint8Array extractStreamFromRomPtr(DCSDecoder::ROMPointer ptr) {
        DCSDecoderNative::StreamInfo info = decoder.GetStreamInfo(ptr);
        const int samplesPerFrame = 240;
        const int bytesPerSample = 2;

        // int streamBytes = info.nBytes;
        int streamBytes = info.nFrames * samplesPerFrame * bytesPerSample;

        static std::vector<uint8_t> buffer;
        // std::vector<uint8_t> buffer(info.nFrames * samplesPerFrame * bytesPerSample);
        buffer = std::vector<uint8_t>(44);
        buffer.reserve(streamBytes + 44);
        memcpy(buffer.data(), wavHeader, 44);
        // write nBytes + 44 - 8 as 32bit le word to offset 4,
        // write size nbytes as 32bit le to offset 40
        *(uint32_t*)(buffer.data() + 4) = streamBytes + 44 - 8;
        *(uint32_t*)(buffer.data() + 40) = streamBytes;

        const int channel = 0;
        const int mixingLevel = 0x64;
        // TODO: make this adjustable!
        //const int mixingLevel = 0x7f;
        //const int mixingLevel = 0xff;
        decoder.LoadAudioStream(channel, ptr, mixingLevel);

        int samplesNeeded = streamBytes / 2;
        while (samplesNeeded > 0) {
            samplesNeeded--;
            // cast to unsigned to avoid sign extension on the bit twiddling
            uint16_t sample = std::__bit_cast<uint16_t, int16_t>(decoder.GetNextSample());
            buffer.push_back(sample & 0xFF);
            buffer.push_back(sample >> 8);
        }

        return Uint8Array(val(typed_memory_view(buffer.size(), buffer.data())));
    }


};




// Binding code
EMSCRIPTEN_BINDINGS(dcs_decoder_wasm) {
  class_<DCSDecoder>("DCSDecoder");

  class_<DCSDecoder::Host>("DCSDecoderHost")
    ;

  class_<DCSDecoder::MinHost>("DCSDecoderMinHost")
    .constructor<>()
    ;

  class_<DCSDecoderNative>("DCSDecoderNative")
    .constructor<DCSDecoder::Host*>()
    //.function("addRom", &DCSDecoderNative::AddROM, allow_raw_pointer<arg<2>>())
    ;

  value_object<DCSDecoder::ROMPointer>("DCSDecoderROMPointer")
    .field("chipSelect", &DCSDecoder::ROMPointer::chipSelect)
    .field("p", (uint32_t DCSDecoder::ROMPointer::*) &DCSDecoder::ROMPointer::p)
  ;
  
  value_object<DCSDecoderNative::StreamInfo>("DCSDecoderNativeStreamInfo")
    .field("nFrames", &DCSDecoderNative::StreamInfo::nFrames)
    .field("nBytes", &DCSDecoderNative::StreamInfo::nBytes)
    .field("formatType", &DCSDecoderNative::StreamInfo::formatType)
    .field("formatSubType", &DCSDecoderNative::StreamInfo::formatSubType)
  ;

  class_<DCSDecoderWasm>("DCSDecoderWasm")
    .constructor<>()
    .property("myInt", &DCSDecoderWasm::getMyInt)
    // .property("decoder", &DCSDecoderWasm::getDecoder, return_value_policy::reference())
    .function("decoder", &DCSDecoderWasm::getDecoder, return_value_policy::reference())
    .function("setMasterVolume", &DCSDecoderWasm::setMasterVolume)
    .function("addRom", &DCSDecoderWasm::addRom)
    .function("checkRoms", &DCSDecoderWasm::checkRoms)
    .function("softBoot", &DCSDecoderWasm::softBoot)
    .function("getSignature", &DCSDecoderWasm::getSignature)
    .function("getMaxTrackNumber", &DCSDecoderWasm::getMaxTrackNumber)
    .function("listStreams", &DCSDecoderWasm::listStreams)
    .function("getStreamInfo", &DCSDecoderWasm::getStreamInfo)
    .function("getStreamInfoFromPtr", &DCSDecoderWasm::getStreamInfoFromPtr)
    .function("extractStream", &DCSDecoderWasm::extractStream)
    .function("extractStreamFromPtr", &DCSDecoderWasm::extractStreamFromPtr, allow_raw_pointer<arg<1>>())
    ;

    register_vector<uint8_t>("VectorUint8");
    register_vector<DCSDecoder::ROMPointer>("VectorROMPointer");

    register_type<Uint8Array>("Uint8Array");

    //value_object<uint8_t>("Uint8t");
}

