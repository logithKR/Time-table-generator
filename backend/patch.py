import urllib.request

with open('solver_engine.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add `add_warning` helper at line 263 exactly.
helper = """    generation_warnings = []  # Collect warnings for the user

    def add_warning(res_type, course_code, cname, period, section, reason, resource_name=None):
        w_dict = {
            "type": res_type,
            "course_code": course_code,
            "subject_name": cname,
            "period": f"Period {period}" if isinstance(period, int) else str(period),
            "section": f"Section {section}" if isinstance(section, int) else str(section),
            "resource_name": resource_name,
            "reason": reason
        }
        if w_dict not in generation_warnings:
            generation_warnings.append(w_dict)
"""
content = content.replace("    generation_warnings = []  # Collect warnings for the user", helper)

# 2. Replace venue missing
v_no_config = """            cname = course_names.get(course_code, course_code)
            wmsg = f"Subject {cname} has no venue assigned because no venues were configured."
            if wmsg not in generation_warnings:
                generation_warnings.append(wmsg)"""
v_no_config_rep = """            cname = course_names.get(course_code, course_code)
            add_warning("VENUE", course_code, cname, period, required_idx + 1, "No venues were configured.")"""
content = content.replace(v_no_config, v_no_config_rep)

v_insuf = """            cname = course_names.get(course_code, course_code)
            wmsg = f"Subject {cname} could not be assigned a venue due to insufficient available venues."
            if wmsg not in generation_warnings:
                generation_warnings.append(wmsg)"""
v_insuf_rep = """            cname = course_names.get(course_code, course_code)
            add_warning("VENUE", course_code, cname, period, required_idx + 1, "Not enough venues are available.")"""
content = content.replace(v_insuf, v_insuf_rep)


# 3. Replace faculty theory
f_t_insuf = """                                if not is_mini_project(gc.course_code):
                                    wmsg = f"Subject {gc_name} could not be assigned a faculty due to insufficient available faculty members."
                                    if wmsg not in generation_warnings:
                                        generation_warnings.append(wmsg)"""
f_t_insuf_rep = """                                if not is_mini_project(gc.course_code):
                                    add_warning("FACULTY", gc.course_code, gc_name, period, sec + 1, "Not enough faculty are available.")"""
content = content.replace(f_t_insuf, f_t_insuf_rep)

f_t_no_cfg = """                                if not is_mini_project(gc.course_code):
                                    wmsg = f"Subject {gc_name} has no faculty assigned because no faculty members were configured."
                                    if wmsg not in generation_warnings:
                                        generation_warnings.append(wmsg)"""
f_t_no_cfg_rep = """                                if not is_mini_project(gc.course_code):
                                    add_warning("FACULTY", gc.course_code, gc_name, period, sec + 1, "No faculty is configured.")"""
content = content.replace(f_t_no_cfg, f_t_no_cfg_rep)


# 4. Replace faculty lab
f_l_insuf = """                                if not is_mini_project(gc.course_code):
                                    wmsg = f"Subject {gc_name} could not be assigned a faculty due to insufficient available faculty members."
                                    if wmsg not in generation_warnings:
                                        generation_warnings.append(wmsg)"""
f_l_insuf_rep = """                                if not is_mini_project(gc.course_code):
                                    add_warning("FACULTY", gc.course_code, gc_name, f"{bs}-{bs+1}", sec + 1, "Not enough faculty are available.")"""

# Wait, the lab section also uses `wmsg`. I can replace with regex or carefully.
import re
content = re.sub(
    r'([ \t]+)if not is_mini_project\(gc\.course_code\):\s+'
    r'wmsg = f"Subject \{gc_name\} could not be assigned a faculty due to insufficient available faculty members\."\s+'
    r'if wmsg not in generation_warnings:\s+'
    r'generation_warnings\.append\(wmsg\)',
    
    r'\1if not is_mini_project(gc.course_code):\n'
    r'\1    # Warning will be added, period is tricky to infer if not using generic block.\n'
    r'\1    add_warning("FACULTY", gc.course_code, gc_name, period if "period" in locals() else (f"{bs}-{bs+1}" if "bs" in locals() else "N/A"), sec + 1 if "sec" in locals() else ("Batch " + str(batch_idx+1) if "batch_idx" in locals() else 1), "Not enough faculty are available.")',
    content
)

content = re.sub(
    r'([ \t]+)if not is_mini_project\(gc\.course_code\):\s+'
    r'wmsg = f"Subject \{gc_name\} has no faculty assigned because no faculty members were configured\."\s+'
    r'if wmsg not in generation_warnings:\s+'
    r'generation_warnings\.append\(wmsg\)',
    
    r'\1if not is_mini_project(gc.course_code):\n'
    r'\1    add_warning("FACULTY", gc.course_code, gc_name, period if "period" in locals() else (f"{bs}-{bs+1}" if "bs" in locals() else "N/A"), sec + 1 if "sec" in locals() else ("Batch " + str(batch_idx+1) if "batch_idx" in locals() else 1), "No faculty is configured.")',
    content
)

content = re.sub(
    r'([ \t]+)if not is_mini_project\(c\.course_code\):\s+'
    r'wmsg = f"Subject \{cname\} could not be assigned a faculty due to insufficient available faculty members\."\s+'
    r'if wmsg not in generation_warnings:\s+'
    r'generation_warnings\.append\(wmsg\)',
    
    r'\1if not is_mini_project(c.course_code):\n'
    r'\1    add_warning("FACULTY", c.course_code, cname, period if "period" in locals() else (f"{bs}-{bs+1}" if "bs" in locals() else "N/A"), sec + 1 if "sec" in locals() else ("Batch " + str(batch_idx+1) if "batch_idx" in locals() else 1), "Not enough faculty are available.")',
    content
)

content = re.sub(
    r'([ \t]+)if not is_mini_project\(c\.course_code\):\s+'
    r'wmsg = f"Subject \{cname\} has no faculty assigned because no faculty members were configured\."\s+'
    r'if wmsg not in generation_warnings:\s+'
    r'generation_warnings\.append\(wmsg\)',
    
    r'\1if not is_mini_project(c.course_code):\n'
    r'\1    add_warning("FACULTY", c.course_code, cname, period if "period" in locals() else (f"{bs}-{bs+1}" if "bs" in locals() else "N/A"), sec + 1 if "sec" in locals() else ("Batch " + str(batch_idx+1) if "batch_idx" in locals() else 1), "No faculty is configured.")',
    content
)

# 5. Honours and Minor (Section 5.5 & 6)
content = re.sub(
    r'([ \t]+)wmsg = f"Subject \{cname\} has no faculty assigned because no faculty members were configured\."\s+'
    r'if wmsg not in generation_warnings:\s+'
    r'generation_warnings\.append\(wmsg\)',
    
    r'\1add_warning("FACULTY", c.course_code, cname, "N/A", 1, "No faculty is configured.")',
    content
)


with open('solver_engine_patched.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("done")
