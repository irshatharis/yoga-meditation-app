# Finds the square crop that keeps the person in frame for a stretch of video.
#   uv run --with ultralytics scripts/frame-person.py SOURCE FROM TO
#     prints [x, y, size] for the crop field in src/content/demos.ts
#   uv run --with ultralytics scripts/frame-person.py SOURCE --scan
#     prints one character per second, # when a person is clearly in view,
#     to help choose FROM and TO.
import os
import sys
import tempfile

import cv2
from ultralytics import YOLO

PERSON = 0
MARGIN = 0.12


def frames(path, start, end, step):
    video = cv2.VideoCapture(path)
    t = start
    while end is None or t <= end:
        video.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
        ok, frame = video.read()
        if not ok:
            return
        yield t, frame
        t += step


def biggest_person(model, frame):
    result = model(frame, classes=[PERSON], conf=0.5, verbose=False)[0]
    boxes = [b.xyxy[0].tolist() for b in result.boxes]
    return max(boxes, key=lambda b: (b[2] - b[0]) * (b[3] - b[1])) if boxes else None


def main():
    path = os.path.abspath(sys.argv[1])
    # The model downloads on first use, so it lands outside the repo.
    os.chdir(tempfile.gettempdir())
    model = YOLO("yolov8n.pt")
    height, width = cv2.VideoCapture(path).read()[1].shape[:2]
    if sys.argv[2] == "--scan":
        print("".join("#" if biggest_person(model, f) else "." for _, f in frames(path, 0, None, 1)))
        return
    start, end = float(sys.argv[2]), float(sys.argv[3])
    seen = [b for _, f in frames(path, start, end, 0.5) if (b := biggest_person(model, f))]
    if not seen:
        sys.exit("no person found in that window")
    left, top = min(b[0] for b in seen), min(b[1] for b in seen)
    right, bottom = max(b[2] for b in seen), max(b[3] for b in seen)
    print(crop(left, top, right, bottom, width, height))


def crop(left, top, right, bottom, width, height):
    """A square around the person, or a 16:9 box around them when they are too wide for any square."""
    spread = max(right - left, bottom - top) * (1 + 2 * MARGIN)
    size = min(height, width, round(spread))
    size -= size % 2
    if right - left > size:
        w = min(width, round((right - left) * (1 + 2 * MARGIN)))
        w -= w % 2
        h = min(height, max(round(w * 9 / 16), round((bottom - top) * (1 + 2 * MARGIN))))
        h -= h % 2
        x = min(max(0, round((left + right - w) / 2)), width - w)
        y = min(max(0, round((top + bottom - h) / 2)), height - h)
        return f"[{x}, {y}, {w}, {h}]"
    x = min(max(0, round((left + right - size) / 2)), width - size)
    y = min(max(0, round((top + bottom - size) / 2)), height - size)
    return f"[{x}, {y}, {size}]"


if __name__ == "__main__":
    main()
