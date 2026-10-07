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
     * Dispatch a single tap gesture at (x, y)
     */
    public boolean tapAt(float x, float y) {
        Path path = new Path();
        path.moveTo(x, y);
        GestureDescription.StrokeDescription stroke =
            new GestureDescription.StrokeDescription(path, 0, 45); // 45ms duration
        GestureDescription.Builder builder = new GestureDescription.Builder();
        builder.addStroke(stroke);
        return dispatchGesture(builder.build(), null, null);
    }

    /**
     * Dispatch simultaneous multi-touch taps for chords
     */
    public boolean tapMulti(List<PointF> points) {
        if (points == null || points.isEmpty()) return false;
        GestureDescription.Builder builder = new GestureDescription.Builder();
        int maxStrokes = Math.min(points.size(), 10); // Android gesture supports up to 10 strokes
        for (int i = 0; i < maxStrokes; i++) {
            PointF pt = points.get(i);
            Path path = new Path();
            path.moveTo(pt.x, pt.y);
            builder.addStroke(new GestureDescription.StrokeDescription(path, 0, 45));
        }
        return dispatchGesture(builder.build(), null, null);
    }
}
