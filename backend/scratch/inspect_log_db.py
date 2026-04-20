import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'database', 'log.db')
db_path = os.path.abspath(db_path)
print(f"DB Path: {db_path}")
print(f"Exists: {os.path.exists(db_path)}")
print(f"Size: {os.path.getsize(db_path)} bytes")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# List tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print(f"\nTables: {tables}")

for (table_name,) in tables:
    print(f"\n=== {table_name} ===")
    cursor.execute(f"PRAGMA table_info({table_name})")
    cols = cursor.fetchall()
    print(f"Columns: {cols}")
    
    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
    count = cursor.fetchone()[0]
    print(f"Row count: {count}")
    
    if count > 0:
        cursor.execute(f"SELECT * FROM {table_name} LIMIT 3")
        rows = cursor.fetchall()
        for row in rows:
            print(f"  Sample: {row}")

conn.close()
