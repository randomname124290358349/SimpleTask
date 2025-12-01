import subprocess
import sys
import os
import pystray
from PIL import Image, ImageDraw

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

LOG_FILE = os.path.join(BASE_DIR, "server.log")


def create_image():
    img = Image.new("RGB", (64, 64), "black")
    d = ImageDraw.Draw(img)
    d.rectangle([20, 20, 44, 44], fill="white")
    return img


def on_quit(icon, item):
    icon.visible = False
    icon.stop()

    if "process" in globals() and process:
        process.terminate()


with open(LOG_FILE, "w") as log:
    process = subprocess.Popen(
        ["uv", "run", "app.py"],
        stdout=log,
        stderr=log,
        creationflags=subprocess.CREATE_NO_WINDOW,
        cwd=BASE_DIR
    )

icon = pystray.Icon(
    "SimpleTasks",
    create_image(),
    "SimpleTasks",
    menu=pystray.Menu(
        pystray.MenuItem("Quit", on_quit),
    )
)

icon.run()
