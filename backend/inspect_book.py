import pandas as pd

import sys
with open('inspect_out.txt', 'w', encoding='utf-8') as f:
    df = pd.read_excel('../orginals/Book1.xlsx')
    f.write('Columns: ' + str(df.columns.tolist()) + '\n')
    f.write('Sems: ' + str(df['Semester'].unique().tolist() if 'Semester' in df.columns else 'No Sem') + '\n')
    f.write('UG/PG: ' + str(df['Pgm'].unique().tolist() if 'Pgm' in df.columns else 'No Pgm') + '\n')
    f.write(str(df.head()))
