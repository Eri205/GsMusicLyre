"""
core/input_driver.py
Low-level Win32 DirectInput driver for sending hardware scancodes to Genshin Impact.
Bypasses typical anti-cheat virtual-key filters by sending KEYEVENTF_SCANCODE directly.
"""

import ctypes
import time
from ctypes import wintypes
from typing import Set, Iterable, List

# SendInput constants
INPUT_KEYBOARD = 1
KEYEVENTF_KEYDOWN = 0x0000
KEYEVENTF_EXTENDEDKEY = 0x0001
KEYEVENTF_KEYUP = 0x0002
KEYEVENTF_SCANCODE = 0x0008

# Hardware ScanCodes (DirectInput / Set 1) for Genshin Lyre (21 keys) and Sky COTL (15 keys)
SCAN_CODES = {
    # Top Row
    'Q': 0x10, 'W': 0x11, 'E': 0x12, 'R': 0x13, 'T': 0x14, 'Y': 0x15, 'U': 0x16, 'I': 0x17, 'O': 0x18, 'P': 0x19,
    # Middle Row
    'A': 0x1E, 'S': 0x1F, 'D': 0x20, 'F': 0x21, 'G': 0x22, 'H': 0x23, 'J': 0x24, 'K': 0x25, 'L': 0x26, ';': 0x27,
    # Bottom Row
    'Z': 0x2C, 'X': 0x2D, 'C': 0x2E, 'V': 0x2F, 'B': 0x30, 'N': 0x31, 'M': 0x32, ',': 0x33, '.': 0x34, '/': 0x35,
}

# Windows C struct definitions
ULONG_PTR = ctypes.c_ulonglong if ctypes.sizeof(ctypes.c_void_p) == 8 else ctypes.c_ulong

class KEYBDINPUT(ctypes.Structure):
    _fields_ = [
        ("wVk", wintypes.WORD),
        ("wScan", wintypes.WORD),
        ("dwFlags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ULONG_PTR),
    ]

class HARDWAREINPUT(ctypes.Structure):
    _fields_ = [
        ("uMsg", wintypes.DWORD),
        ("wParamL", wintypes.WORD),
        ("wParamH", wintypes.WORD),
    ]

class MOUSEINPUT(ctypes.Structure):
    _fields_ = [
        ("dx", wintypes.LONG),
        ("dy", wintypes.LONG),
        ("mouseData", wintypes.DWORD),
        ("dwFlags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ULONG_PTR),
    ]

class _INPUT_UNION(ctypes.Union):
    _fields_ = [
        ("ki", KEYBDINPUT),
        ("mi", MOUSEINPUT),
        ("hi", HARDWAREINPUT),
    ]

class INPUT(ctypes.Structure):
    _fields_ = [
        ("type", wintypes.DWORD),
        ("union", _INPUT_UNION),
    ]

user32 = ctypes.windll.user32
SendInput = user32.SendInput
SendInput.argtypes = (wintypes.UINT, ctypes.POINTER(INPUT), ctypes.c_int)
SendInput.restype = wintypes.UINT

# Reverse mapping from scancode to Windows Virtual Key (VK)
PUNCT_VK = {';': 0xBA, ',': 0xBC, '.': 0xBE, '/': 0xBF}
SCAN_TO_VK = {v: (ord(k) if k.isalpha() else PUNCT_VK.get(k, 0)) for k, v in SCAN_CODES.items()}
_ACTIVE_SCANCODES: Set[int] = set()

def _create_key_input(scancode: int, flags: int) -> INPUT:
    inp = INPUT()
    inp.type = INPUT_KEYBOARD
    vk = SCAN_TO_VK.get(scancode, 0)
    inp.union.ki.wVk = vk
    inp.union.ki.wScan = scancode
    # Omit KEYEVENTF_SCANCODE so Chrome, web apps (specy.app), Notepad,
    # and DirectX games all receive the keystrokes properly
    inp.union.ki.dwFlags = flags
    inp.union.ki.time = 0
    inp.union.ki.dwExtraInfo = 0
    return inp

def press_scancodes_down(scancodes: Iterable[int]) -> None:
    """Send keydown events for a set of scancodes."""
    target_sc = [sc for sc in scancodes if sc in SCAN_CODES.values() or isinstance(sc, int)]
    if not target_sc:
        return

    # If any key is already held down (e.g. rapid repeated notes/trills),
    # release it first so Windows and game engines register the new strike distinctly.
    stuck_sc = [sc for sc in target_sc if sc in _ACTIVE_SCANCODES]
    if stuck_sc:
        release_scancodes_up(stuck_sc)
        time.sleep(0.002)

    inputs = []
    for sc in target_sc:
        inputs.append(_create_key_input(sc, KEYEVENTF_KEYDOWN))
        _ACTIVE_SCANCODES.add(sc)
            
    if inputs:
        arr = (INPUT * len(inputs))(*inputs)
        SendInput(len(inputs), arr, ctypes.sizeof(INPUT))

def release_scancodes_up(scancodes: Iterable[int]) -> None:
    """Send keyup events for a set of scancodes."""
    inputs = []
    for sc in scancodes:
        inputs.append(_create_key_input(sc, KEYEVENTF_KEYUP))
        _ACTIVE_SCANCODES.discard(sc)
        
    if inputs:
        arr = (INPUT * len(inputs))(*inputs)
        SendInput(len(inputs), arr, ctypes.sizeof(INPUT))

def press_chord_keys(keys: Iterable[str]) -> List[int]:
    """
    Press down one or more keys non-blockingly and return the pressed scancodes.
    Allows zero-latency, non-blocking scheduled releases on high-precision playback threads.
    """
    codes = [SCAN_CODES[k.upper() if k.isalpha() else k] for k in keys if (k.upper() if k.isalpha() else k) in SCAN_CODES]
    if not codes:
        return []
    press_scancodes_down(codes)
    return codes

def play_chord_keys(keys: Iterable[str], hold_duration_ms: float = 25.0) -> None:
    """
    Play one or more keys together (chord) by pressing them down,
    waiting briefly, and releasing them.
    `keys` can be a list like ['Q', 'A', 'Z'].
    """
    codes = press_chord_keys(keys)
    if not codes:
        return
        
    if hold_duration_ms > 0:
        time.sleep(hold_duration_ms / 1000.0)
    release_scancodes_up(codes)

def release_all_keys() -> None:
    """Panic release: Release all active keys to prevent stuck keys."""
    if _ACTIVE_SCANCODES:
        release_scancodes_up(list(_ACTIVE_SCANCODES))
    # Also release all Genshin lyre keys just in case
    all_codes = list(SCAN_CODES.values())
    inputs = [_create_key_input(sc, KEYEVENTF_KEYUP) for sc in all_codes]
    arr = (INPUT * len(inputs))(*inputs)
    SendInput(len(inputs), arr, ctypes.sizeof(INPUT))
    _ACTIVE_SCANCODES.clear()

def is_admin() -> bool:
    """Check if process is running with Administrator privileges."""
    try:
        return bool(ctypes.windll.shell32.IsUserAnAdmin())
    except Exception:
        return False
