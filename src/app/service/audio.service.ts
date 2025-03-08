// import { Injectable } from '@angular/core';

// @Injectable({
//   providedIn: 'root',
// })
// export class AudioService {
//   private audioContext!: AudioContext;
//   private mediaStream!: MediaStream;
//   private mediaSource!: MediaStreamAudioSourceNode;
//   private scriptProcessor!: ScriptProcessorNode;
//   private leftChannelData: Float32Array[] = [];
//   private sampleRate!: number;
//   private isRecording = false;

//   constructor() {}

//   async startRecording() {
//     this.audioContext = new AudioContext();
//     this.sampleRate = this.audioContext.sampleRate;

//     this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
//     this.mediaSource = this.audioContext.createMediaStreamSource(this.mediaStream);

//     this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
//     this.scriptProcessor.onaudioprocess = (event) => {
//       if (!this.isRecording) return;
//       const channelData = event.inputBuffer.getChannelData(0);
//       this.leftChannelData.push(new Float32Array(channelData));
//     };

//     this.mediaSource.connect(this.scriptProcessor);
//     this.scriptProcessor.connect(this.audioContext.destination);
//     this.isRecording = true;
//   }

//   async stopRecording(): Promise<Blob> {
//     this.isRecording = false;
//     this.scriptProcessor.disconnect();
//     this.mediaSource.disconnect();
//     this.mediaStream.getTracks().forEach((track) => track.stop());

//     const wavBuffer = this.encodeWAV(this.flattenChannelData(), this.sampleRate);
//     return new Blob([wavBuffer], { type: 'audio/wav' });
//   }

//   private flattenChannelData(): Float32Array {
//     const length = this.leftChannelData.reduce((sum, arr) => sum + arr.length, 0);
//     const result = new Float32Array(length);
//     let offset = 0;

//     this.leftChannelData.forEach((chunk) => {
//       result.set(chunk, offset);
//       offset += chunk.length;
//     });

//     return result;
//   }

//   private encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
//     const buffer = new ArrayBuffer(44 + samples.length * 2);
//     const view = new DataView(buffer);

//     this.writeString(view, 0, 'RIFF');
//     view.setUint32(4, 36 + samples.length * 2, true);
//     this.writeString(view, 8, 'WAVE');
//     this.writeString(view, 12, 'fmt ');
//     view.setUint32(16, 16, true);
//     view.setUint16(20, 1, true);
//     view.setUint16(22, 1, true);
//     view.setUint32(24, sampleRate, true);
//     view.setUint32(28, sampleRate * 2, true);
//     view.setUint16(32, 2, true);
//     view.setUint16(34, 16, true);
//     this.writeString(view, 36, 'data');
//     view.setUint32(40, samples.length * 2, true);

//     this.floatTo16BitPCM(view, 44, samples);
//     return buffer;
//   }

//   private floatTo16BitPCM(view: DataView, offset: number, input: Float32Array) {
//     for (let i = 0; i < input.length; i++, offset += 2) {
//       let s = Math.max(-1, Math.min(1, input[i]));
//       view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
//     }
//   }

//   private writeString(view: DataView, offset: number, str: string) {
//     for (let i = 0; i < str.length; i++) {
//       view.setUint8(offset + i, str.charCodeAt(i));
//     }
//   }
// }

import { Injectable } from '@angular/core';
import { VoiceRecorder, RecordingData } from 'capacitor-voice-recorder';

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  private recordedAudio!: Blob;
  private audioUrl!: string;
  private sampleRate = 44100; // Standard WAV sample rate
  private numChannels = 1; // Mono audio

  constructor() {}

  // ✅ Start Recording
  async startRecording() {
    await VoiceRecorder.startRecording();
    console.log('Recording started...');
  }

  // ✅ Stop Recording & Convert to WAV
  async stopRecording(): Promise<Blob | null> {
    const result: RecordingData = await VoiceRecorder.stopRecording();

    if (result.value?.recordDataBase64) {
      // Decode Base64 to Uint8Array
      const pcmData = this.base64ToUint8Array(result.value.recordDataBase64);

      // Convert 8-bit PCM to 16-bit PCM
      const pcm16BitData = this.convert8BitTo16BitPCM(pcmData);

      // Encode PCM Data to WAV Format
      const wavBuffer = this.encodeWAV(pcm16BitData, this.sampleRate, this.numChannels);

      // Create Blob for WAV file
      this.recordedAudio = new Blob([wavBuffer], { type: 'audio/wav' });

      // Create URL for playback
      this.audioUrl = URL.createObjectURL(this.recordedAudio);
      return this.recordedAudio;
    }

    return null;
  }

  // ✅ Convert Base64 to Uint8Array (PCM Data)
  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const length = binaryString.length;
    const bytes = new Uint8Array(length);

    for (let i = 0; i < length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
  }

  // ✅ Convert 8-bit PCM to 16-bit PCM
  private convert8BitTo16BitPCM(pcm8Bit: Uint8Array): Int16Array {
    const pcm16Bit = new Int16Array(pcm8Bit.length);

    for (let i = 0; i < pcm8Bit.length; i++) {
      // Scale 8-bit PCM (0-255) to signed 16-bit PCM (-32768 to 32767)
      pcm16Bit[i] = (pcm8Bit[i] - 128) * 256;
    }

    return pcm16Bit;
  }

  // ✅ Encode PCM Data into WAV Format
  private encodeWAV(samples: Int16Array, sampleRate: number, numChannels: number): ArrayBuffer {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // RIFF Header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    this.writeString(view, 8, 'WAVE');

    // fmt Subchunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (PCM)
    view.setUint16(20, 1, true);  // AudioFormat (1 = PCM)
    view.setUint16(22, numChannels, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * numChannels * 2, true); // ByteRate
    view.setUint16(32, numChannels * 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample

    // data Subchunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // Write PCM data (Little Endian format)
    this.writePCM16Bit(view, 44, samples);

    return buffer;
  }

  // ✅ Utility function to write PCM 16-bit data in Little Endian
  private writePCM16Bit(view: DataView, offset: number, input: Int16Array) {
    for (let i = 0; i < input.length; i++, offset += 2) {
      view.setInt16(offset, input[i], true);
    }
  }

  // ✅ Utility function to write string into DataView
  private writeString(view: DataView, offset: number, text: string) {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  }
  async getRecordedAudio(){
    return this.recordedAudio
  }
}

