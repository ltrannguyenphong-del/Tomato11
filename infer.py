import sys, os, json
import numpy as np, onnxruntime as ort
from PIL import Image, ImageOps

cfg = json.load(open("config.json")); classes = json.load(open("classes.json"))
sess = ort.InferenceSession("model.onnx")
NOT = cfg["not_tomato_index"]
MIN_CONF, MIN_MARGIN = 0.60, 0.15   # chỉnh sau khi có số liệu thật

def predict(path):
    img = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    img = ImageOps.fit(img, (cfg["img_size"],) * 2, Image.BILINEAR)
    x = (np.asarray(img, np.float32) / 255 - np.array(cfg["mean"], np.float32)) \
        / np.array(cfg["std"], np.float32)
    x = x.transpose(2, 0, 1)[None].astype(np.float32)
    lg = sess.run(None, {"input": x})[0][0]
    p = np.exp(lg - lg.max()); return p / p.sum()

def decide(p):
    o = p.argsort()[::-1]; top, sec = p[o[0]], p[o[1]]
    if o[0] == NOT:                         return "Không phải lá cà chua", top
    if top < MIN_CONF or top - sec < MIN_MARGIN: return "Không chắc, cần chụp lại", top
    return classes[o[0]], top

if __name__ == "__main__":
    paths = []
    for a in sys.argv[1:]:
        if os.path.isdir(a):
            paths += [os.path.join(a, f) for f in sorted(os.listdir(a))
                      if f.lower().endswith((".jpg", ".jpeg", ".png"))]
        else: paths.append(a)
    for path in paths:
        p = predict(path); label, conf = decide(p)
        top3 = ", ".join(f"{classes[i]} {p[i]:.0%}" for i in p.argsort()[::-1][:3])
        print(f"{os.path.basename(path):30s} -> {label} ({conf:.0%}) | {top3}")