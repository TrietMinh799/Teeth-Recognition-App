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
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}


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
        self, img, classes=[], conf=0.5, rectangle_thickness=2, text_thickness=3
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
                cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), rectangle_thickness)
                cv2.putText(
                    img,
                    label,
                    (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    2,
                    (0, 255, 0),
                    text_thickness,
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
    if file.filename is None or file.filename == "":
        flash("No file part")
        return redirect(request.url)

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(file_path)

        confidence = request.form.get("confidence", default=0.5, type=float)
        img = Image.open(file_path).convert("RGB")
        img = np.array(img)
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
