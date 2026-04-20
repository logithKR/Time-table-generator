# Centralized Logging System Documentation

## Overview

A production-grade centralized logging system for the FastAPI backend that tracks all authentication events and user activity in a separate `log.db` SQLite database.

---

## Database Structure

### Location

```
database/log.db
```

### Tables

#### 1. `auth_logs` - Authentication Events

Records user login, logout, token refresh, and failed login attempts.

| Column          | Type         | Description                                      |
| --------------- | ------------ | ------------------------------------------------ |
| `id`            | INTEGER      | Primary Key                                      |
| `user_id`       | VARCHAR(255) | Internal user ID (optional)                      |
| `email`         | VARCHAR(255) | User's email address (indexed)                   |
| `event_type`    | VARCHAR(50)  | LOGIN, LOGOUT, TOKEN_REFRESH, LOGIN_FAILED       |
| `ip_address`    | VARCHAR(45)  | Client IP address (IPv4/IPv6)                    |
| `timestamp_ist` | VARCHAR(100) | Time in IST format (e.g., "2026-04-20 11:37 AM") |
| `timestamp_gmt` | VARCHAR(100) | Time in GMT format (e.g., "2026-04-20 06:07 AM") |
| `user_agent`    | VARCHAR(512) | Browser/client information                       |

**Example Record:**

```
id: 1
email: ps@bitsathy.ac.in
event_type: LOGIN
timestamp_ist: 2026-04-20 11:37 AM
timestamp_gmt: 2026-04-20 06:07 AM
ip_address: 127.0.0.1
```

#### 2. `activity_logs` - User Activity

Records all HTTP requests made by authenticated users.

| Column          | Type         | Description                                                           |
| --------------- | ------------ | --------------------------------------------------------------------- |
| `id`            | INTEGER      | Primary Key                                                           |
| `user_id`       | VARCHAR(255) | Internal user ID (optional)                                           |
| `email`         | VARCHAR(255) | User's email address (indexed, nullable for unauthenticated requests) |
| `action`        | VARCHAR(255) | API endpoint path (e.g., "/api/departments")                          |
| `method`        | VARCHAR(10)  | HTTP method: GET, POST, PUT, DELETE, PATCH                            |
| `status_code`   | INTEGER      | HTTP response code (200, 404, 500, etc.)                              |
| `timestamp_ist` | VARCHAR(100) | Time in IST format                                                    |
| `timestamp_gmt` | VARCHAR(100) | Time in GMT format                                                    |

**Example Record:**

```
id: 23
email: ramesh.cd23@bitsathy.ac.in
action: /api/departments
method: GET
status_code: 200
timestamp_ist: 2026-04-20 11:38 AM
timestamp_gmt: 2026-04-20 06:08 AM
```

---

## Logging Functions

### Authentication Logging (`utils/auth_logging.py`)

#### `log_login(email, ip_address, user_agent, user_id)`

Logs a successful user login.

```python
from utils.auth_logging import log_login

log_login(
    email="user@example.com",
    ip_address="192.168.1.1",
    user_agent="Mozilla/5.0...",
    user_id="optional_user_id"
)
```

#### `log_logout(email, ip_address, user_agent, user_id)`

Logs a user logout.

```python
from utils.auth_logging import log_logout

log_logout(
    email="user@example.com",
    ip_address="192.168.1.1"
)
```

#### `log_token_refresh(email, ip_address, user_agent, user_id)`

Logs token refresh events.

```python
from utils.auth_logging import log_token_refresh

log_token_refresh(
    email="user@example.com",
    ip_address="192.168.1.1"
)
```

#### `log_failed_login(email, reason, ip_address, user_agent)`

Logs failed login attempts.

```python
from utils.auth_logging import log_failed_login

log_failed_login(
    email="user@example.com",
    reason="Invalid password",
    ip_address="192.168.1.1"
)
```

---

## Activity Logging

### Automatic Activity Logging Middleware

