import mysql.connector
from mysql.connector import Error

def check_my_permissions():
    try:
        # Connection details from your document
        connection = mysql.connector.connect(
            host='10.10.12.88',
            user='aca_dev1',
            password='acadev1@!ogin123@!',
            port=3306,
            database='cms'
        )

        if connection.is_connected():
            cursor = connection.cursor()

            # 1. Check overall Grants (Permissions)
            print("--- YOUR GRANTED PRIVILEGES ---")
            cursor.execute("SHOW GRANTS;")
            grants = cursor.fetchall()
            for grant in grants:
                print(grant[0])

            print("\n" + "="*40 + "\n")

            # 2. Check accessible tables in the 'cms' database
            print("--- ACCESSIBLE TABLES IN 'cms' ---")
            cursor.execute("SHOW TABLES;")
            tables = cursor.fetchall()
            
            if not tables:
                print("No tables found or access is restricted.")
            else:
                for (table_name,) in tables:
                    print(f"- {table_name}")

    except Error as e:
        print(f"Error: {e}")
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()
            print("\nConnection closed.")

if __name__ == "__main__":
    check_my_permissions()