from ultralytics import YOLO

def main():
    model = YOLO(r"Models/Dental_model.pt")
    print(model.names)
    results = model.predict(r"Tests/input/test_217.png", verbose = False, conf = .5)
    for result in results:
        print(result.boxes.cls)
        result.show()

if __name__ == "__main__":
    main()