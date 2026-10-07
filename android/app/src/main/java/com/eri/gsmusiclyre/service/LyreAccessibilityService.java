package com.eri.gsmusiclyre.service;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.graphics.Path;
import android.graphics.PointF;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;

import java.lang.ref.WeakReference;
import java.util.List;

public class LyreAccessibilityService extends AccessibilityService {
    private static final String TAG = "LyreAccessibility";
    private static WeakReference<LyreAccessibilityService> instanceRef = null;

    public static LyreAccessibilityService getInstance() {
        return instanceRef != null ? instanceRef.get() : null;
    }

    public static boolean isServiceRunning() {
        return getInstance() != null;
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        instanceRef = new WeakReference<>(this);
        Log.i(TAG, "LyreAccessibilityService connected and ready for auto-play gestures");
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // Not used, gestures are driven by player engine
    }

    @Override
    public void onInterrupt() {
        Log.w(TAG, "LyreAccessibilityService interrupted");
    }

    @Override
    public boolean onUnbind(android.content.Intent intent) {
        instanceRef = null;
        return super.onUnbind(intent);
    }

    /**
     * Dispatch a single tap gesture at (x, y) with optimal 20ms touch duration
     */
    public boolean tapAt(float x, float y) {
        Path path = new Path();
        path.moveTo(x, y);
        GestureDescription.StrokeDescription stroke =
            new GestureDescription.StrokeDescription(path, 0, 20); // 20ms duration for rapid note recovery
        GestureDescription.Builder builder = new GestureDescription.Builder();
        builder.addStroke(stroke);
        return dispatchGesture(builder.build(), null, null);
    }

    /**
     * Dispatch simultaneous multi-touch taps for chords without duplicate collisions
     */
    public boolean tapMulti(List<PointF> points) {
        if (points == null || points.isEmpty()) return false;
        GestureDescription.Builder builder = new GestureDescription.Builder();
        List<PointF> uniquePoints = new ArrayList<>();

        for (PointF pt : points) {
            if (pt == null) continue;
            boolean isDuplicate = false;
            for (PointF existing : uniquePoints) {
                if (Math.abs(existing.x - pt.x) < 5.0f && Math.abs(existing.y - pt.y) < 5.0f) {
                    isDuplicate = true;
                    break;
                }
            }
            if (!isDuplicate) {
                uniquePoints.add(pt);
            }
        }

        int maxStrokes = Math.min(uniquePoints.size(), 10);
        for (int i = 0; i < maxStrokes; i++) {
            PointF pt = uniquePoints.get(i);
            Path path = new Path();
            path.moveTo(pt.x, pt.y);
            builder.addStroke(new GestureDescription.StrokeDescription(path, 0, 20));
        }
        return dispatchGesture(builder.build(), null, null);
    }
}
