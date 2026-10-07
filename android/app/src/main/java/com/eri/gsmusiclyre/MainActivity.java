package com.eri.gsmusiclyre;

import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.eri.gsmusiclyre.adapter.SongAdapter;
import com.eri.gsmusiclyre.model.Song;
import com.eri.gsmusiclyre.parser.SongParser;
import com.eri.gsmusiclyre.service.CalibrationOverlayService;
import com.eri.gsmusiclyre.service.FloatingOverlayService;
import com.eri.gsmusiclyre.service.LyreAccessibilityService;

import java.util.List;

public class MainActivity extends AppCompatActivity {
    private TextView tvStatusOverlay;
    private TextView tvStatusAccessibility;
    private Button btnGrantOverlay;
    private Button btnGrantAccessibility;
    private Button btnStartOverlay;
    private Button btnCalibrate;
    private RecyclerView rvSongs;

    private List<Song> songs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        initViews();
        setupListeners();
        loadSongs();
    }

    @Override
    protected void onResume() {
        super.onResume();
        checkPermissions();
    }

    private void initViews() {
        tvStatusOverlay = findViewById(R.id.tv_status_overlay);
        tvStatusAccessibility = findViewById(R.id.tv_status_accessibility);
        btnGrantOverlay = findViewById(R.id.btn_grant_overlay);
        btnGrantAccessibility = findViewById(R.id.btn_grant_accessibility);
        btnStartOverlay = findViewById(R.id.btn_start_overlay);
        btnCalibrate = findViewById(R.id.btn_calibrate);
        rvSongs = findViewById(R.id.rv_songs);
    }

    private void setupListeners() {
        btnGrantOverlay.setOnClickListener(v -> requestOverlayPermission());
        btnGrantAccessibility.setOnClickListener(v -> requestAccessibilityPermission());

        btnStartOverlay.setOnClickListener(v -> {
            if (!hasOverlayPermission()) {
                Toast.makeText(this, "Vui lòng cấp quyền Cửa Sổ Nổi trước!", Toast.LENGTH_SHORT).show();
                requestOverlayPermission();
                return;
            }
            if (!LyreAccessibilityService.isServiceRunning()) {
                Toast.makeText(this, "Vui lòng cấp quyền Hỗ Trợ Tiếp Cận để tự gõ phím!", Toast.LENGTH_SHORT).show();
                requestAccessibilityPermission();
                return;
            }

            Intent overlayIntent = new Intent(this, FloatingOverlayService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(overlayIntent);
            } else {
                startService(overlayIntent);
            }

            Toast.makeText(this, "Cửa sổ nổi đã bật! Hãy mở game Genshin Impact để chơi.", Toast.LENGTH_LONG).show();
            moveTaskToBack(true); // Minimize app to let user play game
        });

        btnCalibrate.setOnClickListener(v -> {
            if (!hasOverlayPermission()) {
                Toast.makeText(this, "Cần cấp quyền Cửa Sổ Nổi để mở màn hình căn chỉnh!", Toast.LENGTH_SHORT).show();
                requestOverlayPermission();
                return;
            }
            Intent calibIntent = new Intent(this, CalibrationOverlayService.class);
            startService(calibIntent);
            moveTaskToBack(true);
        });
    }

    private void loadSongs() {
        songs = SongParser.loadBuiltinSongs(this);
        rvSongs.setLayoutManager(new LinearLayoutManager(this));
        SongAdapter adapter = new SongAdapter(songs, song -> {
            Toast.makeText(this, "Đã chọn: " + song.getTitle() + " (Bật cửa sổ nổi để phát)", Toast.LENGTH_SHORT).show();
        });
        rvSongs.setAdapter(adapter);
    }

    private void checkPermissions() {
        boolean overlayGranted = hasOverlayPermission();
        if (overlayGranted) {
            tvStatusOverlay.setText(R.string.status_granted);
            tvStatusOverlay.setTextColor(getColor(R.color.accent_green));
            btnGrantOverlay.setVisibility(View.GONE);
        } else {
            tvStatusOverlay.setText(R.string.status_not_granted);
            tvStatusOverlay.setTextColor(getColor(R.color.accent_red));
            btnGrantOverlay.setVisibility(View.VISIBLE);
        }

        boolean accessGranted = LyreAccessibilityService.isServiceRunning();
        if (accessGranted) {
            tvStatusAccessibility.setText(R.string.status_granted);
            tvStatusAccessibility.setTextColor(getColor(R.color.accent_green));
            btnGrantAccessibility.setVisibility(View.GONE);
        } else {
            tvStatusAccessibility.setText(R.string.status_not_granted);
            tvStatusAccessibility.setTextColor(getColor(R.color.accent_red));
            btnGrantAccessibility.setVisibility(View.VISIBLE);
        }
    }

    private boolean hasOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return Settings.canDrawOverlays(this);
        }
        return true;
    }

    private void requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + getPackageName()));
            startActivity(intent);
        }
    }

    private void requestAccessibilityPermission() {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        startActivity(intent);
        Toast.makeText(this, "Tìm 'GsMusicLyre' trong danh sách và gạt BẬT", Toast.LENGTH_LONG).show();
    }
}
