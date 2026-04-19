"""
Sync Engine for User DB and RBAC.
Pulls users from remote CMS MySQL and stores them in local SQLite.
Included manually injected developer records.
"""
import os
import sqlite3
import pymysql

try:
    from dotenv import load_dotenv
    # Allow loading from .env.production as priority if present, else .env
    env_prod = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env.production')
    if os.path.exists(env_prod):
         load_dotenv(env_prod)
    else:
         load_dotenv()
except ImportError:
    pass

def sync_users():
    host = os.getenv("CMS_DB_HOST")
    user = os.getenv("CMS_DB_USER")
    password = os.getenv("CMS_DB_PASS")
    port_str = os.getenv("CMS_DB_PORT", "3309")
    port = int(port_str) if port_str else 3309
    database = os.getenv("CMS_DB_NAME", "cms")
    local_db_path = os.getenv("LOCAL_DB_PATH", "./users.db")

    if not all([host, user, password, database]):
        print("Sync Engine: Missing CMS DB credentials in environment. Skipping sync.")
        return

    print(f"Sync Engine: Connecting to remote MySQL Database at {host}:{port}...")
    try:
        mysql_conn = pymysql.connect(
            host=host,
            user=user,
            password=password,
            port=port,
            database=database,
            cursorclass=pymysql.cursors.DictCursor
        )
    except Exception as e:
        print(f"Sync Engine ❌ Failed to connect to MySQL: {e}")
        return

    print(f"Sync Engine: Connecting to local SQLite Database at {local_db_path}...")
    sqlite_conn = sqlite3.connect(local_db_path)
    sqlite_cursor = sqlite_conn.cursor()

    try:
        # Create table if not exists. We might not insert ID manually for the dev records,
        # so using id INTEGER PRIMARY KEY without restricting it to be the exact CMS id format
        # but wait, CMS id is explicit. Wait, `INSERT OR REPLACE` might overwrite if email is UNIQUE.
        sqlite_cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                username TEXT,
                email TEXT UNIQUE,
                role TEXT,
                is_active BOOLEAN
            )
        ''')

        # Fetch from MySQL
        with mysql_conn.cursor() as mysql_cursor:
            mysql_cursor.execute("SELECT id, username, email, role, is_active FROM users")
            remote_users = mysql_cursor.fetchall()

        # Clear existing
        sqlite_cursor.execute("DELETE FROM users")

        # Insert remote users
        for row in remote_users:
            sqlite_cursor.execute('''
                INSERT INTO users (id, username, email, role, is_active)
                VALUES (?, ?, ?, ?, ?)
            ''', (row['id'], row['username'], row['email'], row['role'], row['is_active']))
            
        print(f"Sync Engine: Automatically synced {len(remote_users)} users from remote CMS.")

        # Manual Developer Injection (ID left autoincremented or inferred)
        dev_records = [
            ("Ramesh (Dev)", "ramesh.cd23@bitsathy.ac.in", "teacher", True),
            ("Logith (Dev)", "logithkumar.cd23@bitsathy.ac.in", "teacher", True)
        ]
        
        # In SQLite, INSERT OR REPLACE depends on UNIQUE constraint. 
        # email is UNIQUE so it will replace if exists. But wait, if it replaces it nullifies the explicitly provided ID earlier 
        # if they already have an ID from MySQL. Better is to just DO NOTHING if they already exist, 
        # or do we want to force them to be 'teacher'? Yes.
        for index, dev in enumerate(dev_records):
            # assign arbitrarily negative IDs or large IDs to avoid colliding with CMS IDs
            dev_id = -1 * (index + 1)
            # check if email exists
            sqlite_cursor.execute("SELECT id FROM users WHERE email=?", (dev[1],))
            res = sqlite_cursor.fetchone()
            if res:
                sqlite_cursor.execute('''
                    UPDATE users SET role=?, is_active=?, username=? WHERE email=?
                ''', (dev[2], dev[3], dev[0], dev[1]))
            else:
                sqlite_cursor.execute('''
                    INSERT INTO users (id, username, email, role, is_active)
                    VALUES (?, ?, ?, ?, ?)
                ''', (dev_id, dev[0], dev[1], dev[2], dev[3]))
            
        print(f"Sync Engine: Injected {len(dev_records)} explicit developer records.")

        sqlite_conn.commit()
        print("Sync Engine ✅ Synchronization complete.")

    except Exception as e:
        print(f"Sync Engine ❌ Error occurred during sync: {e}")
        sqlite_conn.rollback()
    finally:
        mysql_conn.close()
        sqlite_conn.close()

if __name__ == "__main__":
    sync_users()
