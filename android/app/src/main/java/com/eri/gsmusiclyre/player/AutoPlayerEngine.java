package com.eri.gsmusiclyre.player;

import android.content.Context;
import android.graphics.PointF;
import android.os.Handler;
import android.os.Looper;

import com.eri.gsmusiclyre.model.NoteEvent;
import com.eri.gsmusiclyre.model.Song;
import com.eri.gsmusiclyre.service.LyreAccessibilityService;
import com.eri.gsmusiclyre.util.KeyCoordinatesManager;

import java.util.ArrayList;
import java.util.List;

public class AutoPlayerEngine {
    public interface PlaybackListener {
        void onProgress(double currentSec, double totalSec);
        void onStateChanged(boolean isPlaying);
        void onFinished();
    }

    private static AutoPlayerEngine instance;

    public static synchronized AutoPlayerEngine getInstance(Context context) {
        if (instance == null) {
            instance = new AutoPlayerEngine(context.getApplicationContext());
        }
        return instance;
    }

    private final Context context;
    private final KeyCoordinatesManager coordsManager;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private Thread playerThread;
    private volatile boolean isRunning = false;
    private volatile boolean isPaused = false;
    private volatile float speed = 1.0f;

    private Song currentSong;
    private double currentPositionSec = 0.0;
    private PlaybackListener listener;

    private AutoPlayerEngine(Context context) {
        this.context = context;
        this.coordsManager = new KeyCoordinatesManager(context);
    }

    public void setListener(PlaybackListener listener) {
        this.listener = listener;
    }

    public synchronized void play(Song song) {
        stop();
        if (song == null || song.getEvents() == null || song.getEvents().isEmpty()) return;
        this.currentSong = song;
        this.currentPositionSec = 0.0;
        this.isRunning = true;
        this.isPaused = false;

        notifyState(true);

        playerThread = new Thread(this::runPlaybackLoop);
        playerThread.setPriority(Thread.MAX_PRIORITY);
        playerThread.start();
    }

    public synchronized void pause() {
        if (isRunning && !isPaused) {
            isPaused = true;
            notifyState(false);
        }
    }

    public synchronized void resume() {
        if (isRunning && isPaused) {
            isPaused = false;
            notifyState(true);
            synchronized (this) {
                notifyAll();
            }
        }
    }

    public synchronized void stop() {
        isRunning = false;
        isPaused = false;
        if (playerThread != null) {
            playerThread.interrupt();
            playerThread = null;
        }
        currentPositionSec = 0.0;
        notifyState(false);
    }

    public void setSpeed(float speed) {
        this.speed = Math.max(0.25f, Math.min(speed, 2.5f));
    }

    public float getSpeed() {
        return speed;
    }

    public boolean isPlaying() {
        return isRunning && !isPaused;
    }

    public Song getCurrentSong() {
        return currentSong;
    }

    private void runPlaybackLoop() {
        List<NoteEvent> events = currentSong.getEvents();
        double totalDuration = currentSong.getDuration();
        long startRealTime = System.currentTimeMillis();
        double startSongPos = currentPositionSec;

        int nextIndex = 0;
        while (nextIndex < events.size() && events.get(nextIndex).getTime() < startSongPos) {
            nextIndex++;
        }

        while (isRunning && nextIndex < events.size()) {
            if (isPaused) {
                try {
                    synchronized (this) {
                        while (isPaused && isRunning) {
                            wait();
                        }
                    }
                    startRealTime = System.currentTimeMillis();
                    startSongPos = currentPositionSec;
                } catch (InterruptedException e) {
                    break;
                }
            }

            if (!isRunning) break;

            long elapsedMillis = System.currentTimeMillis() - startRealTime;
            double currentSongTime = startSongPos + (elapsedMillis / 1000.0) * speed;
            this.currentPositionSec = currentSongTime;

            notifyProgress(currentSongTime, totalDuration);

            NoteEvent ev = events.get(nextIndex);
            if (currentSongTime >= ev.getTime()) {
                // Time to trigger notes!
                dispatchNotes(ev.getNotes());
                nextIndex++;
            } else {
                long sleepMs = (long) Math.max(1, ((ev.getTime() - currentSongTime) / speed) * 1000.0);
                try {
                    Thread.sleep(Math.min(sleepMs, 20)); // Sleep in small chunks for responsive pause/stop
                } catch (InterruptedException e) {
                    break;
                }
            }
        }

        isRunning = false;
        isPaused = false;
        notifyProgress(totalDuration, totalDuration);
        notifyState(false);
        if (listener != null) {
            mainHandler.post(() -> {
                if (listener != null) listener.onFinished();
            });
        }
    }

    private void dispatchNotes(List<String> notes) {
        if (notes == null || notes.isEmpty()) return;
        boolean isSky = (coordsManager.getGameMode() == com.eri.gsmusiclyre.util.KeyCoordinatesManager.GAME_SKY);

        // Acoustic sound playback for in-app listening and practice
        for (String note : notes) {
            com.eri.gsmusiclyre.util.AudioSynthesizer.getInstance().playNote(note, isSky);
        }

        LyreAccessibilityService service = LyreAccessibilityService.getInstance();
        if (service == null) return;

        List<PointF> tapPoints = new ArrayList<>();
        for (String note : notes) {
            PointF pt = coordsManager.getCoordinateForNote(note);
            if (pt != null) {
                tapPoints.add(pt);
            }
        }

        if (tapPoints.size() == 1) {
            service.tapAt(tapPoints.get(0).x, tapPoints.get(0).y);
        } else if (tapPoints.size() > 1) {
            service.tapMulti(tapPoints);
        }
    }

    private void notifyState(boolean playing) {
        if (listener != null) {
            mainHandler.post(() -> {
                if (listener != null) listener.onStateChanged(playing);
            });
        }
    }

    private void notifyProgress(double curr, double total) {
        if (listener != null) {
            mainHandler.post(() -> {
                if (listener != null) listener.onProgress(curr, total);
            });
        }
    }
}
