import re
import os

path = 'c:/Users/kalai/Downloads/time table/backend/services/solver_engine.py'
content = open(path, 'r', encoding='utf-8').read()

# Pattern to find models.TimetableEntry(...) and inject learning_mode_ids
# We look for semester=semester, inside the parentheses of models.TimetableEntry
def inject_mode(match):
    inner = match.group(1)
    if 'learning_mode_ids' not in inner:
        # Inject after semester=semester,
        new_inner = re.sub(r'(semester=semester,)', r'\1 learning_mode_ids=learning_mode_str,', inner)
        return f'models.TimetableEntry({new_inner})'
    return match.group(0)

new_content = re.sub(r'models\.TimetableEntry\((.*?)\)', inject_mode, content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Injected learning_mode_ids into TimetableEntry calls.")
