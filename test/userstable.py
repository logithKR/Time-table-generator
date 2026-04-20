import mysql.connector
import sqlite3
from mysql.connector import Error

def transfer_students():
    try:
        # 🔹 Connect to MySQL
        mysql_conn = mysql.connector.connect(
            host='10.10.12.88',
            user='aca_dev1',
            password='aca@!ogin',
            port=3309,
            database='cms'
        )

        mysql_cursor = mysql_conn.cursor(dictionary=True)

        query = """
        SELECT id, student_name, register_no, enrollment_no, department_id, year, status 
        FROM students;
        """
        mysql_cursor.execute(query)
        records = mysql_cursor.fetchall()

        print(f"Fetched {len(records)} records from MySQL")

        # 🔹 Create SQLite DB in current folder
        sqlite_conn = sqlite3.connect("students.db")
        sqlite_cursor = sqlite_conn.cursor()

        # 🔹 Create table
        sqlite_cursor.execute("""
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY,
            student_name TEXT,
            register_no TEXT,
            enrollment_no TEXT,
            department_id INTEGER,
            year INTEGER,
            status TEXT
        );
        """)

        # 🔹 Insert data
        for row in records:
            sqlite_cursor.execute("""
            INSERT OR REPLACE INTO students 
            (id, student_name, register_no, enrollment_no, department_id, year, status)
            VALUES (?, ?, ?, ?, ?, ?, ?);
            """, (
                row['id'],
                row['student_name'],
                row['register_no'],
                row['enrollment_no'],
                row['department_id'],
                row['year'],
                row['status']
            ))

        sqlite_conn.commit()

        print("✅ Data saved to students.db")

    except Error as e:
        print(f"MySQL Error: {e}")

    finally:
        if mysql_conn.is_connected():
            mysql_cursor.close()
            mysql_conn.close()

        sqlite_conn.close()

if __name__ == "__main__":
    transfer_students()