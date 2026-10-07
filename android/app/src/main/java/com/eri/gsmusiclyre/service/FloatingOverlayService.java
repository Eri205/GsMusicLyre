package com.eri.gsmusiclyre.service;

import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.core.app.NotificationCompat;

import com.eri.gsmusiclyre.R;
import com.eri.gsmusiclyre.model.Song;
import com.eri.gsmusiclyre.parser.SongParser;
import com.eri.gsmusiclyre.player.AutoPlayerEngine;

import java.util.List;
import java.util.Locale;

public class FloatingOverlayService extends Service implements AutoPlayerEngine.PlaybackListener {
    private static final String CHANNEL_ID = "GsMusicLyre_Overlay";
    private static final int NOTIF_ID = 1001;

    private WindowManager windowManager;
    private View bubbleView;
    private View controllerView;

    private WindowManager.LayoutParams bubbleParams;
    private WindowManager.LayoutParams controllerParams;

    private AutoPlayerEngine playerEngine;
    private List<Song> songList;
    private int currentSongIndex = 0;

    private TextView tvSongName;
    private ProgressBar progressBar;
    private TextView tvTime;
    private Button btnPlayPause;
    private TextView tvSpeed;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        playerEngine = AutoPlayerEngine.getInstance(this);
        playerEngine.setListener(this);

        songList = SongParser.loadBuiltinSongs(this);

        startAsForeground();
        initBubbleView();
        initControllerView();

