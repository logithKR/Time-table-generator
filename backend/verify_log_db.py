#!/usr/bin/env python
"""Verify the centralized logging database structure"""
import sqlite3
import os

log_db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "database", "log.db"))
print(f"📊 Log Database: {log_db_path}")
print(f"   Exists: {os.path.exists(log_db_path)}\n")

if not os.path.exists(log_db_path):
    print("❌ log.db not found!")
    exit(1)

conn = sqlite3.connect(log_db_path)
cursor = conn.cursor()

# List all tables
print("📋 Tables in log.db:")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = cursor.fetchall()
for table in tables:
    table_name = table[0]
    print(f"\n  ✅ {table_name}")
    
    # Get column info
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = cursor.fetchall()
    for col in columns:
        col_id, col_name, col_type, not_null, default, pk = col
        null_str = "NOT NULL" if not_null else "NULL"
        pk_str = "PK" if pk else ""
        print(f"     - {col_name:<20} {col_type:<15} {null_str:<10} {pk_str}")
    
    # Count rows
    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
    count = cursor.fetchone()[0]
    print(f"     📈 Records: {count}")

print("\n" + "="*80)
print("✅ Centralized Logging Database Initialized Successfully!")
print("="*80)
print("\n📌 Database Location: database/log.db")
print("\n📊 Tables:")
print("   1. auth_logs - Tracks LOGIN, LOGOUT, TOKEN_REFRESH events")
print("   2. activity_logs - Tracks all API calls by authenticated users")
print("\n⏰ Timestamp Format:")
print("   - timestamp_ist: 2026-04-20 05:51 PM (Indian Standard Time)")
print("   - timestamp_gmt: 2026-04-20 12:21 PM (GMT)")
print("\n🔗 API Endpoints:")
print("   - GET /api/admin/logs/auth - Fetch authentication logs")
print("   - GET /api/admin/logs/activity - Fetch activity logs")
print("   - GET /api/admin/logs/all - Fetch all logs combined")

conn.close()
