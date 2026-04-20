"""Verify the FastAPI app loads and list admin routes."""
import sys
sys.path.insert(0, '.')
from main import app

print("OK - App loaded successfully!")
print("")
print("Admin routes:")
for route in app.routes:
    if hasattr(route, 'path') and '/admin' in route.path:
        methods = ','.join(route.methods) if hasattr(route, 'methods') else '?'
        print(f"  {route.path}  [{methods}]")
