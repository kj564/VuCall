'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * useSpeakingIndicator
 *
 * Tracks whether the local user is currently speaking by attaching a Web Audio
 * `AnalyserNode` to the local microphone's `MediaStream`. Drives the pulsing
 * ring around the local self-view PiP (Instagram-style "active speaker").
 *
 * @param stream  MediaStream to analyze (uses the first audio track). null = not speaking.
 * @param enabled Gate the hook (only run when mic is on AND in-call). When false,
 *                returns false and stops the rAF loop.
 * @returns boolean — true = currently speaking.
 */
export function useSpeakingIndicator(
  stream: MediaStream | null,
  enabled: boolean
): boolean {
  const [speaking, setSpeaking] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const smoothedRef = useRef<number>(0);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  // Mirror of the React `speaking` state so the rAF tick can read the current
  // value without re-running the effect (and debounce setState correctly).
  const speakingRef = useRef<boolean>(false);

  useEffect(() => {
    // Cleanup helper — tears down the AudioContext, analyser, source, and rAF.
    // Called on unmount, before re-running, and on every early-return path.
    const cleanup = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      try {
        if (analyserRef.current) {
          analyserRef.current.disconnect();
          analyserRef.current = null;
        }
      } catch {
        /* ignore — analyser may already be disconnected */
      }
      try {
        if (sourceRef.current) {
          sourceRef.current.disconnect();
          sourceRef.current = null;
        }
      } catch {
        /* ignore — source may already be disconnected */
      }
      const ac = audioCtxRef.current;
      if (ac) {
        // close() returns a Promise — swallow rejection if already closed.
        ac.close().catch(() => {});
        audioCtxRef.current = null;
      }
      dataArrayRef.current = null;
      smoothedRef.current = 0;
      speakingRef.current = false;
    };

    // Disabled or no stream → tear down anything we had running and bail.
    // (No setState here — the return value is derived from `enabled`.)
    if (!enabled || !stream) {
      cleanup();
      return;
    }

    // Need at least one audio track to analyze.
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks || audioTracks.length === 0) {
      cleanup();
      return;
    }

    // Create the AudioContext. In VuCall this hook only mounts after the
    // "Join call" user gesture, so creation is safe; still, be defensive.
    let ac: AudioContext;
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) {
        cleanup();
        return;
      }
      ac = new Ctor();
    } catch {
      cleanup();
      return;
    }
    audioCtxRef.current = ac;

    // Build the source node. createMediaStreamSource can throw on a
    // closed/ended track — wrap defensively and bail.
    let source: MediaStreamAudioSourceNode;
    try {
      source = ac.createMediaStreamSource(stream);
    } catch {
      ac.close().catch(() => {});
      audioCtxRef.current = null;
      cleanup();
      return;
    }

    // Build the analyser node with the spec'd fftSize + smoothing.
    let analyser: AnalyserNode;
    try {
      analyser = ac.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
    } catch {
      try {
        source.disconnect();
      } catch {
        /* ignore */
      }
      ac.close().catch(() => {});
      audioCtxRef.current = null;
      cleanup();
      return;
    }

    sourceRef.current = source;
    analyserRef.current = analyser;

    // Connect source → analyser ONLY. NEVER connect to `destination`
    // (that would create a speaker→mic feedback loop).
    try {
      source.connect(analyser);
    } catch {
      /* ignore — the loop will just produce zeros */
    }

    // Pre-allocate the time-domain buffer (memoized by analyser size). The
    // explicit `new ArrayBuffer(...)` keeps TypeScript 5's stricter typed-array
    // generics happy (Uint8Array<ArrayBuffer> vs Uint8Array<ArrayBufferLike>).
    dataArrayRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));

    const THRESHOLD = 0.08;
    let firstFrame = true;

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);

      const data = dataArrayRef.current;
      const node = analyserRef.current;
      if (!data || !node) return;

      // Time-domain = waveform centered around 128; amplitude = max deviation.
      node.getByteTimeDomainData(data);

      let max = 0;
      for (let i = 0; i < data.length; i++) {
        const dev = Math.abs(data[i] - 128);
        if (dev > max) max = dev;
      }
      const level = max / 128; // 0..1

      // Exponential smoothing — single-sample spikes shouldn't flicker.
      // On the first frame of a new run, seed from zero (don't carry a
      // stale smoothed value from a previous effect cycle).
      const smoothed = firstFrame
        ? level * 0.2
        : smoothedRef.current * 0.8 + level * 0.2;
      smoothedRef.current = smoothed;
      firstFrame = false;

      // Debounced state — only setSpeaking when it CHANGES (avoid re-render spam).
      const nextSpeaking = smoothed > THRESHOLD;
      if (nextSpeaking !== speakingRef.current) {
        speakingRef.current = nextSpeaking;
        setSpeaking(nextSpeaking);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return cleanup;
  }, [stream, enabled]);

  // Derive the effective speaking flag: when disabled, no stream, or no audio
  // track, we always report false (the rAF loop isn't running, so the React
  // `speaking` state could be stale — gate it here rather than setState in the
  // effect body, which would trigger cascading renders).
  const hasAudio = !!stream && stream.getAudioTracks().length > 0;
  return enabled && hasAudio ? speaking : false;
}
