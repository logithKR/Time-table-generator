"""
constraint_interpreter.py
─────────────────────────
Translates user-defined JSON constraint rules into CP-SAT model constraints
and post-solve timetable entries.

Phase 1 supports:
  - COURSE_INJECTION:  inject a subject (e.g. Yoga) into specified slots
  - SLOT_BLOCKING:     block specific (day, period) slots from scheduling

Future phases will add:
  - FACULTY_RULE
  - DISTRIBUTION_RULE
  - SPACING_RULE
  - CAPACITY_RULE
  - CUSTOM_PLACEMENT
"""
import json
import datetime
from typing import List, Dict, Set, Tuple, Optional, Any

import models


class ConstraintInterpreter:
    """Loads user-defined constraints from the DB and applies them to the solver."""

    def __init__(self, db, department_code: str, semester: int):
        self.db = db
        self.department_code = department_code
        self.semester = semester
        self.constraints: List[dict] = []
        self.warnings: List[str] = []
        self.reserved_slots: Dict[str, List[Tuple[str, int]]] = {}  # uuid -> [(day, period)]

    # ─── Loading ────────────────────────────────────────────

    def load_constraints(self):
        """Load all enabled user constraints that apply to this dept/sem."""
        rows = self.db.query(models.UserConstraint).filter_by(enabled=True).order_by(
            models.UserConstraint.priority.desc(),
            models.UserConstraint.order_index
        ).all()

        for row in rows:
            constraint = {
                "uuid": row.uuid,
                "name": row.name,
                "priority": row.priority,
                "soft_weight": row.soft_weight,
                "constraint_type": row.constraint_type,
                "scope": json.loads(row.scope_json),
                "target": json.loads(row.target_json),
                "rules": json.loads(row.rules_json),
            }

            # Check if this constraint applies to current dept/sem
            if self._matches_scope(constraint["scope"]):
                self.constraints.append(constraint)

        print(f"  📋 ConstraintInterpreter: loaded {len(self.constraints)} user constraints "
              f"for {self.department_code} Sem {self.semester}")

    def _matches_scope(self, scope: dict) -> bool:
        """Check whether a constraint's scope includes this dept+sem."""
        depts = scope.get("departments", ["*"])
        sems = scope.get("semesters", ["*"])

        dept_match = (depts == ["*"] or "*" in depts or self.department_code in depts)
        sem_match = (sems == ["*"] or "*" in sems or self.semester in sems)

        return dept_match and sem_match

    # ─── Validation ─────────────────────────────────────────

    def validate_constraints(
        self,
        courses,
        slots,
        all_days: List[str],
        day_periods: dict,
        slot_lookup: dict
    ) -> List[str]:
        """Quick pre-solve validation. Returns a list of warning strings."""
        warnings = []

        for c in self.constraints:
            ct = c["constraint_type"]
            rules = c["rules"]

            if ct == "COURSE_INJECTION":
                sessions = rules.get("sessions_per_week", {})
                exact = sessions.get("exact", sessions.get("max", 0))
                visual_slots = rules.get("visual_slots", [])

                # Check visual slots exist
                for vs in visual_slots:
                    if (vs.get("day"), vs.get("period")) not in slot_lookup:
                        warnings.append(
                            f"⚠️ [{c['name']}] Visual slot {vs.get('day')} P{vs.get('period')} "
                            f"does not exist in the slot master"
                        )

                # Check if enough free slots
                if exact > 0 and visual_slots:
                    if len(visual_slots) < exact:
                        warnings.append(
                            f"⚠️ [{c['name']}] Needs {exact} sessions but only "
                            f"{len(visual_slots)} visual slots selected"
                        )

            elif ct == "SLOT_BLOCKING":
                visual_slots = rules.get("visual_slots", [])
                if not visual_slots:
                    warnings.append(
                        f"⚠️ [{c['name']}] Slot blocking constraint has no slots specified"
                    )

        self.warnings = warnings
        return warnings

    # ─── Apply to CP-SAT Model ──────────────────────────────

    def apply_to_model(
        self,
        model,
        theory_vars: dict,
        lab_vars: dict,
        merged_lab_vars: dict,
        core_slot_fills: dict,
        objective_terms: list,
        all_days: List[str],
        day_periods: dict,
        slot_lookup: dict,
        filled_slots: set
    ):
        """Apply user constraints to the CP-SAT model before solving.
        
        For COURSE_INJECTION: compute candidate slots, select the best ones,
        and BLOCK them in the CP-SAT model so the solver keeps them free.
        The reserved slots are stored in self.reserved_slots for use in post-solve.
        
        For SLOT_BLOCKING: zero out solver variables at specified slots.
        """
        for c in self.constraints:
            ct = c["constraint_type"]
            try:
                if ct == "SLOT_BLOCKING":
                    self._apply_slot_blocking(
                        c, model, theory_vars, lab_vars, merged_lab_vars,
                        all_days, day_periods, slot_lookup
                    )
                elif ct == "COURSE_INJECTION":
                    # Pre-compute which slots to reserve and block them
                    self._reserve_injection_slots(
                        c, model, theory_vars, lab_vars, merged_lab_vars,
                        all_days, day_periods, slot_lookup
                    )
            except Exception as e:
                self.warnings.append(
                    f"❌ [{c['name']}] Failed to apply to model: {str(e)}"
                )

    def _apply_slot_blocking(
        self, constraint: dict, model, theory_vars, lab_vars, merged_lab_vars,
        all_days, day_periods, slot_lookup
    ):
        """Block specific slots from being used by any course."""
        rules = constraint["rules"]
        visual_slots = rules.get("visual_slots", [])
        name = constraint["name"]

        blocked_count = 0
        for vs in visual_slots:
            day = vs.get("day")
            period = vs.get("period")

            if (day, period) not in slot_lookup:
                continue

            # Zero out all theory vars at this slot
            for key, var in theory_vars.items():
                # theory_vars keys are typically (course_code, day, period)
                if len(key) >= 3 and key[1] == day and key[2] == period:
                    model.Add(var == 0)

            # Zero out all lab vars at this slot
            for key, var in lab_vars.items():
                if len(key) >= 3 and key[1] == day:
                    lab_start = key[2]
                    # Lab blocks span 2 periods: lab_start and lab_start+1
                    if lab_start == period or lab_start + 1 == period:
                        model.Add(var == 0)

            # Zero out merged lab vars
            for key, var in merged_lab_vars.items():
                if len(key) >= 2 and key[0] == day:
                    lab_start = key[1]
                    if lab_start == period or lab_start + 1 == period:
                        model.Add(var == 0)

            blocked_count += 1

        if blocked_count > 0:
            print(f"    🚫 [{name}] Blocked {blocked_count} slots from scheduling")

    def _reserve_injection_slots(
        self, constraint: dict, model, theory_vars, lab_vars, merged_lab_vars,
        all_days, day_periods, slot_lookup
    ):
        """Pre-compute and reserve slots for COURSE_INJECTION.
        
        This blocks the chosen slots in the CP-SAT model so the solver
        will NOT assign any regular courses to them, guaranteeing they
        are free for post-solve injection.
        """
        rules = constraint["rules"]
        name = constraint["name"]
        sessions = rules.get("sessions_per_week", {})
        exact = sessions.get("exact", sessions.get("max", 1))
        period_structure = rules.get("period_structure", "SINGLE")

        # Build candidates
        visual_slots = rules.get("visual_slots", [])
        if visual_slots:
            pinned = [
                (vs["day"], vs["period"])
                for vs in visual_slots
                if (vs["day"], vs["period"]) in slot_lookup
            ]
            auto = self._build_candidate_slots(rules, all_days, day_periods, slot_lookup)
            seen = set(pinned)
            candidates = list(pinned)
            for ac in auto:
                if ac not in seen:
                    candidates.append(ac)
                    seen.add(ac)
        else:
            candidates = self._build_candidate_slots(rules, all_days, day_periods, slot_lookup)

        # Select best slots
        spacing = rules.get("spacing", {})
        selected = self._select_injection_slots(
            candidates, exact, period_structure,
            spacing.get("min_days_apart", 0),
            spacing.get("no_same_time_different_days", False),
            all_days, slot_lookup
        )

        if len(selected) < exact:
            self.warnings.append(
                f"⚠️ [{name}] Needs {exact} sessions but could only reserve "
                f"{len(selected)} slots"
            )

        # Store reserved slots for post-solve
        self.reserved_slots[constraint["uuid"]] = selected

        # Block each reserved slot in the CP-SAT model
        blocked = 0
        for (day, period) in selected:
            for key, var in theory_vars.items():
                if len(key) >= 3 and key[1] == day and key[2] == period:
                    model.Add(var == 0)
            for key, var in lab_vars.items():
                if len(key) >= 3 and key[1] == day:
                    bs = key[2]
                    if bs == period or bs + 1 == period:
                        model.Add(var == 0)
            for key, var in merged_lab_vars.items():
                if len(key) >= 2 and key[0] == day:
                    bs = key[1]
                    if bs == period or bs + 1 == period:
                        model.Add(var == 0)

            # For CONSECUTIVE_2, also block the next period
            if period_structure == "CONSECUTIVE_2":
                np = period + 1
                for key, var in theory_vars.items():
                    if len(key) >= 3 and key[1] == day and key[2] == np:
                        model.Add(var == 0)

            blocked += 1

        if blocked > 0:
            print(f"    📌 [{name}] Reserved {blocked} slots: {selected}")

    # ─── Post-Solve Application ──────────────────────────────

    def apply_post_solve(
        self,
        db,
        department_code: str,
        semester: int,
        filled_slots: set,
        slot_lookup: dict,
        assign_venue,
        count: int,
        all_days: List[str] = None,
        day_periods: dict = None
    ) -> int:
        """Apply post-solve constraints (course injection, blocked labels).
        Returns the updated count of entries added."""

        for c in self.constraints:
            ct = c["constraint_type"]
            try:
                if ct == "COURSE_INJECTION":
                    count = self._apply_course_injection(
                        c, db, department_code, semester,
                        filled_slots, slot_lookup, assign_venue, count,
                        all_days, day_periods
                    )
                elif ct == "SLOT_BLOCKING":
                    count = self._apply_slot_blocking_labels(
                        c, db, department_code, semester,
                        filled_slots, slot_lookup, count
                    )
            except Exception as e:
                self.warnings.append(
                    f"❌ [{c['name']}] Post-solve error: {str(e)}"
                )

        return count

    def _apply_course_injection(
        self, constraint: dict, db, department_code: str, semester: int,
        filled_slots: set, slot_lookup: dict, assign_venue, count: int,
        all_days: List[str], day_periods: dict
    ) -> int:
        """Inject a course into the pre-reserved slots."""
        rules = constraint["rules"]
        target = constraint["target"]
        name = constraint["name"]

        course_code = target.get("course_code", "INJECTED")
        course_name = target.get("course_name", name)
        faculty_id = target.get("faculty_id")
        faculty_name = target.get("faculty_name")
        period_structure = rules.get("period_structure", "SINGLE")

        # Use pre-reserved slots (guaranteed free by the solver)
        selected = self.reserved_slots.get(constraint["uuid"], [])

        if not selected:
            sessions = rules.get("sessions_per_week", {})
            exact = sessions.get("exact", sessions.get("max", 1))
            self.warnings.append(
                f"⚠️ [{name}] No reserved slots available for injection "
                f"({exact} sessions needed)"
            )
            return count

        # Create timetable entries
        for (day, period) in selected:
            slot_obj = slot_lookup.get((day, period))
            if not slot_obj:
                continue

            session_type = rules.get("session_type", "THEORY")
            venue = None
            try:
                venue = assign_venue(day, period, course_code, False, count)
            except Exception:
                venue = None

            sec_num = 1  # reserved slots are guaranteed clean

            entry = models.TimetableEntry(
                department_code=department_code,
                semester=semester,
                course_code=course_code,
                course_name=course_name,
                faculty_id=faculty_id,
                faculty_name=faculty_name,
                session_type=session_type,
                slot_id=slot_obj.slot_id,
                day_of_week=day,
                period_number=period,
                venue_name=venue,
                section_number=sec_num,
                created_at=datetime.datetime.utcnow()
            )
            db.add(entry)
            filled_slots.add((day, period))
            count += 1

            # For CONSECUTIVE_2, also inject the next period
            if period_structure == "CONSECUTIVE_2":
                next_p = period + 1
                next_slot = slot_lookup.get((day, next_p))
                if next_slot:

                    entry2 = models.TimetableEntry(
                        department_code=department_code,
                        semester=semester,
                        course_code=course_code,
                        course_name=course_name,
                        faculty_id=faculty_id,
                        faculty_name=faculty_name,
                        session_type=session_type,
                        slot_id=next_slot.slot_id,
                        day_of_week=day,
                        period_number=next_p,
                        venue_name=venue,
                        section_number=2 if already_there_2 else 1,
                        created_at="now"
                    )
                    db.add(entry2)
                    filled_slots.add((day, next_p))
                    count += 1

        if selected:
            print(f"    ✅ [{name}] Injected {course_code} into {len(selected)} slots: "
                  f"{[(d, p) for d, p in selected]}")

        return count

    def _apply_slot_blocking_labels(
        self, constraint: dict, db, department_code: str, semester: int,
        filled_slots: set, slot_lookup: dict, count: int
    ) -> int:
        """Insert label entries for blocked slots (e.g. 'Assembly')."""
        rules = constraint["rules"]
        visual_slots = rules.get("visual_slots", [])
        block_label = rules.get("block_label", constraint["name"])
        session_type = rules.get("session_type", "BLOCKED")

        for vs in visual_slots:
            day = vs.get("day")
            period = vs.get("period")
            slot_obj = slot_lookup.get((day, period))
            if not slot_obj:
                continue

            # Only inject label if slot is not already filled with a regular course
            if (day, period) not in filled_slots:
                entry = models.TimetableEntry(
                    department_code=department_code,
                    semester=semester,
                    course_code="BLOCKED",
                    course_name=block_label,
                    faculty_id=None,
                    faculty_name=None,
                    session_type=session_type,
                    slot_id=slot_obj.slot_id,
                    day_of_week=day,
                    period_number=period,
                    venue_name=None,
                    section_number=1,
                    created_at="now"
                )
                db.add(entry)
                filled_slots.add((day, period))
                count += 1

        return count

    # ─── Helper Methods ──────────────────────────────────────

    def _build_candidate_slots(
        self, rules: dict, all_days: List[str],
        day_periods: dict, slot_lookup: dict
    ) -> List[Tuple[str, int]]:
        """Build the list of (day, period) candidates from day/slot preferences."""
        day_pref = rules.get("day_preference", {})
        slot_pref = rules.get("slot_preference", {})

        # Determine which days
        day_mode = day_pref.get("mode", "ANY")
        if day_mode == "SPECIFIC":
            days = [d for d in day_pref.get("days", all_days) if d in all_days]
        elif day_mode == "EXCLUDE":
            exclude = set(day_pref.get("days", []))
            days = [d for d in all_days if d not in exclude]
        elif day_mode == "ALTERNATING":
            # ALTERNATING mode: user selected specific days in the "days" field
            alt_days = day_pref.get("days", [])
            if alt_days:
                days = [d for d in alt_days if d in all_days]
            else:
                days = all_days
        else:
            days = all_days

        # Determine which periods
        slot_mode = slot_pref.get("mode", "ANY")
        if slot_mode == "SPECIFIC":
            allowed_periods = set(slot_pref.get("periods", []))
        elif slot_mode == "RANGE":
            start = slot_pref.get("range_start", 1)
            end = slot_pref.get("range_end", 8)
            allowed_periods = set(range(start, end + 1))
        elif slot_mode == "EXCLUDE":
            exclude_periods = set(slot_pref.get("exclude_periods", []))
            all_p = set()
            for d in days:
                all_p.update(day_periods.get(d, []))
            allowed_periods = all_p - exclude_periods
        else:
            allowed_periods = None  # any

        candidates = []
        for d in days:
            for p in sorted(day_periods.get(d, [])):
                if allowed_periods and p not in allowed_periods:
                    continue
                if (d, p) in slot_lookup:
                    candidates.append((d, p))

        # Apply placement preference for ordering
        placement = rules.get("placement", {})
        prefer = placement.get("prefer_position", "NONE")
        if prefer == "EARLY":
            candidates.sort(key=lambda x: x[1])
        elif prefer == "LATE":
            candidates.sort(key=lambda x: -x[1])

        return candidates

    def _select_injection_slots(
        self,
        candidates: List[Tuple[str, int]],
        needed: int,
        period_structure: str,
        min_days_apart: int,
        no_same_time: bool,
        all_days: List[str],
        slot_lookup: dict
    ) -> List[Tuple[str, int]]:
        """Select the best slots from candidates respecting spacing rules."""
        if not candidates or needed <= 0:
            return []

        day_order = {d: i for i, d in enumerate(all_days)} if all_days else {}
        selected = []
        used_days = set()
        used_periods = set()

        for (day, period) in candidates:
            if len(selected) >= needed:
                break

            # For CONSECUTIVE_2, check that next period also exists
            if period_structure == "CONSECUTIVE_2":
                if (day, period + 1) not in slot_lookup:
                    continue

            # Spacing: min_days_apart
            if min_days_apart > 0 and day in day_order:
                too_close = False
                for (sd, sp) in selected:
                    if sd in day_order:
                        gap = abs(day_order[day] - day_order[sd])
                        if gap < min_days_apart:
                            too_close = True
                            break
                if too_close:
                    continue

            # No same time on different days
            if no_same_time and period in used_periods:
                if day not in used_days:
                    continue

            selected.append((day, period))
            used_days.add(day)
            used_periods.add(period)

        return selected
