import mysql.connector
import sqlite3
from mysql.connector import Error

def transfer_tables():
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

        # 🔹 Connect to SQLite (local file)
        sqlite_conn = sqlite3.connect("cms_data.db")
        sqlite_cursor = sqlite_conn.cursor()

        # =========================================
        # 📌 1. student_courses table
        # =========================================
        print("Fetching student_courses...")

        mysql_cursor.execute("SELECT * FROM student_courses;")
        student_courses = mysql_cursor.fetchall()

        if student_courses:
            columns = student_courses[0].keys()

            # Create table dynamically
            sqlite_cursor.execute(f"""
                CREATE TABLE IF NOT EXISTS student_courses (
                    {', '.join([col + ' TEXT' for col in columns])}
                );
            """)

            # Insert data
            for row in student_courses:
                sqlite_cursor.execute(f"""
                    INSERT INTO student_courses ({', '.join(columns)})
                    VALUES ({', '.join(['?' for _ in columns])});
                """, tuple(str(row[col]) for col in columns))

            print(f"✅ student_courses saved ({len(student_courses)} rows)")

        # =========================================
        # 📌 2. learning_modes table
        # =========================================
        print("Fetching learning_modes...")

        mysql_cursor.execute("SELECT * FROM learning_modes;")
        learning_modes = mysql_cursor.fetchall()

        if learning_modes:
            columns = learning_modes[0].keys()

            # Create table dynamically
            sqlite_cursor.execute(f"""
                CREATE TABLE IF NOT EXISTS learning_modes (
                    {', '.join([col + ' TEXT' for col in columns])}
                );
            """)

            # Insert data
            for row in learning_modes:
                sqlite_cursor.execute(f"""
                    INSERT INTO learning_modes ({', '.join(columns)})
                    VALUES ({', '.join(['?' for _ in columns])});
                """, tuple(str(row[col]) for col in columns))

            print(f"✅ learning_modes saved ({len(learning_modes)} rows)")

        # 🔹 Commit changes
        sqlite_conn.commit()
        print("\n🎉 All data saved to cms_data.db")

    except Error as e:
        print(f"MySQL Error: {e}")

    finally:
        if mysql_conn.is_connected():
            mysql_cursor.close()
            mysql_conn.close()

        sqlite_conn.close()


if __name__ == "__main__":
    transfer_tables()