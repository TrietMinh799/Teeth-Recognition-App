# Introduction

Các công nghệ sử dụng trong dự án:
- FrontEnd
    - Sử dụng thuần html css javascript để làm giao diện
    - Flask, đóng vai trò là connect giữa frontend và backend

- Backend
    - Sử dụng Yolo từ thư viện Ultralytics để xử lý hình ảnh
    - Sử dụng model lấy từ [đây](https://huggingface.co/spaces/alibidaran/Dental_Analysis/tree/main)

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