The `ActivityLoggingMiddleware` automatically logs all HTTP requests made by authenticated users. **No manual integration needed!**

**Features:**

- Automatically extracts user email from JWT Bearer token
- Logs HTTP method, endpoint path, and response status code
- Skips logging for public/health endpoints
- Runs asynchronously (doesn't block response)

**Logged Endpoints Example:**

- ✅ `GET /api/departments` → (200)
- ✅ `POST /api/timetable/generate` → (202)
- ❌ `/health` → (skipped)
- ❌ `/docs` → (skipped, OpenAPI)

---

## Admin API Endpoints

All endpoints require admin authentication (Bearer token from `/api/admin/login`).

### Get Authentication Logs

```
GET /api/admin/logs/auth
```

**Query Parameters:**

- `email` (optional): Filter by user email
- `event_type` (optional): Filter by event type (LOGIN, LOGOUT, etc.)
- `page` (default: 1): Page number
- `limit` (default: 50, max: 500): Items per page

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "user_id": null,
      "email": "ps@bitsathy.ac.in",
      "event_type": "LOGIN",
      "ip_address": "127.0.0.1",
      "timestamp_ist": "2026-04-20 11:37 AM",
      "timestamp_gmt": "2026-04-20 06:07 AM",
      "user_agent": "Mozilla/5.0..."
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 50,
  "total_pages": 1
}
```

### Get Activity Logs

```
GET /api/admin/logs/activity
```

**Query Parameters:**

- `email` (optional): Filter by user email
- `action` (optional): Filter by API endpoint (e.g., "/api/departments")
- `method` (optional): Filter by HTTP method (GET, POST, etc.)
- `status_code` (optional): Filter by HTTP status code
- `page` (default: 1): Page number
- `limit` (default: 50, max: 500): Items per page

**Response:**

```json
{
  "data": [
    {
      "id": 23,
      "user_id": null,
      "email": "ramesh.cd23@bitsathy.ac.in",
      "action": "/api/departments",
      "method": "GET",
      "status_code": 200,
      "timestamp_ist": "2026-04-20 11:38 AM",
      "timestamp_gmt": "2026-04-20 06:08 AM"
    }
  ],
  "total": 156,
  "page": 1,
  "limit": 50,
  "total_pages": 4
}
```

### Get All Logs Combined

```
GET /api/admin/logs/all
```

**Query Parameters:**

- `log_type` (default: "all"): Filter by type - "auth", "activity", or "all"
- `email` (optional): Filter by user email
- `page` (default: 1): Page number
- `limit` (default: 50, max: 500): Items per page

---

## Time Format

All timestamps are stored in **two readable formats** for easy understanding:

### IST (Indian Standard Time - UTC+5:30)

```
2026-04-20 11:37 AM
```

### GMT (UTC)

```
2026-04-20 06:07 AM
```

**Technology:** `pytz` library for accurate timezone conversion.

---

## Integration Points

### 1. Authentication Controller (`controllers/auth_controller.py`)

Automatically logs all login/logout events:

- `POST /api/auth/login` → logs to `auth_logs` as "LOGIN"
- `POST /api/auth/logout` → logs to `auth_logs` as "LOGOUT"
- `POST /api/auth/refresh` → logs to `auth_logs` as "TOKEN_REFRESH"

### 2. Admin Service (`services/admin_service.py`)

Admin login is also logged:

- `POST /api/admin/login` → logs to `auth_logs` as "LOGIN" (with admin flag)

### 3. Middleware (`middleware/activity_logging_middleware.py`)

Automatically logs all authenticated user activity:

- ✅ Extracts user email from JWT token
- ✅ Records HTTP method and endpoint
- ✅ Records response status code
- ✅ Skips public endpoints (/health, /docs, etc.)

---

## Database Initialization

The `log.db` database is **automatically created on first backend startup**:

```
[STARTUP] ✅ All database tables initialized (college_scheduler.db and log.db)
```

To manually initialize:

```bash
python -c "from utils.log_database import log_engine, LoggingBase; from models.log_models import AuthLog, ActivityLog; LoggingBase.metadata.create_all(bind=log_engine)"
```

---

## Verification

### Check Database Structure

```bash
python verify_log_db.py
```

### Test Logging System

```bash
python test_logging_system.py
```

---

## Admin Dashboard Integration

The React Admin Dashboard at `/admin` can now display:

1. **Authentication Logs Tab** - Shows all login/logout events
   - User email, event type, timestamp, IP address
   - Filterable by email or event type

2. **Activity Logs Tab** - Shows all API calls
   - User email, endpoint, HTTP method, response code
   - Filterable by email, endpoint, or method

### Frontend API Calls

```javascript
// Fetch auth logs (requires admin token)
GET /api/admin/logs/auth?page=1&limit=50

