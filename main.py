"""
main.py
Entry point for GsMusicLyre Studio (Liquid Glass Pro Edition).
Launches Edge WebView2 with ultra-modern glassmorphic interface and Python DirectInput backend.
"""

import os
import sys
import webview

# Force UTF-8 encoding on Windows to prevent UnicodeEncodeError with song titles
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Ensure current directory and exe directory are in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
if getattr(sys, 'frozen', False):
    exe_dir = os.path.dirname(os.path.abspath(sys.executable))
    sys.path.insert(0, exe_dir)

from core.library_manager import LibraryManager
from core.player_worker import PlayerWorker
from core.webview_api import JsApi

def get_html_path():
    if getattr(sys, 'frozen', False):
        exe_dir = os.path.dirname(os.path.abspath(sys.executable))
        local_web = os.path.join(exe_dir, 'web', 'index.html')
        if os.path.exists(local_web):
            return local_web
        if hasattr(sys, '_MEIPASS'):
            return os.path.join(sys._MEIPASS, 'web', 'index.html')
    return os.path.join(BASE_DIR, 'web', 'index.html')

def main():
    library_mgr = LibraryManager()
    player_worker = PlayerWorker()
    api = JsApi(library_mgr, player_worker)

    html_file = get_html_path()

    window = webview.create_window(
        title="GsMusicLyre",
        url=f"file:///{os.path.abspath(html_file).replace(os.sep, '/')}",
        js_api=api,
        width=1120,
        height=760,
        min_size=(960, 680),
        frameless=True,
        easy_drag=False,
        background_color="#130D18",
        text_select=False
    )
    api.set_window(window)

    def on_closed():
        try:
            player_worker.cleanup_hotkeys()
            player_worker.stop()
        except Exception:
            pass
        try:
            import os
            os._exit(0)
        except Exception:
            pass

    window.events.closed += on_closed

    # Start WebView2 engine on Windows
    webview.start(gui='edgechromium', debug=False)

if __name__ == '__main__':
    main()
