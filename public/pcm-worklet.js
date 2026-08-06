// PCM capture worklet — runs on the audio render thread.
//
// Converts the mic's Float32 audio into raw 16-bit PCM (Int16LE) and posts it to
// the main thread in ~20ms chunks, which is exactly what the Vivid streaming
// backend's realtime STT expects (ElevenLabs Scribe v2 Realtime: raw PCM,
// 16kHz, 16-bit). The AudioContext is created at 16kHz on the main thread, so no
// resampling is needed here — this only does the Float32 → Int16 conversion and
// buffers to a stable frame size.
//
// A worklet (not a ScriptProcessorNode) is used because ScriptProcessorNode is
// deprecated and runs on the main thread (glitchy under load); the worklet runs
// on the dedicated audio thread and never blocks React.

class PcmWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    // 16kHz × 20ms = 320 samples per frame. Accumulate until we have a full
    // frame, then post it — so the wire sees steady 20ms PCM chunks regardless of
    // the 128-sample render quantum the browser hands us.
    this._frameSamples = 320;
    this._buf = new Int16Array(this._frameSamples);
    this._n = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channel = input[0]; // mono
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      // Float32 [-1,1] → Int16 [-32768, 32767], clamped.
      let s = channel[i];
      if (s > 1) s = 1;
      else if (s < -1) s = -1;
      this._buf[this._n++] = s < 0 ? s * 0x8000 : s * 0x7fff;

      if (this._n === this._frameSamples) {
        // Transfer a copy so the worklet keeps its buffer.
        const out = this._buf.slice(0);
        this.port.postMessage(out.buffer, [out.buffer]);
        this._n = 0;
      }
    }
    return true; // keep the processor alive
  }
}

registerProcessor("pcm-worklet", PcmWorklet);
