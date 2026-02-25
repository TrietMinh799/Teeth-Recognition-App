from ultralytics import YOLO

def main():
    model = YOLO(r"object_detection\Dental_model.pt")
    print(model.names)
    results = model.predict(r"example_inputs\test_0.png", verbose = False, conf = .5)
    for result in results:
        print(result.boxes.cls)
        result.show()

if __name__ == "__main__":
    main()