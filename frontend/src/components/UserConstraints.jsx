import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as api from '../utils/api';
import {
    Plus, Trash2, ToggleLeft, ToggleRight, Pencil, X, ChevronDown, ChevronRight,
    Shield, Zap, Star, Check, AlertTriangle, Info, Sparkles, Copy,
    BookOpen, Clock, Calendar, MapPin, Users2, Target, Layers, Eye,
    FlaskConical, Coffee, ArrowLeftRight, Settings
} from 'lucide-react';

// ─── Constants ───
const CONSTRAINT_TYPES = [
    { value: 'COURSE_INJECTION', label: 'Add Subject / Activity', icon: BookOpen, color: 'emerald', desc: 'Inject a course like Yoga, Sports, Library into the timetable' },
    { value: 'SLOT_BLOCKING', label: 'Block Time Slots', icon: Clock, color: 'rose', desc: 'Prevent scheduling in specific slots (e.g., Assembly hour)' },
    { value: 'FACULTY_RULE', label: 'Faculty Rule', icon: Users2, color: 'blue', desc: 'Set faculty availability, max hours, preferences (Coming Soon)', disabled: true },
    { value: 'DISTRIBUTION_RULE', label: 'Distribution Rule', icon: Layers, color: 'violet', desc: 'Control how courses are spread across the week (Coming Soon)', disabled: true },
];

