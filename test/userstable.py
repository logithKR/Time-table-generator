import mysql.connector
from mysql.connector import Error

def fetch_users():
    connection = None
    try:
        # Establish connection using your provided credentials
        connection = mysql.connector.connect(
            host='10.10.12.88',
            user='aca_dev1',
            password='aca@!ogin',
            port=3309,
            database='cms'
        )

        if connection.is_connected():
            cursor = connection.cursor(dictionary=True) # Using dictionary=True for easier reading
            
            # CRITICAL: We must specify only the columns you have GRANT access to
            query = "SELECT id, student_name, register_no, enrollment_no, department_id, year, status FROM students;"
            
            cursor.execute(query)
            records = cursor.fetchall()

            print(f"Total records found: {len(records)}")
            print("-" * 50)
            
            for row in records:
                print(f"ID: {row['id']} | User: {row['username']} | Email: {row['email']} | Role: {row['role']}")

    except Error as e:
        print(f"Error while connecting to MySQL: {e}")
    
    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()
            print("-" * 50)
            print("MySQL connection is closed.")

if __name__ == "__main__":
    fetch_users()