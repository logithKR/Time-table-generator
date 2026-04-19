import os
import re

backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
modules_to_prefix = ['config', 'controllers', 'core', 'logging', 'middleware', 'models', 'repositories', 'routes', 'schemas', 'services', 'utils']

def update_imports(file_path):
    # Try reading as UTF-8, fallback to UTF-16 if Powershell corrupted it
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        with open(file_path, 'r', encoding='utf-16') as f:
            content = f.read()

    original = content
    
    for mod in modules_to_prefix:
        content = re.sub(fr'^from {mod}(\s+|\.)', fr'from backend.{mod}\1', content, flags=re.MULTILINE)
        content = re.sub(fr'^import {mod}(\s+|$)', fr'import backend.{mod}\1', content, flags=re.MULTILINE)

    if content != original:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file_path}")

for root, _, files in os.walk(backend_dir):
    for file in files:
        if file.endswith('.py'):
            update_imports(os.path.join(root, file))

print("DONE")
