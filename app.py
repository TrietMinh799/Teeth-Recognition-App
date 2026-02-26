from flask import Flask, request, render_template, send_file
from werkzeug.utils import secure_filename
import io
from ultralytics import YOLO
import numpy as np
from PIL import Image
import cv2
import os

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads/'


class Detection:
    def __init__(self):
        self.model = YOLO(r"object_detection\Dental_model.pt")

    def predict(self, img, classes=[], conf=0.5):
        if classes:
            results = self.model.predict(img, classes=classes, conf=conf)
        else:
            results = self.model.predict(img, conf=conf)

        return results 
    def predict_and_detect(self, img, classes=[], conf=0.5, rectangle_thickness=2, text_thickness=3):
        results = self.predict(img, classes, conf=conf)
        for result in results:
            for box in result.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                conf = box.conf[0]
                cls = int(box.cls[0])
                label = f"{self.model.names[cls]} {conf:.2f}"
                cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), rectangle_thickness)
                cv2.putText(img, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 255, 0), text_thickness)
        return img, results

    def detect_from_image(self, image, confidence):
        result_img, _ = self.predict_and_detect(image, classes=[], conf=confidence)
        return result_img


detection = Detection()


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/object-detection/', methods=['POST'])
def apply_detection():
    if 'image' not in request.files:
        return 'No file part'

    file = request.files['image']
    if file.filename == '':
        return 'No selected file'

    if file:
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        confidence = request.form.get('confidence', default=0.5, type=float)
        img = Image.open(file_path).convert("RGB")
        img = np.array(img)
        img = detection.detect_from_image(img, confidence)
        output = Image.fromarray(img)

        buf = io.BytesIO()
        output.save(buf, format="PNG")
        buf.seek(0)

        os.remove(file_path)
        return send_file(buf, mimetype='image/png')

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8000)
