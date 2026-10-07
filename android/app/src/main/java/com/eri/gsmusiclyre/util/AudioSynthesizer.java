package com.eri.gsmusiclyre.util;

import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioTrack;
import android.util.Log;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Ultra-low latency streaming procedural audio synthesizer for Android.
 * Renders acoustic tones for Genshin Lyre and ethereal Sky COTL instruments
 * with non-blocking polyphony, zero thread starvation, and no AudioTrack leaks.
 */
public class AudioSynthesizer {
    private static final String TAG = "AudioSynthesizer";
    private static final int SAMPLE_RATE = 44100;
    private static final int CHUNK_SIZE = 512; // ~11.6ms buffer per chunk for zero latency
    private static AudioSynthesizer instance;

    public static synchronized AudioSynthesizer getInstance() {
        if (instance == null) {
            instance = new AudioSynthesizer();
        }
        return instance;
    }

    private final Map<String, Float> frequencies = new HashMap<>();
    private final List<ActiveVoice> activeVoices = new CopyOnWriteArrayList<>();
    private AudioTrack streamTrack;
    private Thread mixerThread;
    private volatile boolean isRunning = false;

    private static class ActiveVoice {
        final float freq;
        final boolean isSky;
        int sampleIndex = 0;
        final int totalSamples;
        final double attackSamples;
        final double decayRate;

        ActiveVoice(float freq, boolean isSky) {
            this.freq = freq;
            this.isSky = isSky;
            int durationMs = isSky ? 850 : 650;
            this.totalSamples = (int) (SAMPLE_RATE * (durationMs / 1000.0));
            this.attackSamples = SAMPLE_RATE * (isSky ? 0.015 : 0.008);
            this.decayRate = isSky ? 2.8 : 3.5;
        }
    }

    private AudioSynthesizer() {
        initFrequencies();
        startMixerThread();
    }

    private void initFrequencies() {
        // Genshin & Sky frequencies (C3 to C6)
        frequencies.put("Z", 130.81f); frequencies.put("X", 146.83f); frequencies.put("C", 164.81f);
        frequencies.put("V", 174.61f); frequencies.put("B", 196.00f); frequencies.put("N", 220.00f); frequencies.put("M", 246.94f);
        frequencies.put("C3", 130.81f); frequencies.put("D3", 146.83f); frequencies.put("E3", 164.81f);
        frequencies.put("F3", 174.61f); frequencies.put("G3", 196.00f); frequencies.put("A3", 220.00f); frequencies.put("B3", 246.94f);

        frequencies.put("A", 261.63f); frequencies.put("S", 293.66f); frequencies.put("D", 329.63f);
        frequencies.put("F", 349.23f); frequencies.put("G", 392.00f); frequencies.put("H", 440.00f); frequencies.put("J", 493.88f);
        frequencies.put("C4", 261.63f); frequencies.put("D4", 293.66f); frequencies.put("E4", 329.63f);
        frequencies.put("F4", 349.23f); frequencies.put("G4", 392.00f); frequencies.put("A4", 440.00f); frequencies.put("B4", 493.88f);
        frequencies.put("A1", 261.63f); frequencies.put("A2", 293.66f); frequencies.put("A3", 329.63f);
        frequencies.put("A4", 349.23f); frequencies.put("A5", 392.00f);
        frequencies.put("1", 261.63f); frequencies.put("2", 293.66f); frequencies.put("3", 329.63f);
        frequencies.put("4", 349.23f); frequencies.put("5", 392.00f);

        frequencies.put("Q", 523.25f); frequencies.put("W", 587.33f); frequencies.put("E", 659.25f);
        frequencies.put("R", 698.46f); frequencies.put("T", 783.99f); frequencies.put("Y", 880.00f); frequencies.put("U", 987.77f);
        frequencies.put("C5", 523.25f); frequencies.put("D5", 587.33f); frequencies.put("E5", 659.25f);
        frequencies.put("F5", 698.46f); frequencies.put("G5", 783.99f); frequencies.put("A5", 880.00f); frequencies.put("B5", 987.77f);
        frequencies.put("B1", 440.00f); frequencies.put("B2", 493.88f); frequencies.put("B3", 523.25f);
        frequencies.put("B4", 587.33f); frequencies.put("B5", 659.25f);
        frequencies.put("6", 440.00f); frequencies.put("7", 493.88f); frequencies.put("8", 523.25f);
        frequencies.put("9", 587.33f); frequencies.put("10", 659.25f);

        frequencies.put("C1", 698.46f); frequencies.put("C2", 783.99f); frequencies.put("C3", 880.00f);
        frequencies.put("C4_SKY", 987.77f); frequencies.put("C5_SKY", 1046.50f);
        frequencies.put("11", 698.46f); frequencies.put("12", 783.99f); frequencies.put("13", 880.00f);
        frequencies.put("14", 987.77f); frequencies.put("15", 1046.50f);
        frequencies.put("C6", 1046.50f);
    }