        // Show bubble initially
        showBubble();
    }

    private void startAsForeground() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "GsMusicLyre Overlay Service",
                NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("GsMusicLyre Đang Chạy")
            .setContentText("Cửa sổ nổi điều khiển trong game đang hoạt động")
            .setSmallIcon(R.drawable.ic_launcher)
            .build();

        startForeground(NOTIF_ID, notification);
    }

    @SuppressLint("ClickableViewAccessibility")
    private void initBubbleView() {
        bubbleView = LayoutInflater.from(this).inflate(R.layout.layout_floating_bubble, null);

        int layoutType = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;

        bubbleParams = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        );

        bubbleParams.gravity = Gravity.TOP | Gravity.START;
        bubbleParams.x = 50;
        bubbleParams.y = 200;

        bubbleView.setOnTouchListener(new View.OnTouchListener() {
            private int initialX, initialY;
            private float initialTouchX, initialTouchY;
            private boolean isDrag = false;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = bubbleParams.x;
                        initialY = bubbleParams.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        isDrag = false;
                        return true;

                    case MotionEvent.ACTION_MOVE:
                        int dx = (int) (event.getRawX() - initialTouchX);
                        int dy = (int) (event.getRawY() - initialTouchY);
                        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                            isDrag = true;
                            bubbleParams.x = initialX + dx;
                            bubbleParams.y = initialY + dy;
                            windowManager.updateViewLayout(bubbleView, bubbleParams);
                        }
                        return true;

                    case MotionEvent.ACTION_UP:
                        if (!isDrag) {
                            // Tap detected -> expand controller
                            showController();
                        }
                        return true;
                }
                return false;
            }
        });
    }

    @SuppressLint("ClickableViewAccessibility")
    private void initControllerView() {
        controllerView = LayoutInflater.from(this).inflate(R.layout.layout_floating_controller, null);

        int layoutType = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;

        controllerParams = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        );

        controllerParams.gravity = Gravity.TOP | Gravity.START;
        controllerParams.x = 100;
        controllerParams.y = 150;

        // Bind controls
        tvSongName = controllerView.findViewById(R.id.tv_current_song);
        progressBar = controllerView.findViewById(R.id.progress_song);
        tvTime = controllerView.findViewById(R.id.tv_time);
        btnPlayPause = controllerView.findViewById(R.id.btn_play_pause);
        tvSpeed = controllerView.findViewById(R.id.tv_speed);

        View dragHeader = controllerView.findViewById(R.id.header_drag_area);
        dragHeader.setOnTouchListener(new View.OnTouchListener() {
            private int initialX, initialY;
            private float initialTouchX, initialTouchY;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = controllerParams.x;
                        initialY = controllerParams.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        controllerParams.x = initialX + (int) (event.getRawX() - initialTouchX);
                        controllerParams.y = initialY + (int) (event.getRawY() - initialTouchY);
                        windowManager.updateViewLayout(controllerView, controllerParams);
                        return true;
                }
                return false;
            }
        });

        controllerView.findViewById(R.id.btn_float_minimize).setOnClickListener(v -> showBubble());
        controllerView.findViewById(R.id.btn_float_close).setOnClickListener(v -> {
            playerEngine.stop();
            stopSelf();
        });

        btnPlayPause.setOnClickListener(v -> togglePlay());

        controllerView.findViewById(R.id.btn_prev_song).setOnClickListener(v -> changeSong(-1));
        controllerView.findViewById(R.id.btn_next_song).setOnClickListener(v -> changeSong(1));

        controllerView.findViewById(R.id.btn_speed_down).setOnClickListener(v -> {
            float s = Math.max(0.5f, playerEngine.getSpeed() - 0.1f);
            playerEngine.setSpeed(s);
            tvSpeed.setText(String.format(Locale.US, "%.1fx", s));
        });

        controllerView.findViewById(R.id.btn_speed_up).setOnClickListener(v -> {
            float s = Math.min(2.0f, playerEngine.getSpeed() + 0.1f);
            playerEngine.setSpeed(s);
            tvSpeed.setText(String.format(Locale.US, "%.1fx", s));
        });

        Button btnToggleGame = controllerView.findViewById(R.id.btn_toggle_game);
        com.eri.gsmusiclyre.util.KeyCoordinatesManager coordsManager =
            new com.eri.gsmusiclyre.util.KeyCoordinatesManager(this);
        updateGameButton(btnToggleGame, coordsManager.getGameMode());

        if (btnToggleGame != null) {
            btnToggleGame.setOnClickListener(v -> {
                int curMode = coordsManager.getGameMode();
                int newMode = (curMode == com.eri.gsmusiclyre.util.KeyCoordinatesManager.GAME_GENSHIN)
                    ? com.eri.gsmusiclyre.util.KeyCoordinatesManager.GAME_SKY
                    : com.eri.gsmusiclyre.util.KeyCoordinatesManager.GAME_GENSHIN;
                coordsManager.setGameMode(newMode);
                updateGameButton(btnToggleGame, newMode);
                String name = (newMode == com.eri.gsmusiclyre.util.KeyCoordinatesManager.GAME_SKY)
                    ? "Sky: Children of the Light (15 phím)"
                    : "Genshin Impact (21 phím)";
                Toast.makeText(this, "Đã chuyển sang: " + name, Toast.LENGTH_SHORT).show();
            });
        }

        controllerView.findViewById(R.id.btn_open_calibrate).setOnClickListener(v -> {
            Intent calibIntent = new Intent(this, CalibrationOverlayService.class);
            startService(calibIntent);
            showBubble(); // Minimize while calibrating
        });

        updateSongDisplay();
    }

    private void updateGameButton(Button btn, int mode) {
        if (btn == null) return;
        if (mode == com.eri.gsmusiclyre.util.KeyCoordinatesManager.GAME_SKY) {
            btn.setText("✨ Sky (15)");
            btn.setBackgroundResource(R.drawable.bg_key_sky);
        } else {
            btn.setText("🎮 Genshin (21)");
            btn.setBackgroundResource(R.drawable.bg_btn_gradient);
        }
    }

    private void togglePlay() {
        if (!LyreAccessibilityService.isServiceRunning()) {
            Toast.makeText(this, "Vui lòng bật quyền Hỗ Trợ Tiếp Cận (Accessibility) để tự gõ phím!", Toast.LENGTH_LONG).show();
            return;
        }

        if (playerEngine.isPlaying()) {
            playerEngine.pause();
        } else {
            if (playerEngine.getCurrentSong() == null && !songList.isEmpty()) {
                playerEngine.play(songList.get(currentSongIndex));
            } else {
                playerEngine.resume();
            }
        }
    }

    private void changeSong(int delta) {
        if (songList.isEmpty()) return;
        currentSongIndex = (currentSongIndex + delta + songList.size()) % songList.size();
        Song next = songList.get(currentSongIndex);
        updateSongDisplay();
        if (playerEngine.isPlaying()) {
            playerEngine.play(next);
        }
    }

    private void updateSongDisplay() {
        if (!songList.isEmpty() && currentSongIndex < songList.size()) {
            Song s = songList.get(currentSongIndex);
            tvSongName.setText(s.getTitle() + " (" + s.getCategory() + ")");
        }
    }

    private void showBubble() {
        if (controllerView.isAttachedToWindow()) {
            windowManager.removeView(controllerView);
        }
        if (!bubbleView.isAttachedToWindow()) {
            windowManager.addView(bubbleView, bubbleParams);
        }
    }

    private void showController() {
        if (bubbleView.isAttachedToWindow()) {
            windowManager.removeView(bubbleView);
        }
        if (!controllerView.isAttachedToWindow()) {
            windowManager.addView(controllerView, controllerParams);
        }
    }

    @Override
    public void onProgress(double currentSec, double totalSec) {
        if (totalSec > 0) {
            int progress = (int) ((currentSec / totalSec) * 100);
            progressBar.setProgress(progress);
            int curM = (int) currentSec / 60;
            int curS = (int) currentSec % 60;
            int totM = (int) totalSec / 60;
            int totS = (int) totalSec % 60;
            tvTime.setText(String.format(Locale.US, "%02d:%02d / %02d:%02d", curM, curS, totM, totS));
        }
    }

    @Override
    public void onStateChanged(boolean isPlaying) {
        btnPlayPause.setText(isPlaying ? "⏸ TẠM DỪNG" : "▶ PHÁT");
    }

    @Override
    public void onFinished() {
        btnPlayPause.setText("▶ PHÁT");
        progressBar.setProgress(0);
        tvTime.setText("00:00 / 00:00");
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        playerEngine.stop();
        if (bubbleView != null && bubbleView.isAttachedToWindow()) {
            windowManager.removeView(bubbleView);
        }
        if (controllerView != null && controllerView.isAttachedToWindow()) {
            windowManager.removeView(controllerView);
        }
    }
}