// Fetch activity logs (requires admin token)
GET /api/admin/logs/activity?page=1&limit=50

// Fetch combined logs
GET /api/admin/logs/all?log_type=auth&page=1&limit=50
```

---

## Security Features

✅ **JSon Web Tokens (JWT)** - All admin endpoints require valid JWT  
✅ **Role-Based Access** - Only admins can view logs (verified in `middleware/admin_guard.py`)  
✅ **IP Address Tracking** - Client IP captured for security audits  
✅ **User Agent Logging** - Browser/client information stored  
✅ **Separate Database** - Logs in isolated `log.db` database  
✅ **Indexed Queries** - Fast log searches (indexes on email, timestamp, action)

---

## Performance Considerations

- **Activity Logging Middleware** runs asynchronously (non-blocking)
- **Indexes** on frequently queried columns (email, timestamp, action)
- **Pagination** supported (default 50, max 500 per page)
- **SQLite** suitable for small to medium deployments

For high-traffic production, consider migrating to PostgreSQL or adding a background job queue.

---

## Troubleshooting

### Logs Not Appearing?

1. Check backend is running: `http://localhost:8000/health`
2. Verify admin token is valid
3. Check `log.db` exists in `database/` folder
4. Inspect database: `python check_logs_db.py`

### Wrong Timestamps?

- IST/GMT conversion handled automatically by `pytz`
- Check system timezone is correct
- Format is readable: "YYYY-MM-DD HH:MM AM/PM"

### Query Errors?

- Use query parameters correctly: `?email=user@example.com&page=1&limit=50`
- Max limit is 500 items per page
- Status code filter takes integer: `?status_code=200`

---

## Files Created/Modified

### New Files

- `utils/log_database.py` - Separate SQLAlchemy engine for log.db
- `models/log_models.py` - AuthLog and ActivityLog models
- `utils/auth_logging.py` - Authentication logging functions
- `utils/activity_logging.py` - Activity logging utilities
- `middleware/activity_logging_middleware.py` - Automatic activity logging middleware
- `controllers/logging_controller.py` - Admin logging API endpoints

### Modified Files

- `main.py` - Added lifespan for log.db initialization, added new middleware and routes
- `controllers/auth_controller.py` - Integrated auth logging functions
- `services/admin_service.py` - Added admin login logging
- `frontend/src/components/AdminDashboard.jsx` - Changed default log type to "auth"

### Test Files

- `backend/check_logs_db.py` - Verify database structure
- `backend/verify_log_db.py` - Display database statistics
- `backend/test_logging_system.py` - End-to-end system test
- `backend/test_admin_api.py` - Test admin API endpoints

---

## Summary

Your centralized logging system is **production-ready** with:

✅ Separate `log.db` database in `database/` folder  
✅ Two tables: `auth_logs` and `activity_logs`  
✅ Dual timestamp format (IST and GMT) with readable AM/PM format  
✅ Automatic activity logging via middleware  
✅ Admin-only API endpoints with filtering and pagination  
✅ Security features (JWT, role-based access, IP tracking)  
✅ Fast queries with database indexes  
✅ Zero breaking changes to existing code

All login/logout events and API activity are now traceable in the Admin Dashboard!
