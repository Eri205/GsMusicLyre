# 🎵 GsMusicLyre - Auto Game Clicker & Lyre Player

Ứng dụng chơi đàn tự động cho **Genshin Impact** và **Sky: Children of the Light** với giao diện **Liquid Glassmorphism** siêu hiện đại:
- **Liquid Chromatic Mesh Background**: Nền gradient chất lỏng chuyển động mềm mại với hiệu ứng cực quang (Aurora Mesh) 60 FPS.
- **Ultra-Frosted Glassmorphism**: Các thẻ điều khiển kính mờ (`backdrop-filter: blur(35px)`), viền phản chiếu ánh sáng óng ánh (Iridescent Border Reflection).
- **21 Phím Đàn Liquid Glass**: Các phím đàn thiết kế như những viên ngọc kính giác bóng, hiệu ứng sóng vàng rực rỡ khi nốt nhạc được kích hoạt.
- **Tích hợp Web Audio API**: Tự động phát âm thanh đàn hạc/lyre chân thực ngay trong app để nghe thử trước khi vào game.
- **In-Game Floating Overlay**: Cửa sổ nổi điều khiển nhạc ngay trên màn hình game Genshin Impact (`Always-On-Top`) có thể kéo thả và chỉnh độ mờ trong suốt (Opacity).
- **Đóng gói duy nhất 1 file `.exe`**: Chạy ngay lập tức không cần cài đặt Python.

---

## 🌟 Chi Tiết Tính Năng

### 1. 📱 Phiên Bản Mobile PWA & Multi-Touch Lyre (MỚI)
- **Tối ưu Cảm ứng Đa điểm (Multi-Touch)**: Hỗ trợ bấm đồng thời nhiều nốt (hợp âm) và vuốt lướt ngón tay (glissando) mượt mà với phản hồi rung haptic.
- **2 Chế độ hiển thị thông minh**:
  - *Màn hình dọc (Portrait)*: Thanh điều hướng dưới cùng (Bottom Navigation) thuận tiện thao tác 1 tay.
  - *Màn hình ngang (Landscape)*: Tự động kích hoạt **Pro Full-Width Lyre Mode** với các hàng phím mở rộng để chơi đàn bằng cả 2 bàn tay.
- **Standalone Web Audio Engine (0ms Latency)**: Tự động phát nhạc trực tiếp bằng Web Audio API không cần backend Python, tích hợp sẵn 11 bài hát kinh điển.
- **Cài đặt như App (Progressive Web App - PWA)**: Hỗ trợ "Thêm vào màn hình chính" trên iOS Safari & Android Chrome, hoạt động 100% offline nhờ Service Worker.

### 2. 🎵 Thư Viện Bài Hát (Song Library)
- Tìm kiếm tức thì theo tên bài hát, nghệ sĩ hoặc game với thanh tìm kiếm Liquid Glass pill.
- Bộ lọc danh mục (Tags): `All`, `Nhạc đã Import`, `Genshin Impact`, `Anime & OST`, `Classical`, `Pop / Meme`, `Favorites ❤️`.
- Nút **`📂 Import MIDI`**: Tự động nhận diện và đưa file `.mid` vào thư mục `imported_songs`.

### 3. 🪟 Cửa Sổ Nổi Trong Game (In-Game Floating Overlay)
- Bấm nút **`🪟 In-Game Overlay`** hoặc phím nóng **`F11`** để mở thanh điều khiển mini nổi đè lên trên game.
- Hỗ trợ kéo thả chuột, thu nhỏ (Compact Pill), chỉnh độ mờ (Opacity) để không vướng tầm nhìn lúc chơi game.

### 4. 🎹 Đàn Ảo 21 Phím (Interactive Lyre)
- 3 hàng phím Do3 - Si5 tương ứng với `Z-M`, `A-J`, `Q-U`.
- Sáng đèn vàng theo nhịp nhạc thời gian thực.
- Cho phép bấm chuột hoặc chạm cảm ứng để test âm thanh từng phím.

### 5. 🎛️ Mixer & Tuning
- Dịch giọng (Transpose) từ -12 đến +12 bán âm.
- Nút **`🎯 Auto-Detect Best Key`** tự động tìm tone C Major tối ưu cho đàn Genshin.
- Điều chỉnh tốc độ phát từ 0.5x đến 2.0x.
- Tắt/bật từng track MIDI (tự động ngắt track trống).

### 6. ⚡ Phím Nóng Toàn Cục
- **`F8`**: Phát / Tạm dừng (Play / Resume / Pause)
- **`F9`**: Tạm dừng (Pause)
- **`F10`**: Dừng khẩn cấp (Panic Stop)
- **`F11`**: Bật / Tắt cửa sổ nổi In-game
- **`F12`**: Đổi nhanh nhạc cụ (Lyre / Zither / Vintage / Drum)

---

## 🚀 Khởi Động Ứng Dụng

### Trên Máy Tính (Windows)
Chạy trực tiếp file:
👉 **`GsMusicLyre.exe`** (hoặc chạy qua lệnh `python main.py`).

### Trên Điện Thoại (Mobile PWA - Luyện Đàn & Pocket Lyre)
- Mở link web trực tiếp trên điện thoại: **[https://eri205.github.io/GsMusicLyre/](https://eri205.github.io/GsMusicLyre/)**
- Cài đặt PWA vào màn hình chính để luyện đàn và nghe nhạc 100% offline.

### Trên Điện Thoại Android (TỰ ĐỘNG CHƠI TRONG GAME GENSHIN & SKY)
- Tải file **`GsMusicLyre-AutoPlay.apk`** từ mục **Releases** trên GitHub.
- Mở app và cấp 2 quyền:
  1. **Cửa Sổ Nổi (Overlay)**: Hiển thị thanh điều khiển mini đè lên game.
  2. **Hỗ Trợ Tiếp Cận (Accessibility)**: Cho phép tự động chạm 21 phím đàn trong game.
- Bấm **"Mở Cửa Sổ Nổi Trong Game"** ➔ Vào Genshin Impact mở cây đàn ➔ Bấm **"🎯 Chỉnh Phím"** để kéo 21 vòng tròn khớp với phím đàn trên màn hình ➔ Bấm **▶ PHÁT** để đàn tự động đánh!
