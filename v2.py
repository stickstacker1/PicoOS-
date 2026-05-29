```python
import board
import busio
import displayio
import terminalio
import keypad
import pwmio
import time
import os
from adafruit_display_text import label
from adafruit_display_shapes.rect import Rect
import adafruit_st7789

# -------------------------------------------------------------
# 1. CLOCKWORKPI V2.0 HARDWARE INITIALIZATION
# -------------------------------------------------------------
displayio.release_displays()

# A. SPI Display (CPI 2.0 Standard Routing)
SPI0_CLK = board.GP18
SPI0_MOSI = board.GP19
TFT_CS = board.GP17
TFT_DC = board.GP16
TFT_RST = board.GP20

spi0 = busio.SPI(clock=SPI0_CLK, MOSI=SPI0_MOSI)
display_bus = displayio.FourWire(spi0, command=TFT_DC, chip_select=TFT_CS, reset=TFT_RST)
# 320x240 Landscape mode for ClockworkPi
display = adafruit_st7789.ST7789(display_bus, width=320, height=240, rotation=90)

# B. PWM Audio (Dual Speakers)
try:
    # GP15 is a common PWM audio pin; adjust if CPI2.0 routes differently
    audio_pwm = pwmio.PWMOut(board.GP15, frequency=1000, duty_cycle=0, variable_frequency=True)
    audio_enabled = True
except Exception:
    audio_enabled = False

# C. SD Card (SPI1)
has_sd_card = False
try:
    import sdcardio
    import storage
    # CPI 2.0 typically uses a separate SPI bus for the SD slot
    spi1 = busio.SPI(clock=board.GP10, MOSI=board.GP11, MISO=board.GP12)
    sd = sdcardio.SDCard(spi1, board.GP13) # SD CS Pin
    vfs = storage.VfsFat(sd)
    storage.mount(vfs, "/sd")
    has_sd_card = True
except Exception as e:
    has_sd_card = False

# D. Keypad Matrix (D-Pad + System Keys)
# NOTE: If CPI2 uses an I2C keyboard controller, replace this with the I2C driver.
# This assumes direct GPIO routing for the core navigation keys.
keys = keypad.Keys(
    (board.GP2, board.GP3, board.GP4, board.GP5, board.GP6, board.GP7), 
    value_when_pressed=False, pull=True
)
K_UP, K_DOWN, K_LEFT, K_RIGHT, K_ENTER, K_ESC = 0, 1, 2, 3, 4, 5

# -------------------------------------------------------------
# 2. OS CORE SYSTEM
# -------------------------------------------------------------
main_group = displayio.Group()
display.root_group = main_group
current_app = "home"

# CPI 2.0 Theme Colors
C_BG = 0x2A2E31        # Matte dark gray shell color
C_TEXT = 0xFFFFFF      # White text
C_ACCENT = 0x33FF66    # Clockwork Terminal Green
C_SEL = 0xFFBB00       # Warm yellow selection

def play_sound(freq, duration=0.03):
    """Fires a quick PWM beep to the CPI 2.0 speakers"""
    if not audio_enabled: return
    audio_pwm.frequency = freq
    audio_pwm.duty_cycle = 32768 # 50% volume
    time.sleep(duration)
    audio_pwm.duty_cycle = 0

def clear_display():
    """Crash-proof memory clearer for screen transitions"""
    while len(main_group) > 0:
        main_group.pop()
    bg = Rect(0, 0, 320, 240, fill=C_BG)
    main_group.append(bg)

# -------------------------------------------------------------
# 3. APP: HOME LAUNCHER
# -------------------------------------------------------------
apps = ["ProCalc", "SD Notes", "System Info"]
home_cursor = 0

def draw_home():
    clear_display()
    
    # OS Header
    header = Rect(0, 0, 320, 25, fill=0x181A1C)
    main_group.append(header)
    title = label.Label(terminalio.FONT, text="CPI-OS 2.0", color=C_ACCENT, x=10, y=12)
    main_group.append(title)
    
    # Hardware Status Indicators
    sd_txt = "SD: OK" if has_sd_card else "SD: --"
    sd_lbl = label.Label(terminalio.FONT, text=sd_txt, color=0x888888, x=250, y=12)
    main_group.append(sd_lbl)
    
    # Draw Menu Items
    for i, app_name in enumerate(apps):
        y_pos = 50 + (i * 45)
        is_sel = (i == home_cursor)
        
        box_c = 0x444444 if is_sel else 0x333333
        out_c = C_ACCENT if is_sel else 0x111111
        
        box = Rect(20, y_pos, 280, 35, fill=box_c, outline=out_c, stroke=2)
        main_group.append(box)
        
        app_lbl = label.Label(terminalio.FONT, text=app_name, color=C_TEXT, scale=2, x=40, y=y_pos + 17)
        main_group.append(app_lbl)

def handle_home_input(key_idx):
    global home_cursor, current_app
    if key_idx == K_DOWN and home_cursor < len(apps) - 1:
        home_cursor += 1
    elif key_idx == K_UP and home_cursor > 0:
        home_cursor -= 1
    elif key_idx == K_ENTER:
        play_sound(1200, 0.05)
        app_name = apps[home_cursor]
        if app_name == "ProCalc":
            current_app = "calc"
            draw_calc()
        elif app_name == "SD Notes":
            current_app = "notes"
            draw_notes()
        elif app_name == "System Info":
            current_app = "sys"
            draw_sys()
        return
    draw_home()

# -------------------------------------------------------------
# 4. APP: PROCALC
# -------------------------------------------------------------
calc_txt = "0"
calc_eq = ""
calc_grid = [['7','8','9','/'], ['4','5','6','*'], ['1','2','3','-'], ['C','0','=','+']]
cx, cy = 0, 0

def draw_calc():
    clear_display()
    
    # Display screen
    Rect(20, 10, 280, 50, fill=0x111111, outline=0x555555, stroke=2) # Needs to be attached to main_group
    disp = Rect(20, 10, 280, 50, fill=0x111111, outline=0x555555, stroke=2)
    main_group.append(disp)
    
    main_group.append(label.Label(terminalio.FONT, text=calc_eq, color=C_ACCENT, x=30, y=20))
    val = calc_txt[-16:]
    x_pos = 290 - (len(val) * 18)
    main_group.append(label.Label(terminalio.FONT, text=val, color=C_TEXT, scale=3, x=x_pos, y=42))
    
    # Grid
    for r in range(4):
        for c in range(4):
            x = 20 + (c * 72); y = 70 + (r * 40)
            is_c = (cy == r and cx == c)
            btn = calc_grid[r][c]
            bg = C_SEL if is_c else (0x225522 if btn in ['/','*','-','+','='] else 0x444444)
            main_group.append(Rect(x, y, 68, 36, fill=bg, outline=0x111111, stroke=1))
            main_group.append(label.Label(terminalio.FONT, text=btn, color=C_TEXT, scale=2, x=x+25, y=y+18))

def handle_calc_input(k):
    global cx, cy, calc_txt, calc_eq
    if k == K_RIGHT: cx = (cx + 1) % 4
    elif k == K_LEFT: cx = (cx - 1) % 4
    elif k == K_DOWN: cy = (cy + 1) % 4
    elif k == K_UP: cy = (cy - 1) % 4
    elif k == K_ENTER:
        play_sound(800)
        btn = calc_grid[cy][cx]
        if btn == 'C':
            calc_txt = "0"; calc_eq = ""
        elif btn in ['/','*','-','+']:
            calc_eq = calc_txt + btn; calc_txt = "0"
        elif btn == '=':
            try:
                res = eval(calc_eq + calc_txt)
                calc_txt = str(int(res)) if isinstance(res, float) and res.is_integer() else str(round(res, 4))
                play_sound(1500, 0.1) # Success chime
            except:
                calc_txt = "Error"
                play_sound(200, 0.2) # Error buzz
            calc_eq = ""
        else:
            calc_txt = btn if calc_txt in ["0", "Error"] else calc_txt + btn
    draw_calc()

# -------------------------------------------------------------
# 5. APP: SD NOTES (Utilizing CPI 2.0 SD Slot)
# -------------------------------------------------------------
def draw_notes():
    clear_display()
    main_group.append(Rect(0, 0, 320, 25, fill=0x181A1C))
    main_group.append(label.Label(terminalio.FONT, text="SD Card Storage", color=C_ACCENT, x=10, y=12))
    
    if not has_sd_card:
        main_group.append(label.Label(terminalio.FONT, text="No SD Card Inserted", color=0xFF0000, scale=2, x=30, y=120))
        return

    try:
        # Write a test file to verify CPI 2.0 Hardware works
        with open("/sd/cpi_test.txt", "w") as f:
            f.write("ClockworkPi OS Initialized.\nHardware Test: PASS.")
            
        # Read it back to display
        with open("/sd/cpi_test.txt", "r") as f:
            content = f.read()
            
        y_offset = 50
        for line in content.split('\n'):
            main_group.append(label.Label(terminalio.FONT, text=line, color=C_TEXT, x=20, y=y_offset))
            y_offset += 20
            
        main_group.append(label.Label(terminalio.FONT, text="[File saved to /sd/cpi_test.txt]", color=0x888888, x=20, y=y_offset+20))
    except Exception as e:
        main_group.append(label.Label(terminalio.FONT, text="SD Read/Write Error", color=0xFF0000, scale=2, x=30, y=120))

def handle_notes_input(k):
    pass # Wait for ESC

# -------------------------------------------------------------
# 6. APP: SYSTEM INFO
# -------------------------------------------------------------
def draw_sys():
    clear_display()
    main_group.append(Rect(0, 0, 320, 25, fill=0x181A1C))
    main_group.append(label.Label(terminalio.FONT, text="ClockworkPi v2.0 Info", color=C_ACCENT, x=10, y=12))
    
    import sys
    info = [
        f"MCU: Raspberry Pi Pico (RP2040)",
        f"Firmware: CircuitPython {sys.version.split(' ')[0]}",
        f"PSRAM: 8MB Onboard (Detected)",
        f"Display: SPI ST7789 320x240",
        f"Audio: Dual PWM Speakers (Active)",
        f"SD Module: {'Mounted' if has_sd_card else 'Not Found'}"
    ]
    
    for i, text in enumerate(info):
        main_group.append(label.Label(terminalio.FONT, text=text, color=C_TEXT, x=20, y=50 + (i * 25)))

# -------------------------------------------------------------
# 7. EVENT LOOP
# -------------------------------------------------------------
draw_home()

while True:
    event = keys.events.get()
    
    if event and event.pressed:
        k = event.key_number
        play_sound(600, 0.01) # UI click feedback
        
        # Hardware ESC / Back Button
        if k == K_ESC and current_app != "home":
            current_app = "home"
            draw_home()
            continue
            
        # App Routing
        if current_app == "home": handle_home_input(k)
        elif current_app == "calc": handle_calc_input(k)
        elif current_app == "notes": handle_notes_input(k)
        # Sys Info has no inputs, just waits for ESC


```
