import multiprocessing

# Bind to 0.0.0.0 on port 8000
bind = "0.0.0.0:8000"

# Uvicorn workers are required for running FastAPI asynchronously
worker_class = "uvicorn.workers.UvicornWorker"

# Dynamically set worker count based on available CPU cores.
# 2 workers per core + 1 is typical for high concurrency scenarios.
workers = multiprocessing.cpu_count() * 2 + 1

# Automatically restart workers if they consume more than ~1000 requests to prevent memory leaks
max_requests = 1000
max_requests_jitter = 50

# Worker timeouts
timeout = 120
keepalive = 5

# Logging
loglevel = "info"
accesslog = "-"
errorlog = "-"
