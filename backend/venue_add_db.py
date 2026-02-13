import pandas as pd
import sqlite3
import os

# 1. File Paths
excel_file = 'campus_data.xlsx'
db_file = 'college_scheduler.db'

# Check if files exist
if not os.path.exists(excel_file):
    print(f"Error: '{excel_file}' not found.")
    exit()

# 2. Read the Excel file
print("Reading Excel file...")
try:
    df = pd.read_excel(excel_file)
    print(f"Successfully read {len(df)} rows.")
except Exception as e:
    print(f"Error reading Excel: {e}")
    exit()

# 3. Connect to the Database
print("Connecting to database...")
conn = sqlite3.connect(db_file)
cursor = conn.cursor()

# 4. Create the Table (Optional but recommended to ensure types)
# We'll call the table 'campus_locations'
table_name = 'campus_locations'

# Drop table if it exists to avoid duplicates during testing (Remove this line if you want to append)
cursor.execute(f"DROP TABLE IF EXISTS {table_name}")

create_table_query = f"""
CREATE TABLE IF NOT EXISTS {table_name} (
    id TEXT,
    name TEXT,
    match TEXT,
    floor TEXT,
    floor_no INTEGER
);
"""
cursor.execute(create_table_query)

# 5. Insert Data
print(f"Importing data into table '{table_name}'...")
try:
    # 'if_exists="append"' adds to the table we just created
    # index=False ensures we don't save the row numbers as a column
    df.to_sql(table_name, conn, if_exists='append', index=False)
    print("Data import successful!")
except Exception as e:
    print(f"Error importing data: {e}")

# 6. Verify and Close
print("\n--- Verification ---")
cursor.execute(f"SELECT * FROM {table_name} LIMIT 5")
rows = cursor.fetchall()
for row in rows:
    print(row)

conn.commit()
conn.close()
print("\nDatabase connection closed.")