package com.eri.gsmusiclyre.service;

import android.annotation.SuppressLint;
import android.app.Service;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.PointF;
import android.os.Build;
import android.os.IBinder;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.TextView;
import android.widget.Toast;

import com.eri.gsmusiclyre.R;
import com.eri.gsmusiclyre.util.KeyCoordinatesManager;

import java.util.ArrayList;
import java.util.List;

public class CalibrationOverlayService extends Service {
    private WindowManager windowManager;
    private View fullOverlayView;
    private FrameLayout markersContainer;
    private TextView tvTitle;
    private KeyCoordinatesManager coordsManager;

    private final List<View> markerViews = new ArrayList<>();

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        coordsManager = new KeyCoordinatesManager(this);

        initOverlay();
    }

    @SuppressLint("ClickableViewAccessibility")
    private void initOverlay() {
        fullOverlayView = LayoutInflater.from(this).inflate(R.layout.layout_calibration, null);

        int layoutType = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        );

        markersContainer = fullOverlayView.findViewById(R.id.markers_container);

        // Find title textView in toolbar
        View toolbar = fullOverlayView.findViewById(R.id.calibration_root);
        if (toolbar != null) {
            tvTitle = fullOverlayView.findViewWithTag("title_calib");
        }

        fullOverlayView.findViewById(R.id.btn_calib_close).setOnClickListener(v -> stopSelf());
        fullOverlayView.findViewById(R.id.btn_calib_reset).setOnClickListener(v -> resetMarkers());
        fullOverlayView.findViewById(R.id.btn_calib_save).setOnClickListener(v -> saveAllCoordinates());

        setupMarkers();

        windowManager.addView(fullOverlayView, params);
    }

    @SuppressLint("ClickableViewAccessibility")
    private void setupMarkers() {
        markersContainer.removeAllViews();
        markerViews.clear();

        int mode = coordsManager.getGameMode();
        int totalKeys = coordsManager.getTotalKeys();
        String[] labels = coordsManager.getKeyLabels();

        boolean isSky = (mode == KeyCoordinatesManager.GAME_SKY);
        int markerSizePx = dpToPx(isSky ? 48 : 44);
        int backgroundRes = isSky ? R.drawable.bg_key_sky : R.drawable.bg_key_circle;

        for (int i = 0; i < totalKeys; i++) {
            final int index = i;
            TextView marker = new TextView(this);
            marker.setText(labels[i]);
            marker.setTextColor(isSky ? Color.parseColor("#38BDF8") : Color.WHITE);
            marker.setTextSize(isSky ? 13 : 14);
            marker.setTypeface(null, android.graphics.Typeface.BOLD);
            marker.setGravity(Gravity.CENTER);
            marker.setBackgroundResource(backgroundRes);

            FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(markerSizePx, markerSizePx);

            PointF pt = coordsManager.getKeyCoordinate(index, mode);
            if (pt != null) {
                lp.leftMargin = (int) (pt.x - markerSizePx / 2f);
                lp.topMargin = (int) (pt.y - markerSizePx / 2f);
            }
            marker.setLayoutParams(lp);

            marker.setOnTouchListener(new View.OnTouchListener() {
                private int initialMarginX, initialMarginY;
                private float startX, startY;

                @Override
                public boolean onTouch(View v, MotionEvent event) {
                    FrameLayout.LayoutParams layoutParams = (FrameLayout.LayoutParams) v.getLayoutParams();
                    switch (event.getAction()) {
                        case MotionEvent.ACTION_DOWN:
                            initialMarginX = layoutParams.leftMargin;
                            initialMarginY = layoutParams.topMargin;
                            startX = event.getRawX();
                            startY = event.getRawY();
                            v.setScaleX(1.2f);
                            v.setScaleY(1.2f);
                            return true;

                        case MotionEvent.ACTION_MOVE:
                            layoutParams.leftMargin = (int) (initialMarginX + (event.getRawX() - startX));
                            layoutParams.topMargin = (int) (initialMarginY + (event.getRawY() - startY));
                            v.setLayoutParams(layoutParams);
                            return true;

                        case MotionEvent.ACTION_UP:
                        case MotionEvent.ACTION_CANCEL:
                            v.setScaleX(1.0f);
                            v.setScaleY(1.0f);
                            return true;
                    }
                    return false;
                }
            });

            markerViews.add(marker);
            markersContainer.addView(marker);
        }
    }

    private void resetMarkers() {
        coordsManager.resetToDefault();
        setupMarkers();
        String gameName = (coordsManager.getGameMode() == KeyCoordinatesManager.GAME_SKY) ? "Sky COTL" : "Genshin";
        Toast.makeText(this, "Đã khôi phục phím " + gameName + " về mặc định", Toast.LENGTH_SHORT).show();
    }

    private void saveAllCoordinates() {
        int mode = coordsManager.getGameMode();
        boolean isSky = (mode == KeyCoordinatesManager.GAME_SKY);
        int markerSizePx = dpToPx(isSky ? 48 : 44);
        float radius = markerSizePx / 2f;

        for (int i = 0; i < markerViews.size(); i++) {
            View v = markerViews.get(i);
            if (v != null) {
                FrameLayout.LayoutParams lp = (FrameLayout.LayoutParams) v.getLayoutParams();
                float centerX = lp.leftMargin + radius;
                float centerY = lp.topMargin + radius;
                coordsManager.saveKeyCoordinate(i, centerX, centerY, mode);
            }
        }

        String gameName = isSky ? "Sky: Children of the Light (15 phím)" : "Genshin Impact (21 phím)";
        Toast.makeText(this, "✔ Đã lưu tọa độ cho " + gameName + "!", Toast.LENGTH_LONG).show();
        stopSelf();
    }

    private int dpToPx(int dp) {
        return (int) (dp * getResources().getDisplayMetrics().density + 0.5f);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (fullOverlayView != null && fullOverlayView.isAttachedToWindow()) {
            windowManager.removeView(fullOverlayView);
        }
    }
}
