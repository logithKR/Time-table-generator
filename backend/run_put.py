import urllib.request
import json

url_safe = 'http://127.0.0.1:8000/courses/22CSH04%2F22CTH04%2F22ISH28%2F22ITH04%2F22CBH04'
req = urllib.request.Request(
    url_safe,
    method='PUT',
    data=b'{"course_name": "test", "department_code": "CSE", "semester": 1}',
    headers={'Content-Type': 'application/json'}
)

try:
    with urllib.request.urlopen(req) as response:
        print("Success:", response.read().decode())
except Exception as e:
    print("Error:", e)
    if hasattr(e, 'read'):
        print("Body:", e.read().decode())
