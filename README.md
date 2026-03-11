# Introduction

Các công nghệ sử dụng trong dự án:
- FrontEnd
    - Sử dụng thuần html css javascript để làm giao diện
    - Sử dụng thư viện MapLibre GL JS, OpenStreetMap Data để hiển thị bản đồ
- Backend
    - Flask
    - Sử dụng thư viện Ultralytics để xử lý hình ảnh
    - Sử dụng model lấy từ [đây](https://SShuggingface.co/spaces/alibidaran/Dental_Analysis/tree/main)

# Install

Bước đầu tiên là

```
git clone https://github.com/TrietMinh799/Teeth-Recognition-App.git
```

Bước tiếp theo là vào thư mục project rồi chuột phải để mở terminal

Tiếp theo, ta sẽ tải các thư viện cần thiết

```python
pip install -r requirements.txt
```

Sau khi đã tải xong, ta chạy bằng cách

```python
python app.py
```

### Lưu ý

- Chắc chắn là đang sử dụng python bản mới nhất
- Dùng venv thì thêm flag **--without-scm-ignore-files** để k overwrite `.gitignore`. Ví dụ: 
`python -m venv ten_project --without-scm-ignore-files` Thay *ten_project* thành tên dự án.

# Cách app hoạt động
Sau khi đã chạy được app
1. Người dùng sẽ tải ảnh răng lên và bấm vào nút "Upload", sau đó sẽ gửi về backend.
2. Backend sẽ nhận được ảnh và sử dụng Yolo để xử lý hình ảnh, sau đó gửi kết quả về frontend.
3. Frontend sẽ nhận được kết quả và hiển thị lên màn hình.
