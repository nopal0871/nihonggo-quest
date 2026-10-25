/*
 * mic.js — bantuan untuk pengucapan:
 *  - test()          : mengukur level suara mikrofon (tanpa pengolahan otomatis, agar jujur)
 *  - boostedTrack()  : jalur audio yang diperkuat, untuk SpeechRecognition.start(track)
 *                      (fitur eksperimental; tidak semua browser mendukungnya)
 */
(function (global) {
  'use strict';

  const AudioCtx = global.AudioContext || global.webkitAudioContext;
  const supported = () => !!(global.navigator.mediaDevices && global.navigator.mediaDevices.getUserMedia && AudioCtx);

  // Mengukur level mikrofon selama `ms`. onLevel(rms) dipanggil tiap frame (rms 0..1).
  function test(onLevel, ms) {
    let stopNow = () => {};
    const done = (async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') await ctx.resume();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Float32Array(analyser.fftSize);

      return new Promise((resolve) => {
        let peak = 0;
        let raf = 0;
        let running = true;
        const t0 = performance.now();
        const finish = () => {
          if (!running) return;
          running = false;
          cancelAnimationFrame(raf);
          stream.getTracks().forEach((t) => t.stop());
          ctx.close().catch(() => {});
          resolve({ peak });
        };
        stopNow = finish;
        const tick = () => {
          analyser.getFloatTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
          const rms = Math.sqrt(sum / buf.length);
          if (rms > peak) peak = rms;
          if (onLevel) onLevel(rms);
          if (performance.now() - t0 >= ms) finish(); else raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      });
    })();
    return { done, stop: () => stopNow() };
  }

  // Nilai ambang kira-kira: ucapan normal di mikrofon laptop biasanya puncaknya 0,05 ke atas.
  function verdict(peak) {
    if (peak < 0.008) {
      return { level: 'silent', text: 'Hampir tidak ada suara yang masuk. Pastikan mikrofon yang benar terpilih dan tidak dibisukan, lalu naikkan volume input di pengaturan suara sistem.' };
    }
    if (peak < 0.03) {
      return { level: 'quiet', text: 'Suaramu masuk tetapi pelan, jadi pengenalan suara sering gagal. Dekatkan mikrofon ke mulut (sekitar 5 sampai 10 cm), naikkan volume input di pengaturan suara sistem, atau coba penguat suara di bawah.' };
    }
    return { level: 'good', text: 'Level suara sudah baik. Jika masih tidak terdeteksi, ucapkan satu huruf dengan jelas dan jangan terburu-buru.' };
  }

  // Jalur audio diperkuat (gain) + kompresor agar tidak pecah saat suara tiba-tiba keras.
  async function boostedTrack(gain) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') await ctx.resume();
    const amp = ctx.createGain();
    amp.gain.value = gain;
    const limiter = ctx.createDynamicsCompressor();
    const out = ctx.createMediaStreamDestination();
    ctx.createMediaStreamSource(stream).connect(amp);
    amp.connect(limiter);
    limiter.connect(out);
    return {
      track: out.stream.getAudioTracks()[0],
      stop() {
        stream.getTracks().forEach((t) => t.stop());
        ctx.close().catch(() => {});
      }
    };
  }

  global.Mic = { supported, test, verdict, boostedTrack };
})(window);
