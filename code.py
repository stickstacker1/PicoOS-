```python
import board
import busio
import displayio
import terminalio
import time
from digitalio import DigitalInOut, Direction, Pull

# ---------------------------------------------------------
# REQUIRED EXTERNAL LIBRARIES (Place in /lib folder on Pico)
# - adafruit_display_text
# - adafruit_display_shapes
# - adafruit_st7789
# ---------------------------------------------------------
from adafruit_display_text import label
from adafruit_display_shapes.rect import Rect
import adafruit_st7789

# --- HARDWARE SETUP ---
displayio.release_displays()

# Display SPI Setup (Assumes standard 240x240 ST7789 TFT)
spi = busio.SPI(clock=board.GP18, MOSI=board.GP19)
tft_cs = board.GP17
tft_dc = board.GP16
display_bus = displayio.FourWire(spi, command=tft_dc, chip_select=tft_cs, reset=board.GP20)
display = adafruit_st7789.ST7789(display_bus, width=240, height=240, rowstart=80)

# Button Setup
btn_up = DigitalInOut(board.GP2)
btn_up.direction = Direction.INPUT
btn_up.pull = Pull.UP

btn_down = DigitalInOut(board.GP3)
btn_down.direction = Direction.INPUT
btn_down.pull = Pull.UP

btn_sel = DigitalInOut(board.GP4)
btn_sel.direction = Direction.INPUT
btn_sel.pull = Pull.UP

btn_home = DigitalInOut(board.GP5)
btn_home.direction = Direction.INPUT
btn_home.pull = Pull.UP

# --- OS STATE ---
current_app = "home"
main_group = displayio.Group()
display.root_group = main_group

# Colors
BG_COLOR = 0x000000
TEXT_COLOR = 0xFFFFFF
ACCENT_COLOR = 0x0088FF
SEL_COLOR = 0xFF9900

def clear_display():
    while len(main_group) > 0:
        main_group.pop()
    bg = Rect(0, 0, 240, 240, fill=BG_COLOR)
    main_group.append(bg)

# --- HOME APP ---
apps = ["ProCalc", "Agenda", "Ledger"]
home_cursor = 0

def draw_home():
    clear_display()
    
    # Title
    title = label.Label(terminalio.FONT, text="PicoOS 1.0", color=ACCENT_COLOR, scale=2, x=60, y=20)
    main_group.append(title)
    
    # App List
    for i, app_name in enumerate(apps):
        y_pos = 60 + (i * 40)
        
        # Cursor highlight
        if i == home_cursor:
            cursor_rect = Rect(20, y_pos - 10, 200, 30, fill=0x333333)
            main_group.append(cursor_rect)
            
        app_lbl = label.Label(terminalio.FONT, text=app_name, color=TEXT_COLOR, scale=2, x=30, y=y_pos + 5)
        main_group.append(app_lbl)

def handle_home_input(up, down, sel):
    global home_cursor, current_app
    if down:
        home_cursor = (home_cursor + 1) % len(apps)
        draw_home()
    if up:
        home_cursor = (home_cursor - 1) % len(apps)
        draw_home()
    if sel:
        if apps[home_cursor] == "ProCalc":
            current_app = "calc"
            draw_calc()
        else:
            # Placeholder for unbuilt apps
            clear_display()
            msg = label.Label(terminalio.FONT, text="Under Construction", color=0xFF0000, scale=1, x=50, y=120)
            main_group.append(msg)

# --- CALCULATOR APP ---
calc_display_text = "0"
calc_equation = ""
calc_grid = [
    ['7', '8', '9', '/'],
    ['4', '5', '6', '*'],
    ['1', '2', '3', '-'],
    ['C', '0', '=', '+']
]
calc_cx, calc_cy = 0, 0 # Cursor X, Y

def calc_eval(eq, current):
    # Simple safe math evaluator for CircuitPython
    try:
        expr = eq + current
        # Note: eval() is safe here as input is strictly controlled by our grid
        res = eval(expr)
        if isinstance(res, float) and res.is_integer():
            return str(int(res))
        return str(round(res, 4))
    except Exception:
        return "Error"

def draw_calc():
    clear_display()
    
    # Header display area
    disp_rect = Rect(10, 10, 220, 50, fill=0x222222)
    main_group.append(disp_rect)
    
    eq_lbl = label.Label(terminalio.FONT, text=calc_equation, color=0x888888, scale=1, x=15, y=20)
    main_group.append(eq_lbl)
    
    val_lbl = label.Label(terminalio.FONT, text=calc_display_text[-12:], color=TEXT_COLOR, scale=3, x=15, y=45)
    main_group.append(val_lbl)
    
    # Virtual Keypad Grid
    start_y = 70
    start_x = 10
    btn_w, btn_h = 50, 35
    gap = 5
    
    for row in range(4):
        for col in range(4):
            x = start_x + (col * (btn_w + gap))
            y = start_y + (row * (btn_h + gap))
            
            # Cursor highlighting
            is_cursor = (calc_cy == row and calc_cx == col)
            fill_color = SEL_COLOR if is_cursor else 0x444444
            
            btn_rect = Rect(x, y, btn_w, btn_h, fill=fill_color)
            main_group.append(btn_rect)
            
            btn_lbl = label.Label(terminalio.FONT, text=calc_grid[row][col], color=TEXT_COLOR, scale=2, x=x+15, y=y+18)
            main_group.append(btn_lbl)

def handle_calc_input(up, down, sel):
    global calc_cx, calc_cy, calc_display_text, calc_equation
    
    if down:
        calc_cy = (calc_cy + 1) % 4
        draw_calc()
    if up:
        calc_cx = (calc_cx + 1) % 4 # Using UP to move horizontally to save button count
        draw_calc()
        
    if sel:
        btn = calc_grid[calc_cy][calc_cx]
        
        if btn == 'C':
            calc_display_text = "0"
            calc_equation = ""
        elif btn in ['/', '*', '-', '+']:
            calc_equation = calc_display_text + btn
            calc_display_text = "0"
        elif btn == '=':
            calc_display_text = calc_eval(calc_equation, calc_display_text)
            calc_equation = ""
        else:
            if calc_display_text == "0" or calc_display_text == "Error":
                calc_display_text = btn
            else:
                calc_display_text += btn
                
        draw_calc()

# --- MAIN EVENT LOOP ---
draw_home()

# Debounce state
last_up = True
last_down = True
last_sel = True
last_home = True

while True:
    # Read buttons (False when pressed due to Pull.UP)
    cur_up = btn_up.value
    cur_down = btn_down.value
    cur_sel = btn_sel.value
    cur_home = btn_home.value
    
    # Detect falling edges (button press)
    press_up = last_up and not cur_up
    press_down = last_down and not cur_down
    press_sel = last_sel and not cur_sel
    press_home = last_home and not cur_home
    
    # Global Home Button logic
    if press_home and current_app != "home":
        current_app = "home"
        draw_home()
        
    # Route input to current app
    if press_up or press_down or press_sel:
        if current_app == "home":
            handle_home_input(press_up, press_down, press_sel)
        elif current_app == "calc":
            handle_calc_input(press_up, press_down, press_sel)
            
    # Update state
    last_up = cur_up
    last_down = cur_down
    last_sel = cur_sel
    last_home = cur_home
    
    time.sleep(0.05) # Debounce delay

```
