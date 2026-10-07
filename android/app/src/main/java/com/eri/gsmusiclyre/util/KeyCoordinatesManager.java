package com.eri.gsmusiclyre.util;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.PointF;
import android.util.DisplayMetrics;
import android.view.WindowManager;

import java.util.HashMap;
import java.util.Map;

public class KeyCoordinatesManager {
    private static final String PREF_NAME = "lyre_coordinates";
    public static final int TOTAL_KEYS = 21;

    // Key names corresponding to rows
    // Row 1 (High / Treble): Q W E R T Y U (C5 D5 E5 F5 G5 A5 B5)
    // Row 2 (Mid):           A S D F G H J (C4 D4 E4 F4 G4 A4 B4)
    // Row 3 (Low / Bass):    Z X C V B N M (C3 D3 E3 F3 G3 A3 B3)
    public static final String[] KEY_LABELS = {
        "Q", "W", "E", "R", "T", "Y", "U",
        "A", "S", "D", "F", "G", "H", "J",
        "Z", "X", "C", "V", "B", "N", "M"
    };

    private static final Map<String, Integer> NOTE_TO_INDEX = new HashMap<>();
    static {
        // Bass (Z..M -> 14..20)
        NOTE_TO_INDEX.put("C3", 14); NOTE_TO_INDEX.put("D3", 15); NOTE_TO_INDEX.put("E3", 16);
        NOTE_TO_INDEX.put("F3", 17); NOTE_TO_INDEX.put("G3", 18); NOTE_TO_INDEX.put("A3", 19); NOTE_TO_INDEX.put("B3", 20);
        NOTE_TO_INDEX.put("Z", 14); NOTE_TO_INDEX.put("X", 15); NOTE_TO_INDEX.put("C", 16);
        NOTE_TO_INDEX.put("V", 17); NOTE_TO_INDEX.put("B", 18); NOTE_TO_INDEX.put("N", 19); NOTE_TO_INDEX.put("M", 20);

        // Mid (A..J -> 7..13)
        NOTE_TO_INDEX.put("C4", 7); NOTE_TO_INDEX.put("D4", 8); NOTE_TO_INDEX.put("E4", 9);
        NOTE_TO_INDEX.put("F4", 10); NOTE_TO_INDEX.put("G4", 11); NOTE_TO_INDEX.put("A4", 12); NOTE_TO_INDEX.put("B4", 13);
        NOTE_TO_INDEX.put("A", 7); NOTE_TO_INDEX.put("S", 8); NOTE_TO_INDEX.put("D", 9);
        NOTE_TO_INDEX.put("F", 10); NOTE_TO_INDEX.put("G", 11); NOTE_TO_INDEX.put("H", 12); NOTE_TO_INDEX.put("J", 13);

        // Treble (Q..U -> 0..6)
        NOTE_TO_INDEX.put("C5", 0); NOTE_TO_INDEX.put("D5", 1); NOTE_TO_INDEX.put("E5", 2);
        NOTE_TO_INDEX.put("F5", 3); NOTE_TO_INDEX.put("G5", 4); NOTE_TO_INDEX.put("A5", 5); NOTE_TO_INDEX.put("B5", 6);
        NOTE_TO_INDEX.put("Q", 0); NOTE_TO_INDEX.put("W", 1); NOTE_TO_INDEX.put("E", 2);
        NOTE_TO_INDEX.put("R", 3); NOTE_TO_INDEX.put("T", 4); NOTE_TO_INDEX.put("Y", 5); NOTE_TO_INDEX.put("U", 6);
    }

    private final SharedPreferences prefs;
    private final Context context;

    public KeyCoordinatesManager(Context context) {
        this.context = context.getApplicationContext();
        this.prefs = this.context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
    }

    public PointF getKeyCoordinate(int index) {
        if (index < 0 || index >= TOTAL_KEYS) return null;
        if (prefs.contains("key_x_" + index) && prefs.contains("key_y_" + index)) {
            return new PointF(
                prefs.getFloat("key_x_" + index, 0f),
                prefs.getFloat("key_y_" + index, 0f)
            );
        }
        return getDefaultCoordinate(index);
    }

    public PointF getCoordinateForNote(String noteName) {
        if (noteName == null) return null;
        Integer index = NOTE_TO_INDEX.get(noteName.trim().toUpperCase());
        if (index != null) {
            return getKeyCoordinate(index);
        }
        return null;
    }

    public void saveKeyCoordinate(int index, float x, float y) {
        prefs.edit()
            .putFloat("key_x_" + index, x)
            .putFloat("key_y_" + index, y)
            .apply();
    }

    public void resetToDefault() {
        prefs.edit().clear().apply();
    }

    public PointF getDefaultCoordinate(int index) {
        WindowManager wm = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        DisplayMetrics dm = new DisplayMetrics();
        if (wm != null && wm.getDefaultDisplay() != null) {
            wm.getDefaultDisplay().getRealMetrics(dm);
        } else {
            dm.widthPixels = 2400;
            dm.heightPixels = 1080;
        }

        int screenW = Math.max(dm.widthPixels, dm.heightPixels); // Assume landscape for game
        int screenH = Math.min(dm.widthPixels, dm.heightPixels);

        // Genshin layout: 3 rows x 7 cols
        int row = index / 7; // 0: Treble, 1: Mid, 2: Bass
        int col = index % 7; // 0..6

        float startX = screenW * 0.28f;
        float endX = screenW * 0.72f;
        float stepX = (endX - startX) / 6f;

        float startY = screenH * 0.54f;
        float endY = screenH * 0.84f;
        float stepY = (endY - startY) / 2f;

        float x = startX + col * stepX;
        float y = startY + row * stepY;

        return new PointF(x, y);
    }
}
