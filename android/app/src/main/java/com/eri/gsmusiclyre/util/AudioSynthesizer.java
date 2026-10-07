package com.eri.gsmusiclyre.util;

import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioTrack;
import android.util.Log;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Low-latency procedural audio synthesizer for Android.
 * Renders acoustic tones for Genshin Lyre and ethereal Sky COTL instruments.
 */
public class AudioSynthesizer {
    private static final String TAG = "AudioSynthesizer";
    private static final int SAMPLE_RATE = 44100;
    private static AudioSynthesizer instance;

    public static synchronized AudioSynthesizer getInstance() {
        if (instance == null) {
            instance = new AudioSynthesizer();
        }
        return instance;
    }

    private final ExecutorService audioExecutor = Executors.newFixedThreadPool(4);
    private final Map<String, Float> frequencies = new HashMap<>();

    private AudioSynthesizer() {
        initFrequencies();
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

    public void playNote(String noteName, boolean isSky) {
        if (noteName == null) return;
        Float freq = frequencies.get(noteName.trim().toUpperCase());
        if (freq == null) return;

        audioExecutor.execute(() -> renderAndPlayTone(freq, isSky));
    }

    private void renderAndPlayTone(float freq, boolean isSky) {
        try {
            int durationMs = isSky ? 900 : 700;
            int numSamples = (int) (SAMPLE_RATE * (durationMs / 1000.0));
            short[] buffer = new short[numSamples];

            double twopi = 2.0 * Math.PI;
            double attackSamples = SAMPLE_RATE * (isSky ? 0.015 : 0.008);
            double decayRate = isSky ? 2.8 : 3.5;

            for (int i = 0; i < numSamples; i++) {
                double t = (double) i / SAMPLE_RATE;
                double env = 1.0;

                // Attack envelope
                if (i < attackSamples) {
                    env = i / attackSamples;
                } else {
                    // Exponential decay
                    env = Math.exp(-decayRate * (t - attackSamples / SAMPLE_RATE));
                }

                double sample = 0;
                if (isSky) {
                    // Sky COTL: Warm fundamental + 2nd harmonic octave + delicate chime 3rd harmonic
                    sample = 0.70 * Math.sin(twopi * freq * t)
                           + 0.22 * Math.sin(twopi * freq * 2.0 * t)
                           + 0.08 * Math.sin(twopi * freq * 3.0 * t);
                } else {
                    // Genshin: Crisp plucked triangle-ish wave
                    sample = 0.80 * Math.sin(twopi * freq * t)
                           + 0.20 * Math.sin(twopi * freq * 2.0 * t);
                }

                buffer[i] = (short) (sample * env * Short.MAX_VALUE * 0.45);
            }

            AudioTrack track = new AudioTrack.Builder()
                .setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build())
                .setAudioFormat(new AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(SAMPLE_RATE)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build())
                .setBufferSizeInBytes(numSamples * 2)
                .setTransferMode(AudioTrack.MODE_STATIC)
                .build();

            track.write(buffer, 0, buffer.length);
            track.play();

            Thread.sleep(durationMs);
            track.stop();
            track.release();
        } catch (Exception e) {
            Log.e(TAG, "Error playing audio tone: " + e.getMessage());
        }
    }
}
