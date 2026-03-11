import os
import uuid

import cv2
import jsonpickle
import numpy as np
from flask import (
    Flask,
    flash,
    jsonify,
    render_template,
    request,
    send_from_directory,
    url_for,
)
from PIL import Image
from ultralytics import YOLO
from werkzeug.utils import redirect, secure_filename

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = "uploads/"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg","webp",}

# Load model
class Detection:
    """
    Handles object detection using a pre-trained YOLO model.
    """

    def __init__(self):
        """
        Initializes the Detection class by loading the YOLO model.
        The model is loaded from 'models/Dental_model.pt'.
        """
        self.model = YOLO(r"models\Dental_model.pt")
        print(self.model.names)

    def predict(self, img, classes=[], conf=0.5):
        """
        Performs object detection on the provided image.

        Args:
            img: The input image (numpy array or path).
            classes (list): List of class IDs to filter detections. If empty, all classes are detected.
            conf (float): Confidence threshold for detections (default 0.5).

        Returns:
            list: A list of result objects from the YOLO model.
        """
        if classes:
            results = self.model.predict(img, classes=classes, conf=conf)
        else:
            results = self.model.predict(img, conf=conf)

        return results

    def predict_and_detect(
        self, img, classes=[], conf=0.5, rectangle_thickness=1, text_thickness=1
    ):
        """
        Performs detection and draws bounding boxes/labels on the image.

        Args:
            img: The input image.
            classes (list): Classes to detect.
            conf (float): Confidence threshold.
            rectangle_thickness (int): Thickness of the bounding box lines.
            text_thickness (int): Thickness of the label text.

        Returns:
            tuple: (annotated_image, first_result_object)
        """
        results = self.predict(img, classes, conf=conf)
        for result in results:
            for box in result.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                conf = box.conf[0]
                cls = int(box.cls[0])
                label = f"{self.model.names[cls]} {conf:.2f}"
                img_h, img_w, _ = img.shape
                colour_codes = {
                    0: (0, 0, 0),
                    1: (0, 0, 128),
                    2: (0, 0, 255),
                    3: (0, 128, 0),
                    4: (0, 128, 128),
                    5: (0, 128, 255),
                    6: (0, 255, 0),
                    7: (0, 255, 128),
                    8: (0, 255, 255),
                    9: (128, 0, 0),
                    10: (128, 0, 128),
                    11: (128, 0, 255),
                    12: (128, 128, 0),
                    13: (128, 128, 128),
                    14: (128, 128, 255),
                    15: (128, 255, 0),
                    16: (128, 255, 128),
                    17: (128, 255, 255),
                    18: (255, 0, 0),
                    19: (255, 0, 128),
                    20: (255, 0, 255),
                    21: (255, 128, 0),
                    22: (255, 128, 128),
                    23: (255, 128, 255),
                    24: (255, 255, 0),
                    25: (255, 255, 128),
                    26: (255, 255, 255),
                    27: (64, 64, 192),
                    28: (64, 192, 64),
                    29: (192, 64, 64)
                }
                cv2.rectangle(img, (x1, y1), (x2, y2), colour_codes[cls], int(rectangle_thickness * img_h * 0.007))
                # text_size, _ =cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.4, text_thickness)
                # text_w, text_h= text_size
                cv2.putText(
                    img,
                    label,
                    (int(x1 - len(label)/2 * img_w * 0.01), int(y1 - img_h * 0.01)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    (img_h) * 0.002,
                    colour_codes[cls],   
                    int(text_thickness * img_h * 0.007),
                )
        return img, results[0]

    def detect_from_image(self, image, confidence):
        """
        Convenience wrapper for detecting objects in an image with a specific confidence.

        Args:
            image: Input image.
            confidence (float): Confidence threshold.

        Returns:
            tuple: (annotated_image, result_object)
        """
        result_img, result = self.predict_and_detect(image, classes=[], conf=confidence)
        return result_img, result


detection = Detection()


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/object-detection/", methods=["POST"])
def apply_detection():
    if "image" not in request.files:
        flash("No file part")
        return redirect(request.url)

    file = request.files["image"]
    if file.filename == "" or file.filename == "":
        flash("No file part")
        return redirect(request.url)

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(file_path)

        confidence = request.form.get("confidence", default=0.5, type=float)
        img = Image.open(file_path).convert("RGB")
        img = np.array(img, dtype = np.uint8)
        img, result = detection.detect_from_image(img, confidence)
        output = Image.fromarray(img)

        processed_name = f"processed_{uuid.uuid4().hex}.png"
        processed_path = os.path.join(app.config["UPLOAD_FOLDER"], processed_name)
        output.save(processed_path)

        os.remove(file_path)

        image_url = url_for("uploaded_file", filename=processed_name, _external=True)
        return jsonify({"image_url": image_url, "classes": result.boxes.cls.tolist()})


@app.route("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)


@app.route("/data.json")
def data():
    with open("data.json") as f:
        data = jsonpickle.decode(f.read())
    return jsonify(data)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