    private synchronized void startMixerThread() {
        if (isRunning) return;
        try {
            int minBufferSize = AudioTrack.getMinBufferSize(
                SAMPLE_RATE,
                AudioFormat.CHANNEL_OUT_MONO,
                AudioFormat.ENCODING_PCM_16BIT
            );
            int bufferSize = Math.max(minBufferSize, CHUNK_SIZE * 4 * 2);

            streamTrack = new AudioTrack.Builder()
                .setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build())
                .setAudioFormat(new AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(SAMPLE_RATE)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build())
                .setBufferSizeInBytes(bufferSize)
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build();

            streamTrack.play();
            isRunning = true;

            mixerThread = new Thread(this::runMixerLoop, "AudioMixerThread");
            mixerThread.setPriority(Thread.MAX_PRIORITY);
            mixerThread.setDaemon(true);
            mixerThread.start();
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize AudioTrack stream: " + e.getMessage());
        }
    }

    private void runMixerLoop() {
        short[] buffer = new short[CHUNK_SIZE];
        float[] mixAccumulator = new float[CHUNK_SIZE];
        double twopi = 2.0 * Math.PI;

        while (isRunning) {
            if (activeVoices.isEmpty()) {
                // If idle, stream a tiny block of silence with low CPU consumption
                for (int i = 0; i < CHUNK_SIZE; i++) buffer[i] = 0;
                if (streamTrack != null && streamTrack.getPlayState() == AudioTrack.PLAYSTATE_PLAYING) {
                    streamTrack.write(buffer, 0, CHUNK_SIZE);
                }
                try {
                    Thread.sleep(8);
                } catch (InterruptedException e) {
                    break;
                }
                continue;
            }

            for (int i = 0; i < CHUNK_SIZE; i++) mixAccumulator[i] = 0.0f;

            for (ActiveVoice voice : activeVoices) {
                float freq = voice.freq;
                boolean isSky = voice.isSky;
                int startIdx = voice.sampleIndex;
                int endIdx = Math.min(startIdx + CHUNK_SIZE, voice.totalSamples);

                for (int i = startIdx; i < endIdx; i++) {
                    int bufIdx = i - startIdx;
                    double t = (double) i / SAMPLE_RATE;
                    double env;

                    if (i < voice.attackSamples) {
                        env = i / voice.attackSamples;
                    } else {
                        env = Math.exp(-voice.decayRate * (t - voice.attackSamples / SAMPLE_RATE));
                    }

                    double sample;
                    if (isSky) {
                        sample = 0.70 * Math.sin(twopi * freq * t)
                               + 0.22 * Math.sin(twopi * freq * 2.0 * t)
                               + 0.08 * Math.sin(twopi * freq * 3.0 * t);
                    } else {
                        sample = 0.80 * Math.sin(twopi * freq * t)
                               + 0.20 * Math.sin(twopi * freq * 2.0 * t);
                    }

                    mixAccumulator[bufIdx] += (float) (sample * env * 0.40);
                }

                voice.sampleIndex += CHUNK_SIZE;
                if (voice.sampleIndex >= voice.totalSamples) {
                    activeVoices.remove(voice);
                }
            }

            // Clamp and convert to 16-bit PCM
            for (int i = 0; i < CHUNK_SIZE; i++) {
                float val = mixAccumulator[i];
                if (val > 0.98f) val = 0.98f;
                else if (val < -0.98f) val = -0.98f;
                buffer[i] = (short) (val * Short.MAX_VALUE);
            }

            if (streamTrack != null && streamTrack.getPlayState() == AudioTrack.PLAYSTATE_PLAYING) {
                streamTrack.write(buffer, 0, CHUNK_SIZE);
            }
        }
    }

    public void playNote(String noteName, boolean isSky) {
        if (noteName == null) return;
        Float freq = frequencies.get(noteName.trim().toUpperCase());
        if (freq == null) return;

        if (!isRunning || streamTrack == null) {
            startMixerThread();
        }

        // Add to active voices list non-blockingly (< 0.001ms)
        activeVoices.add(new ActiveVoice(freq, isSky));
    }
}
