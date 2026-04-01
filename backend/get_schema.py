import pandas as pd
import glob
import json
import os

schema = {}
for f in glob.glob("cms_exports/*.csv"):
    table = os.path.basename(f).replace('.csv', '')
    df = pd.read_csv(f, nrows=1)
    schema[table] = {
        "columns": df.columns.tolist(),
        "sample": df.iloc[0].to_dict() if not df.empty else None,
        "row_count_estimate": sum(1 for _ in open(f, 'r', encoding='utf-8')) - 1
    }

with open("cms_schema.json", "w") as out:
    json.dump(schema, out, indent=2)
print("Done writing cms_schema.json")