const PRIORITIES = [
    { value: 'HARD', label: 'Hard', color: 'rose', desc: 'Must be satisfied — solver will fail if impossible' },
    { value: 'SOFT', label: 'Soft', color: 'amber', desc: 'Preference with weight — solver optimizes for it' },
    { value: 'PREFERENCE', label: 'Preference', color: 'blue', desc: 'Nice to have — lowest priority' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_MODES = ['ANY', 'SPECIFIC', 'EXCLUDE', 'ALTERNATING'];
const SLOT_MODES = ['ANY', 'RANGE', 'SPECIFIC', 'EXCLUDE'];
const PERIOD_STRUCTURES = ['SINGLE', 'CONSECUTIVE_2', 'CONSECUTIVE_3'];
const PLACEMENT_POSITIONS = ['NONE', 'EARLY', 'LATE', 'MIDDLE'];

// ─── Visual Slot Picker ───
const SlotPicker = ({ slots, selected, onToggle, filled = [] }) => {
    const days = [...new Set(slots.map(s => s.day_of_week))].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b));
    const maxPeriod = Math.max(...slots.filter(s => s.slot_type === 'REGULAR').map(s => s.period_number), 0);
    const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

    const isSelected = (day, period) => selected.some(s => s.day === day && s.period === period);
    const isFilled = (day, period) => filled.some(e => e.day_of_week === day && e.period_number === period);

    return (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full border-collapse text-xs">
                <thead>
                    <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase border-b border-r border-gray-100 sticky left-0 bg-gray-50 z-10">Day</th>
                        {periods.map(p => (
                            <th key={p} className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase border-b border-r border-gray-100 text-center min-w-[50px]">P{p}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {days.map(day => (
                        <tr key={day} className="hover:bg-gray-50/30 transition-colors">
                            <td className="px-3 py-2 text-xs font-bold text-gray-700 border-r border-b border-gray-100 sticky left-0 bg-white z-10 whitespace-nowrap">{day.slice(0, 3)}</td>
                            {periods.map(p => {
                                const sel = isSelected(day, p);
                                const occ = isFilled(day, p);
                                return (
                                    <td key={p}
                                        onClick={() => onToggle(day, p)}
                                        className={`border-r border-b border-gray-100 text-center cursor-pointer transition-all duration-150 select-none
                                            ${sel ? 'bg-violet-500 text-white font-bold shadow-inner' : occ ? 'bg-gray-100 text-gray-400' : 'hover:bg-violet-50 text-gray-300 hover:text-violet-400'}`}
                                        style={{ minWidth: 44, minHeight: 36, padding: '6px 4px' }}
                                        title={sel ? 'Selected' : occ ? 'Already occupied' : 'Click to select'}
                                    >
                                        {sel ? '●' : occ ? '▪' : '○'}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="flex items-center gap-4 px-3 py-2 bg-gray-50 text-[10px] text-gray-400 border-t border-gray-100">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-violet-500 inline-block"></span> Selected</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-200 inline-block"></span> Occupied</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white border border-gray-200 inline-block"></span> Available</span>
            </div>
        </div>
    );
};

// ─── Constraint Card ───
const ConstraintCard = ({ constraint, onToggle, onEdit, onDelete, onDuplicate }) => {
    const priorityColor = constraint.priority === 'HARD' ? 'rose' : constraint.priority === 'SOFT' ? 'amber' : 'blue';
    const typeInfo = CONSTRAINT_TYPES.find(t => t.value === constraint.constraint_type) || CONSTRAINT_TYPES[0];
    const TypeIcon = typeInfo.icon;

    const scopeLabel = useMemo(() => {
        const s = constraint.scope || {};
        const depts = s.departments || ['*'];
        const sems = s.semesters || ['*'];
        const parts = [];
        parts.push(depts[0] === '*' ? 'All Depts' : depts.join(', '));
        parts.push(sems[0] === '*' ? 'All Sems' : `Sem ${sems.join(', ')}`);
        return parts.join(' • ');
    }, [constraint.scope]);

    const rulesLabel = useMemo(() => {
        const r = constraint.rules || {};
        const parts = [];
        const sessions = r.sessions_per_week;
        if (sessions?.exact) parts.push(`${sessions.exact}/week`);
        else if (sessions?.min || sessions?.max) parts.push(`${sessions.min || 0}-${sessions.max || '?'}/week`);
        if (r.period_structure && r.period_structure !== 'SINGLE') parts.push(r.period_structure.replace(/_/g, ' '));
        const vs = r.visual_slots;
        if (vs?.length) parts.push(`${vs.length} pinned slots`);
        return parts.join(' · ') || 'No rules configured';
    }, [constraint.rules]);

    return (
        <div className={`relative group rounded-xl border-2 p-4 transition-all duration-300 ${constraint.enabled
            ? 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-lg shadow-sm'
            : 'border-gray-100/50 bg-gray-50/50 opacity-60'
            }`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg bg-${typeInfo.color}-50 text-${typeInfo.color}-500 shrink-0 mt-0.5`}>
                        <TypeIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className={`font-bold text-sm ${constraint.enabled ? 'text-gray-800' : 'text-gray-400'}`}>
                                {constraint.name}
                            </h4>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-${priorityColor}-50 text-${priorityColor}-500`}>
                                {constraint.priority}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-${typeInfo.color}-50 text-${typeInfo.color}-500`}>
                                {typeInfo.label}
                            </span>
                        </div>
                        {constraint.description && (
                            <p className={`text-xs leading-relaxed mb-1.5 ${constraint.enabled ? 'text-gray-500' : 'text-gray-300'}`}>
                                {constraint.description}
                            </p>
                        )}
                        <div className="flex items-center gap-3 text-[10px] text-gray-400 font-medium">
                            <span className="flex items-center gap-1"><Target className="w-3 h-3" />{scopeLabel}</span>
                            <span className="flex items-center gap-1"><Settings className="w-3 h-3" />{rulesLabel}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => onDuplicate(constraint)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-violet-500 hover:bg-violet-50 transition-all sm:opacity-0 sm:group-hover:opacity-100"
                        title="Duplicate">
                        <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onEdit(constraint)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-all sm:opacity-0 sm:group-hover:opacity-100"
                        title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onDelete(constraint.uuid)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-all sm:opacity-0 sm:group-hover:opacity-100"
                        title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onToggle(constraint.uuid)}
                        className={`p-1 rounded-lg transition-all ${constraint.enabled ? 'text-emerald-500 hover:bg-emerald-50' : 'text-gray-300 hover:bg-gray-100'}`}
                        title={constraint.enabled ? 'Disable' : 'Enable'}>
                        {constraint.enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Creation / Edit Wizard ───
const ConstraintWizard = ({ isOpen, onClose, onSave, existingConstraint, departments, courses, slots, timetableEntries }) => {
    if (!isOpen) return null;

    const isEdit = !!existingConstraint;
    const [step, setStep] = useState(0);
    const [validating, setValidating] = useState(false);
    const [validationResult, setValidationResult] = useState(null);

    const [form, setForm] = useState(() => {
        if (existingConstraint) {
            return {
                name: existingConstraint.name || '',
                description: existingConstraint.description || '',
                constraint_type: existingConstraint.constraint_type || 'COURSE_INJECTION',
                priority: existingConstraint.priority || 'HARD',
                soft_weight: existingConstraint.soft_weight || 5,
                scope: existingConstraint.scope || { departments: ['*'], semesters: ['*'], sections: ['*'] },
                target: existingConstraint.target || { type: 'COURSE', course_code: '', course_name: '', create_if_missing: true },
                rules: existingConstraint.rules || {
                    sessions_per_week: { exact: 2 },
                    period_structure: 'SINGLE',
                    day_preference: { mode: 'ANY', days: [] },
                    slot_preference: { mode: 'ANY', range_start: 1, range_end: 7, periods: [], exclude_periods: [] },
                    spacing: { min_days_apart: 0, no_same_time_different_days: false, no_consecutive_periods: false },
                    placement: { only_free_slots: true, can_replace: false, prefer_position: 'NONE' },
                    visual_slots: [],
                    block_label: '',
                    session_type: 'THEORY',
                },
            };
        }
        return {
            name: '', description: '',
            constraint_type: 'COURSE_INJECTION',
            priority: 'HARD', soft_weight: 5,
            scope: { departments: ['*'], semesters: ['*'], sections: ['*'] },
            target: { type: 'COURSE', course_code: '', course_name: '', create_if_missing: true },
            rules: {
                sessions_per_week: { exact: 2 },
                period_structure: 'SINGLE',
                day_preference: { mode: 'ANY', days: [] },
                slot_preference: { mode: 'ANY', range_start: 1, range_end: 7, periods: [], exclude_periods: [] },
                spacing: { min_days_apart: 0, no_same_time_different_days: false, no_consecutive_periods: false },
                placement: { only_free_slots: true, can_replace: false, prefer_position: 'NONE' },
                visual_slots: [],
                block_label: '',
                session_type: 'THEORY',
            },
        };
    });

    const updateForm = (path, value) => {
        setForm(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            const keys = path.split('.');
            let obj = next;
            for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
            obj[keys[keys.length - 1]] = value;
            return next;
        });
    };

    const toggleVisualSlot = (day, period) => {
        setForm(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            const vs = next.rules.visual_slots || [];
            const idx = vs.findIndex(s => s.day === day && s.period === period);
            if (idx >= 0) vs.splice(idx, 1);
            else vs.push({ day, period });
            next.rules.visual_slots = vs;
            return next;
        });
    };

    const handleValidate = async () => {
        setValidating(true);
        try {
            const res = await api.validateUserConstraint({
                name: form.name || 'Untitled',
                constraint_type: form.constraint_type,
                priority: form.priority,
                soft_weight: form.soft_weight,
                scope: form.scope,
                target: form.target,
                rules: form.rules,
            });
            setValidationResult(res.data);
        } catch (err) {
            setValidationResult({ valid: false, warnings: ['Validation request failed'] });
        }
        setValidating(false);
    };

    const handleSubmit = () => {
        onSave({
            name: form.name || 'Untitled Constraint',
            description: form.description,
            constraint_type: form.constraint_type,
            priority: form.priority,
            soft_weight: form.priority === 'SOFT' ? form.soft_weight : 0,
            scope: form.scope,
            target: form.target,
            rules: form.rules,
            enabled: true,
        }, isEdit ? existingConstraint.uuid : null);
        onClose();
    };

    const isCourseInjection = form.constraint_type === 'COURSE_INJECTION';
    const isSlotBlocking = form.constraint_type === 'SLOT_BLOCKING';

    // Steps
    const steps = ['Type', 'Scope', isCourseInjection ? 'Subject' : 'Target', 'Rules', 'Slots', 'Review'];

    const maxPeriod = Math.max(...(slots || []).filter(s => s.slot_type === 'REGULAR').map(s => s.period_number), 8);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-100 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">{isEdit ? 'Edit Constraint' : 'New Constraint'}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                            {steps.map((s, i) => (
                                <React.Fragment key={s}>
                                    <button onClick={() => setStep(i)} className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${i === step ? 'bg-violet-100 text-violet-700' : i < step ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                                        {i < step ? '✓' : i + 1}. {s}
                                    </button>
                                    {i < steps.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300" />}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {/* Step 0: Constraint Type */}
                    {step === 0 && (
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">What kind of constraint?</label>
                            {CONSTRAINT_TYPES.map(ct => (
                                <button key={ct.value} disabled={ct.disabled}
                                    onClick={() => { updateForm('constraint_type', ct.value); if (ct.value === 'SLOT_BLOCKING') updateForm('target.type', 'SLOT'); else updateForm('target.type', 'COURSE'); }}
                                    className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${ct.disabled ? 'opacity-40 cursor-not-allowed border-gray-100' : form.constraint_type === ct.value ? `border-${ct.color}-400 bg-${ct.color}-50/30 shadow-md` : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'}`}>
                                    <div className={`p-2 rounded-lg bg-${ct.color}-50 text-${ct.color}-500`}><ct.icon className="w-5 h-5" /></div>
                                    <div>
                                        <div className="font-bold text-sm text-gray-800">{ct.label}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">{ct.desc}</div>
                                    </div>
                                </button>
                            ))}
                            <div className="space-y-2 mt-4">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Constraint Name</label>
                                <input type="text" value={form.name} onChange={e => updateForm('name', e.target.value)}
                                    placeholder={isCourseInjection ? 'e.g., Yoga for All Departments' : 'e.g., Block Assembly Hour'}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 outline-none" />
                                <input type="text" value={form.description} onChange={e => updateForm('description', e.target.value)}
                                    placeholder="Optional description..."
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 outline-none text-gray-500" />
                            </div>
                        </div>
                    )}

                    {/* Step 1: Scope */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Apply to which departments?</label>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => updateForm('scope.departments', ['*'])}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${(form.scope.departments || [])[0] === '*' ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                    All Departments
                                </button>
                                {(departments || []).map(d => {
                                    const dCode = d.department_code || d;
                                    const selected = form.scope.departments?.includes(dCode);
                                    return (
                                        <button key={dCode}
                                            onClick={() => {
                                                const current = form.scope.departments || [];
                                                if (current[0] === '*') updateForm('scope.departments', [dCode]);
                                                else if (selected) updateForm('scope.departments', current.filter(x => x !== dCode));
                                                else updateForm('scope.departments', [...current, dCode]);
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${selected && form.scope.departments?.[0] !== '*' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                            {dCode}
                                        </button>
                                    );
                                })}
                            </div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-4">Apply to which semesters?</label>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => updateForm('scope.semesters', ['*'])}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${(form.scope.semesters || [])[0] === '*' ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                    All Semesters
                                </button>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => {
                                    const selected = form.scope.semesters?.includes(s);
                                    return (
                                        <button key={s}
                                            onClick={() => {
                                                const current = form.scope.semesters || [];
                                                if (current[0] === '*') updateForm('scope.semesters', [s]);
                                                else if (selected) updateForm('scope.semesters', current.filter(x => x !== s));
                                                else updateForm('scope.semesters', [...current, s]);
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${selected && form.scope.semesters?.[0] !== '*' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                            Sem {s}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Target (Subject or Label) */}
                    {step === 2 && (
                        <div className="space-y-4">
                            {isCourseInjection ? (
                                <>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Enter the subject details</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Course Code</label>
                                            <input type="text" value={form.target.course_code || ''} onChange={e => updateForm('target.course_code', e.target.value)}
                                                placeholder="e.g., YOGA101" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 outline-none font-mono" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Course Name</label>
                                            <input type="text" value={form.target.course_name || ''} onChange={e => updateForm('target.course_name', e.target.value)}
                                                placeholder="e.g., Yoga" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 outline-none" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Faculty Name (optional)</label>
                                            <input type="text" value={form.target.faculty_name || ''} onChange={e => updateForm('target.faculty_name', e.target.value)}
                                                placeholder="e.g., Yoga Instructor" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Session Type</label>
                                            <select value={form.rules.session_type || 'THEORY'} onChange={e => updateForm('rules.session_type', e.target.value)}
                                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 outline-none bg-white">
                                                <option value="THEORY">Theory</option>
                                                <option value="LAB">Lab</option>
                                                <option value="ACTIVITY">Activity</option>
                                            </select>
                                        </div>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={form.target.create_if_missing !== false}
                                            onChange={e => updateForm('target.create_if_missing', e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-400" />
                                        <span className="text-xs text-gray-600">Auto-create course if it doesn't exist in the database</span>
                                    </label>
                                </>
                            ) : isSlotBlocking ? (
                                <>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Block Label</label>
                                    <input type="text" value={form.rules.block_label || ''} onChange={e => updateForm('rules.block_label', e.target.value)}
                                        placeholder="e.g., Assembly, Sports Day" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 outline-none" />
                                    <p className="text-xs text-gray-400">This label will appear in the timetable for the blocked slots.</p>
                                </>
                            ) : null}
                        </div>
                    )}

                    {/* Step 3: Rules */}
                    {step === 3 && (
                        <div className="space-y-5">
                            {isCourseInjection && (
                                <>
                                    {/* Sessions per week */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sessions per week</label>
                                        <div className="flex items-center gap-3 mt-2">
                                            <input type="number" min={1} max={20} value={form.rules.sessions_per_week?.exact || 2}
                                                onChange={e => updateForm('rules.sessions_per_week', { exact: parseInt(e.target.value) || 1 })}
                                                className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center font-bold focus:ring-2 focus:ring-violet-400 outline-none" />
                                            <span className="text-xs text-gray-500">periods per week</span>
                                        </div>
                                    </div>
                                    {/* Period structure */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Period Structure</label>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {PERIOD_STRUCTURES.map(ps => (
                                                <button key={ps} onClick={() => updateForm('rules.period_structure', ps)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${form.rules.period_structure === ps ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                                    {ps.replace(/_/g, ' ')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Day preference */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Day Preference</label>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {DAY_MODES.map(dm => (
                                                <button key={dm} onClick={() => updateForm('rules.day_preference.mode', dm)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${form.rules.day_preference?.mode === dm ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                                    {dm}
                                                </button>
                                            ))}
                                        </div>
                                        {(form.rules.day_preference?.mode === 'SPECIFIC' || form.rules.day_preference?.mode === 'EXCLUDE') && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {DAYS.map(d => {
                                                    const selected = (form.rules.day_preference?.days || []).includes(d);
                                                    return (
                                                        <button key={d}
                                                            onClick={() => {
                                                                const days = form.rules.day_preference?.days || [];
                                                                updateForm('rules.day_preference.days', selected ? days.filter(x => x !== d) : [...days, d]);
                                                            }}
                                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border-2 transition-all ${selected ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-400'}`}>
                                                            {d.slice(0, 3)}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    {/* Slot preference */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Slot Preference</label>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {SLOT_MODES.map(sm => (
                                                <button key={sm} onClick={() => updateForm('rules.slot_preference.mode', sm)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${form.rules.slot_preference?.mode === sm ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                                    {sm}
                                                </button>
                                            ))}
                                        </div>
                                        {form.rules.slot_preference?.mode === 'RANGE' && (
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-xs text-gray-500">Period</span>
                                                <input type="number" min={1} max={maxPeriod} value={form.rules.slot_preference?.range_start || 1}
                                                    onChange={e => updateForm('rules.slot_preference.range_start', parseInt(e.target.value) || 1)}
                                                    className="w-16 border border-gray-200 rounded px-2 py-1 text-sm text-center" />
                                                <span className="text-xs text-gray-500">to</span>
                                                <input type="number" min={1} max={maxPeriod} value={form.rules.slot_preference?.range_end || 7}
                                                    onChange={e => updateForm('rules.slot_preference.range_end', parseInt(e.target.value) || 7)}
                                                    className="w-16 border border-gray-200 rounded px-2 py-1 text-sm text-center" />
                                            </div>
                                        )}
                                    </div>
                                    {/* Spacing */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Spacing Rules</label>
                                        <div className="space-y-2 mt-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500">Min days apart:</span>
                                                <input type="number" min={0} max={5} value={form.rules.spacing?.min_days_apart || 0}
                                                    onChange={e => updateForm('rules.spacing.min_days_apart', parseInt(e.target.value) || 0)}
                                                    className="w-16 border border-gray-200 rounded px-2 py-1 text-sm text-center" />
                                            </div>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={form.rules.spacing?.no_same_time_different_days || false}
                                                    onChange={e => updateForm('rules.spacing.no_same_time_different_days', e.target.checked)}
                                                    className="w-4 h-4 rounded border-gray-300 text-violet-600" />
                                                <span className="text-xs text-gray-600">No two sessions at the same period on different days</span>
                                            </label>
                                        </div>
                                    </div>
                                    {/* Placement */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Placement</label>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {PLACEMENT_POSITIONS.map(pp => (
                                                <button key={pp} onClick={() => updateForm('rules.placement.prefer_position', pp)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${form.rules.placement?.prefer_position === pp ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                                    {pp === 'NONE' ? 'No Preference' : `Prefer ${pp}`}
                                                </button>
                                            ))}
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer mt-2">
                                            <input type="checkbox" checked={form.rules.placement?.only_free_slots !== false}
                                                onChange={e => updateForm('rules.placement.only_free_slots', e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 text-violet-600" />
                                            <span className="text-xs text-gray-600">Only place in free (unoccupied) slots</span>
                                        </label>
                                    </div>
                                </>
                            )}
                            {/* Priority */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Priority</label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {PRIORITIES.map(p => (
                                        <button key={p.value} onClick={() => updateForm('priority', p.value)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${form.priority === p.value ? `border-${p.color}-400 bg-${p.color}-50 text-${p.color}-700` : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                                {form.priority === 'SOFT' && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs text-gray-500">Weight:</span>
                                        <input type="number" min={-100} max={100} value={form.soft_weight}
                                            onChange={e => updateForm('soft_weight', parseInt(e.target.value) || 0)}
                                            className="w-20 border border-gray-200 rounded px-2 py-1 text-sm text-center" />
                                        <span className="text-[10px] text-gray-400">(positive = bonus, negative = penalty)</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 4: Visual Slots */}
                    {step === 4 && (
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                {isSlotBlocking ? 'Select slots to BLOCK' : 'Pin to specific slots (optional)'}
                            </label>
                            <p className="text-xs text-gray-400">
                                {isSlotBlocking
                                    ? 'Click on the cells below to block them. No courses will be scheduled in these slots.'
                                    : 'Click to select specific (day, period) cells. If none selected, the solver will choose automatically based on your rules above.'}
                            </p>
                            <SlotPicker
                                slots={slots || []}
                                selected={form.rules.visual_slots || []}
                                onToggle={toggleVisualSlot}
                                filled={timetableEntries || []}
                            />
                            <div className="text-[10px] text-gray-400 font-medium">
                                {(form.rules.visual_slots || []).length} slot(s) selected
                            </div>
                        </div>
                    )}

                    {/* Step 5: Review */}
                    {step === 5 && (
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Review your constraint</label>
                            <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
                                <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-gray-400 uppercase w-20">Name:</span><span className="text-sm font-bold text-gray-800">{form.name || 'Untitled'}</span></div>
                                <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-gray-400 uppercase w-20">Type:</span><span className="text-xs text-gray-600">{CONSTRAINT_TYPES.find(t => t.value === form.constraint_type)?.label}</span></div>
                                <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-gray-400 uppercase w-20">Priority:</span><span className={`text-xs font-bold text-${form.priority === 'HARD' ? 'rose' : form.priority === 'SOFT' ? 'amber' : 'blue'}-600`}>{form.priority}{form.priority === 'SOFT' ? ` (weight: ${form.soft_weight})` : ''}</span></div>
                                <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-gray-400 uppercase w-20">Scope:</span><span className="text-xs text-gray-600">{(form.scope.departments || ['*'])[0] === '*' ? 'All Depts' : form.scope.departments?.join(', ')} • {(form.scope.semesters || ['*'])[0] === '*' ? 'All Sems' : `Sem ${form.scope.semesters?.join(', ')}`}</span></div>
                                {isCourseInjection && (
                                    <>
                                        <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-gray-400 uppercase w-20">Course:</span><span className="text-xs font-mono text-gray-600">{form.target.course_code} — {form.target.course_name}</span></div>
                                        <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-gray-400 uppercase w-20">Sessions:</span><span className="text-xs text-gray-600">{form.rules.sessions_per_week?.exact || 'N/A'} per week ({form.rules.period_structure})</span></div>
                                    </>
                                )}
                                {isSlotBlocking && (
                                    <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-gray-400 uppercase w-20">Label:</span><span className="text-xs text-gray-600">{form.rules.block_label || form.name}</span></div>
                                )}
                                <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-gray-400 uppercase w-20">Slots:</span><span className="text-xs text-gray-600">{(form.rules.visual_slots || []).length > 0 ? `${form.rules.visual_slots.length} pinned` : 'Auto (solver decides)'}</span></div>
                            </div>
                            {/* Validate */}
                            <button onClick={handleValidate} disabled={validating}
                                className="px-4 py-2 text-xs font-bold text-violet-600 border-2 border-violet-200 rounded-xl hover:bg-violet-50 transition-all flex items-center gap-1.5">
                                {validating ? 'Validating...' : <><Eye className="w-3.5 h-3.5" /> Validate Constraint</>}
                            </button>
                            {validationResult && (
                                <div className={`p-3 rounded-xl border text-xs ${validationResult.valid ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                                    {validationResult.valid ? <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Constraint is valid!</div> : (
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1 font-bold"><AlertTriangle className="w-3.5 h-3.5" /> Warnings:</div>
                                            <ul className="list-disc list-inside space-y-0.5">{validationResult.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                    <button onClick={() => step > 0 ? setStep(step - 1) : onClose}
                        className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-all">
                        {step > 0 ? '← Back' : 'Cancel'}
                    </button>
                    {step < steps.length - 1 ? (
                        <button onClick={() => setStep(step + 1)}
                            className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 rounded-xl shadow-lg shadow-violet-200 transition-all">
                            Next →
                        </button>
                    ) : (
                        <button onClick={handleSubmit}
                            className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5" /> {isEdit ? 'Update' : 'Create'} Constraint
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
const UserConstraints = () => {
    const [constraints, setConstraints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [wizardOpen, setWizardOpen] = useState(false);
    const [editingConstraint, setEditingConstraint] = useState(null);

    // Support data for the wizard
    const [departments, setDepartments] = useState([]);
    const [courses, setCourses] = useState([]);
    const [slots, setSlots] = useState([]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [cRes, dRes, sRes] = await Promise.all([
                api.getUserConstraints(),
                api.getDepartments(),
                api.getSlots(),
            ]);
            setConstraints(cRes.data || []);
            setDepartments(dRes.data || []);
            setSlots(sRes.data || []);
        } catch (err) {
            console.error('Failed to load user constraints:', err);
        }
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleToggle = async (uuid) => {
        try {
            await api.toggleUserConstraint(uuid);
            setConstraints(prev => prev.map(c => c.uuid === uuid ? { ...c, enabled: !c.enabled } : c));
        } catch (err) { alert('Toggle failed'); }
    };

    const handleDelete = async (uuid) => {
        if (!window.confirm('Delete this constraint? This cannot be undone.')) return;
        try {
            await api.deleteUserConstraint(uuid);
            setConstraints(prev => prev.filter(c => c.uuid !== uuid));
        } catch (err) { alert('Delete failed'); }
    };

    const handleSave = async (data, editUuid) => {
        try {
            if (editUuid) {
                const res = await api.updateUserConstraint(editUuid, data);
                setConstraints(prev => prev.map(c => c.uuid === editUuid ? res.data : c));
            } else {
                const res = await api.createUserConstraint(data);
                setConstraints(prev => [...prev, res.data]);
            }
        } catch (err) { alert('Save failed: ' + (api.getErrorMessage(err))); }
    };

    const handleEdit = (constraint) => {
        setEditingConstraint(constraint);
        setWizardOpen(true);
    };

    const handleDuplicate = (constraint) => {
        const clone = JSON.parse(JSON.stringify(constraint));
        delete clone.id;
        delete clone.uuid;
        clone.name = `${clone.name} (Copy)`;
        setEditingConstraint(clone);
        setWizardOpen(true);
    };

    const handleCloseWizard = () => {
        setWizardOpen(false);
        setEditingConstraint(null);
    };

    // Group by priority
    const hardConstraints = constraints.filter(c => c.priority === 'HARD');
    const softConstraints = constraints.filter(c => c.priority === 'SOFT');
    const prefConstraints = constraints.filter(c => c.priority === 'PREFERENCE');

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                    <span className="text-sm font-medium text-gray-400">Loading constraints...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-violet-50/30">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm">
                <div className="max-w-5xl mx-auto px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-violet-200">
                            <Target className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-gray-800 tracking-tight">User Constraints</h1>
                            <p className="text-xs text-gray-400 font-medium">
                                {constraints.length} constraint{constraints.length !== 1 ? 's' : ''} • {constraints.filter(c => c.enabled).length} active
                            </p>
                        </div>
                    </div>
                    <button onClick={() => { setEditingConstraint(null); setWizardOpen(true); }}
                        className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 rounded-xl shadow-lg shadow-violet-200 transition-all flex items-center gap-1.5">
                        <Plus className="w-4 h-4" /> New Constraint
                    </button>
                </div>
            </div>

            {/* Info Banner */}
            <div className="max-w-5xl mx-auto px-8 mt-6">
                <div className="flex items-start gap-3 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                    <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-blue-600 leading-relaxed">
                        <strong>Create custom scheduling rules</strong> — inject subjects like Yoga or Library, block time slots for events, or define faculty constraints.
                        Rules are applied during the <strong>next timetable generation</strong>.
                    </div>
                </div>
            </div>

            {/* Constraints List */}
            <div className="max-w-5xl mx-auto px-8 py-6 space-y-6">
                {constraints.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mb-4">
                            <Target className="w-8 h-8 text-violet-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-700 mb-1">No constraints yet</h3>
                        <p className="text-sm text-gray-400 mb-6 max-w-md">
                            Create your first custom constraint to add subjects, block slots, or define scheduling rules.
                        </p>
                        <button onClick={() => { setEditingConstraint(null); setWizardOpen(true); }}
                            className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-violet-200 flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Create First Constraint
                        </button>
                    </div>
                ) : (
                    <>
                        {hardConstraints.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Shield className="w-4 h-4 text-rose-500" />
                                    <h2 className="text-xs font-bold text-rose-500 uppercase tracking-wider">Hard Constraints</h2>
                                    <span className="text-[9px] font-bold bg-rose-50 text-rose-400 px-2 py-0.5 rounded-full">{hardConstraints.length}</span>
                                </div>
                                <div className="space-y-2">
                                    {hardConstraints.map(c => <ConstraintCard key={c.uuid} constraint={c} onToggle={handleToggle} onEdit={handleEdit} onDelete={handleDelete} onDuplicate={handleDuplicate} />)}
                                </div>
                            </div>
                        )}
                        {softConstraints.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Star className="w-4 h-4 text-amber-500" />
                                    <h2 className="text-xs font-bold text-amber-500 uppercase tracking-wider">Soft Constraints</h2>
                                    <span className="text-[9px] font-bold bg-amber-50 text-amber-400 px-2 py-0.5 rounded-full">{softConstraints.length}</span>
                                </div>
                                <div className="space-y-2">
                                    {softConstraints.map(c => <ConstraintCard key={c.uuid} constraint={c} onToggle={handleToggle} onEdit={handleEdit} onDelete={handleDelete} onDuplicate={handleDuplicate} />)}
                                </div>
                            </div>
                        )}
                        {prefConstraints.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Zap className="w-4 h-4 text-blue-500" />
                                    <h2 className="text-xs font-bold text-blue-500 uppercase tracking-wider">Preferences</h2>
                                    <span className="text-[9px] font-bold bg-blue-50 text-blue-400 px-2 py-0.5 rounded-full">{prefConstraints.length}</span>
                                </div>
                                <div className="space-y-2">
                                    {prefConstraints.map(c => <ConstraintCard key={c.uuid} constraint={c} onToggle={handleToggle} onEdit={handleEdit} onDelete={handleDelete} onDuplicate={handleDuplicate} />)}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer */}
            <div className="max-w-5xl mx-auto px-8 pb-10">
                <div className="flex items-center justify-center gap-2 text-[10px] text-gray-300 font-medium">
                    <Sparkles className="w-3 h-3" />
                    <span>Constraints are processed by the OR-Tools CP-SAT Solver</span>
                </div>
            </div>

            {/* Wizard Modal */}
            <ConstraintWizard
                isOpen={wizardOpen}
                onClose={handleCloseWizard}
                onSave={handleSave}
                existingConstraint={editingConstraint}
                departments={departments}
                courses={courses}
                slots={slots}
                timetableEntries={[]}
            />
        </div>
    );
};

export default UserConstraints;
