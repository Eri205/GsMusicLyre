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
    private static final String PREF_GAME_MODE = "current_game_mode";

    public static final int GAME_GENSHIN = 0;
    public static final int GAME_SKY = 1;

    public static final int TOTAL_KEYS_GENSHIN = 21;
    public static final int TOTAL_KEYS_SKY = 15;

    // Genshin 21 keys (3 rows x 7 cols)
    public static final String[] GENSHIN_KEY_LABELS = {
        "Q", "W", "E", "R", "T", "Y", "U",
        "A", "S", "D", "F", "G", "H", "J",
        "Z", "X", "C", "V", "B", "N", "M"
    };

    // Sky: Children of the Light 15 keys (3 rows x 5 cols)
    public static final String[] SKY_KEY_LABELS = {
        "A1", "A2", "A3", "A4", "A5",
        "B1", "B2", "B3", "B4", "B5",
        "C1", "C2", "C3", "C4", "C5"
    };

    public static final String[] SKY_KEY_QWERT = {
        "Q", "W", "E", "R", "T",
        "A", "S", "D", "F", "G",
        "Z", "X", "C", "V", "B"
    };

    // Backward compatibility constant
    public static final int TOTAL_KEYS = 21;
    public static final String[] KEY_LABELS = GENSHIN_KEY_LABELS;

    private static final Map<String, Integer> GENSHIN_NOTE_TO_INDEX = new HashMap<>();
    private static final Map<String, Integer> SKY_NOTE_TO_INDEX = new HashMap<>();

    static {
        // --- GENSHIN MAPPINGS (21 keys: Do3 to Si5) ---
        // Bass (Z..M -> 14..20)
        GENSHIN_NOTE_TO_INDEX.put("C3", 14); GENSHIN_NOTE_TO_INDEX.put("D3", 15); GENSHIN_NOTE_TO_INDEX.put("E3", 16);
        GENSHIN_NOTE_TO_INDEX.put("F3", 17); GENSHIN_NOTE_TO_INDEX.put("G3", 18); GENSHIN_NOTE_TO_INDEX.put("A3", 19); GENSHIN_NOTE_TO_INDEX.put("B3", 20);
        GENSHIN_NOTE_TO_INDEX.put("Z", 14); GENSHIN_NOTE_TO_INDEX.put("X", 15); GENSHIN_NOTE_TO_INDEX.put("C", 16);
        GENSHIN_NOTE_TO_INDEX.put("V", 17); GENSHIN_NOTE_TO_INDEX.put("B", 18); GENSHIN_NOTE_TO_INDEX.put("N", 19); GENSHIN_NOTE_TO_INDEX.put("M", 20);

        // Mid (A..J -> 7..13)
        GENSHIN_NOTE_TO_INDEX.put("C4", 7); GENSHIN_NOTE_TO_INDEX.put("D4", 8); GENSHIN_NOTE_TO_INDEX.put("E4", 9);
        GENSHIN_NOTE_TO_INDEX.put("F4", 10); GENSHIN_NOTE_TO_INDEX.put("G4", 11); GENSHIN_NOTE_TO_INDEX.put("A4", 12); GENSHIN_NOTE_TO_INDEX.put("B4", 13);
        GENSHIN_NOTE_TO_INDEX.put("A", 7); GENSHIN_NOTE_TO_INDEX.put("S", 8); GENSHIN_NOTE_TO_INDEX.put("D", 9);
        GENSHIN_NOTE_TO_INDEX.put("F", 10); GENSHIN_NOTE_TO_INDEX.put("G", 11); GENSHIN_NOTE_TO_INDEX.put("H", 12); GENSHIN_NOTE_TO_INDEX.put("J", 13);

        // Treble (Q..U -> 0..6)
        GENSHIN_NOTE_TO_INDEX.put("C5", 0); GENSHIN_NOTE_TO_INDEX.put("D5", 1); GENSHIN_NOTE_TO_INDEX.put("E5", 2);
        GENSHIN_NOTE_TO_INDEX.put("F5", 3); GENSHIN_NOTE_TO_INDEX.put("G5", 4); GENSHIN_NOTE_TO_INDEX.put("A5", 5); GENSHIN_NOTE_TO_INDEX.put("B5", 6);
        GENSHIN_NOTE_TO_INDEX.put("Q", 0); GENSHIN_NOTE_TO_INDEX.put("W", 1); GENSHIN_NOTE_TO_INDEX.put("E", 2);
        GENSHIN_NOTE_TO_INDEX.put("R", 3); GENSHIN_NOTE_TO_INDEX.put("T", 4); GENSHIN_NOTE_TO_INDEX.put("Y", 5); GENSHIN_NOTE_TO_INDEX.put("U", 6);

        // --- SKY COTL MAPPINGS (15 keys: C4 to C6) ---
        // Row 1 (A1-A5 / Q-T / 1-5 -> C4, D4, E4, F4, G4: indices 0..4)
        SKY_NOTE_TO_INDEX.put("A1", 0); SKY_NOTE_TO_INDEX.put("A2", 1); SKY_NOTE_TO_INDEX.put("A3", 2); SKY_NOTE_TO_INDEX.put("A4", 3); SKY_NOTE_TO_INDEX.put("A5", 4);
        SKY_NOTE_TO_INDEX.put("1", 0); SKY_NOTE_TO_INDEX.put("2", 1); SKY_NOTE_TO_INDEX.put("3", 2); SKY_NOTE_TO_INDEX.put("4", 3); SKY_NOTE_TO_INDEX.put("5", 4);
        SKY_NOTE_TO_INDEX.put("Q", 0); SKY_NOTE_TO_INDEX.put("W", 1); SKY_NOTE_TO_INDEX.put("E", 2); SKY_NOTE_TO_INDEX.put("R", 3); SKY_NOTE_TO_INDEX.put("T", 4);
        SKY_NOTE_TO_INDEX.put("C4", 0); SKY_NOTE_TO_INDEX.put("D4", 1); SKY_NOTE_TO_INDEX.put("E4", 2); SKY_NOTE_TO_INDEX.put("F4", 3); SKY_NOTE_TO_INDEX.put("G4", 4);
        // Fold low C3..G3 up to C4..G4 for Sky
        SKY_NOTE_TO_INDEX.put("C3", 0); SKY_NOTE_TO_INDEX.put("D3", 1); SKY_NOTE_TO_INDEX.put("E3", 2); SKY_NOTE_TO_INDEX.put("F3", 3); SKY_NOTE_TO_INDEX.put("G3", 4);

        // Row 2 (B1-B5 / A-G / 6-10 -> A4, B4, C5, D5, E5: indices 5..9)
        SKY_NOTE_TO_INDEX.put("B1", 5); SKY_NOTE_TO_INDEX.put("B2", 6); SKY_NOTE_TO_INDEX.put("B3", 7); SKY_NOTE_TO_INDEX.put("B4", 8); SKY_NOTE_TO_INDEX.put("B5", 9);
        SKY_NOTE_TO_INDEX.put("6", 5); SKY_NOTE_TO_INDEX.put("7", 6); SKY_NOTE_TO_INDEX.put("8", 7); SKY_NOTE_TO_INDEX.put("9", 8); SKY_NOTE_TO_INDEX.put("10", 9);
        SKY_NOTE_TO_INDEX.put("A", 5); SKY_NOTE_TO_INDEX.put("S", 6); SKY_NOTE_TO_INDEX.put("D", 7); SKY_NOTE_TO_INDEX.put("F", 8); SKY_NOTE_TO_INDEX.put("G", 9);
        SKY_NOTE_TO_INDEX.put("A4", 5); SKY_NOTE_TO_INDEX.put("B4", 6); SKY_NOTE_TO_INDEX.put("C5", 7); SKY_NOTE_TO_INDEX.put("D5", 8); SKY_NOTE_TO_INDEX.put("E5", 9);
        // Fold low A3..B3 up to A4..B4 for Sky
        SKY_NOTE_TO_INDEX.put("A3", 5); SKY_NOTE_TO_INDEX.put("B3", 6);

        // Row 3 (C1-C5 / Z-B / 11-15 -> F5, G5, A5, B5, C6: indices 10..14)
        SKY_NOTE_TO_INDEX.put("C1", 10); SKY_NOTE_TO_INDEX.put("C2", 11); SKY_NOTE_TO_INDEX.put("C3", 12); SKY_NOTE_TO_INDEX.put("C4_SKY", 13); SKY_NOTE_TO_INDEX.put("C5_SKY", 14);
        SKY_NOTE_TO_INDEX.put("11", 10); SKY_NOTE_TO_INDEX.put("12", 11); SKY_NOTE_TO_INDEX.put("13", 12); SKY_NOTE_TO_INDEX.put("14", 13); SKY_NOTE_TO_INDEX.put("15", 14);
        SKY_NOTE_TO_INDEX.put("Z", 10); SKY_NOTE_TO_INDEX.put("X", 11); SKY_NOTE_TO_INDEX.put("C", 12); SKY_NOTE_TO_INDEX.put("V", 13); SKY_NOTE_TO_INDEX.put("B", 14);
        SKY_NOTE_TO_INDEX.put("F5", 10); SKY_NOTE_TO_INDEX.put("G5", 11); SKY_NOTE_TO_INDEX.put("A5", 12); SKY_NOTE_TO_INDEX.put("B5", 13); SKY_NOTE_TO_INDEX.put("C6", 14);
        // Fold higher D6..B6 down to D5..B5 for Sky
        SKY_NOTE_TO_INDEX.put("D6", 8); SKY_NOTE_TO_INDEX.put("E6", 9); SKY_NOTE_TO_INDEX.put("F6", 10); SKY_NOTE_TO_INDEX.put("G6", 11);
    }

    private final SharedPreferences prefs;
    private final Context context;

    public KeyCoordinatesManager(Context context) {
        this.context = context.getApplicationContext();
        this.prefs = this.context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
    }

    public int getGameMode() {
        return prefs.getInt(PREF_GAME_MODE, GAME_GENSHIN);
    }

    public void setGameMode(int mode) {
        prefs.edit().putInt(PREF_GAME_MODE, mode).apply();
    }

    public int getTotalKeys() {
        return getGameMode() == GAME_SKY ? TOTAL_KEYS_SKY : TOTAL_KEYS_GENSHIN;
    }

    public String[] getKeyLabels() {
        return getGameMode() == GAME_SKY ? SKY_KEY_LABELS : GENSHIN_KEY_LABELS;
    }

    public PointF getKeyCoordinate(int index) {
        return getKeyCoordinate(index, getGameMode());
    }

    public PointF getKeyCoordinate(int index, int mode) {
        int maxKeys = (mode == GAME_SKY) ? TOTAL_KEYS_SKY : TOTAL_KEYS_GENSHIN;
        if (index < 0 || index >= maxKeys) return null;

        String prefix = (mode == GAME_SKY) ? "sky_key_" : "key_";
        if (prefs.contains(prefix + "x_" + index) && prefs.contains(prefix + "y_" + index)) {
            return new PointF(
                prefs.getFloat(prefix + "x_" + index, 0f),
                prefs.getFloat(prefix + "y_" + index, 0f)
            );
        }
        return getDefaultCoordinate(index, mode);
    }

    public PointF getCoordinateForNote(String noteName) {
        return getCoordinateForNote(noteName, getGameMode());
    }

    public PointF getCoordinateForNote(String noteName, int mode) {
        if (noteName == null) return null;
        String clean = noteName.trim().toUpperCase();

        if (mode == GAME_SKY) {
            Integer idx = SKY_NOTE_TO_INDEX.get(clean);
            if (idx != null) {
                return getKeyCoordinate(idx, GAME_SKY);
            }
            // Fallback: check Genshin index mapped into Sky 15
            Integer gIdx = GENSHIN_NOTE_TO_INDEX.get(clean);
            if (gIdx != null) {
                int skyIdx = gIdx % TOTAL_KEYS_SKY;
                return getKeyCoordinate(skyIdx, GAME_SKY);
            }
        } else {
            Integer idx = GENSHIN_NOTE_TO_INDEX.get(clean);
            if (idx != null) {
                return getKeyCoordinate(idx, GAME_GENSHIN);
            }
        }
        return null;
    }

    public void saveKeyCoordinate(int index, float x, float y) {
        saveKeyCoordinate(index, x, y, getGameMode());
    }

    public void saveKeyCoordinate(int index, float x, float y, int mode) {
        String prefix = (mode == GAME_SKY) ? "sky_key_" : "key_";
        prefs.edit()
            .putFloat(prefix + "x_" + index, x)
            .putFloat(prefix + "y_" + index, y)
            .apply();
    }

    public void resetToDefault() {
        resetToDefault(getGameMode());
    }

    public void resetToDefault(int mode) {
        String prefix = (mode == GAME_SKY) ? "sky_key_" : "key_";
        int max = (mode == GAME_SKY) ? TOTAL_KEYS_SKY : TOTAL_KEYS_GENSHIN;
        SharedPreferences.Editor ed = prefs.edit();
        for (int i = 0; i < max; i++) {
            ed.remove(prefix + "x_" + i);
            ed.remove(prefix + "y_" + i);
        }
        ed.apply();
    }

    public PointF getDefaultCoordinate(int index, int mode) {
        WindowManager wm = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        DisplayMetrics dm = new DisplayMetrics();
        if (wm != null && wm.getDefaultDisplay() != null) {
            wm.getDefaultDisplay().getRealMetrics(dm);
        } else {
            dm.widthPixels = 2400;
            dm.heightPixels = 1080;
        }

        int screenW = Math.max(dm.widthPixels, dm.heightPixels); // Landscape screen
        int screenH = Math.min(dm.widthPixels, dm.heightPixels);

        if (mode == GAME_SKY) {
            // Sky: Children of the Light (3 rows x 5 columns centered)
            int row = index / 5; // 0, 1, 2
            int col = index % 5; // 0..4

            float startX = screenW * 0.33f;
            float endX = screenW * 0.67f;
            float stepX = (endX - startX) / 4f;

            float startY = screenH * 0.52f;
            float endY = screenH * 0.82f;
            float stepY = (endY - startY) / 2f;

            float x = startX + col * stepX;
            float y = startY + row * stepY;
            return new PointF(x, y);
        } else {
            // Genshin Impact (3 rows x 7 columns)
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

    public PointF getDefaultCoordinate(int index) {
        return getDefaultCoordinate(index, getGameMode());
    }
}
