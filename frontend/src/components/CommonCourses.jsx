import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../utils/api';
import {
    Link2, Plus, Trash2, Save, Check, AlertCircle, X,
    GraduationCap, RefreshCw, ChevronDown, BookOpen
} from 'lucide-react';

const CommonCourses = ({ allCourses = [], departments = [] }) => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(null);
    const [error, setError] = useState(null);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [formCode, setFormCode] = useState('');
    const [formSem, setFormSem] = useState(6);
    const [formDepts, setFormDepts] = useState([]);
    const [editKey, setEditKey] = useState(null); // null = new

    // Filter honours/minor courses only
    const honMinCourses = allCourses.filter(c => c.is_honours || c.is_minor);
    const semesters = [...new Set(honMinCourses.map(c => c.semester))].sort();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.getCommonCourses();
            setGroups(res.data);
        } catch (e) {
            setError('Failed to load common courses');
        }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const openNew = () => {
        setFormCode('');
        setFormSem(semesters[0] || 6);
        setFormDepts([]);
        setEditKey(null);
        setShowForm(true);
    };

    const openEdit = (g) => {
        setFormCode(g.course_code);
        setFormSem(g.semester);
        setFormDepts([...g.departments]);
        setEditKey(`${g.course_code}__${g.semester}`);
        setShowForm(true);
    };

    const toggleDept = (dept) => {
        setFormDepts(prev =>
            prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
        );
    };

    const handleSave = async () => {
        if (!formCode) return;
        if (formDepts.length < 2) { setError('Select at least 2 departments'); return; }
        setSaving(true); setError(null);
        try {
            await api.saveCommonCourse({
                course_code: formCode,
                semester: formSem,
                department_codes: formDepts
            });
            setSaved(formCode);
            setTimeout(() => setSaved(null), 2000);
            setShowForm(false);
            load();
        } catch (e) {
            setError(e.response?.data?.detail || 'Save failed');
        }
        setSaving(false);
    };

    const handleDelete = async (code, sem) => {
        if (!window.confirm(`Remove "${code}" (Sem ${sem}) as a common course?`)) return;
        try {
            await api.deleteCommonCourse(code, sem);
            load();
        } catch (e) {
            setError('Delete failed');
        }
    };

    // Courses available for selected semester
    const semCourses = honMinCourses.filter(c => c.semester === Number(formSem));

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-violet-50/30">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm">
                <div className="max-w-5xl mx-auto px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-violet-200">
                            <Link2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-gray-800 tracking-tight">Common Courses</h1>
                            <p className="text-xs text-gray-400 font-medium">
                                Shared Honours/Minor courses that sync across departments
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={load} className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:bg-gray-50 transition-all" title="Refresh">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={openNew}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-violet-200 hover:from-violet-600 hover:to-purple-700 transition-all"
                        >
                            <Plus className="w-4 h-4" /> New Common Course
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-8 py-6 space-y-5">
                {/* Info banner */}
                <div className="flex items-start gap-3 p-4 bg-blue-50/60 border border-blue-100 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-blue-700 leading-relaxed">
                        <strong>How it works:</strong> Mark an Honours or Minor course as <em>common</em> when the same course appears in multiple departments.
                        When generating timetables, the system will place it in the <strong>same day and period</strong> across all selected departments.
                        The first department generated "anchors" the slot; subsequent departments sync to it.
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                        <AlertCircle className="w-4 h-4 shrink-0" />{error}
                        <button onClick={() => setError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
                    </div>
                )}

                {/* Inline Form */}
                {showForm && (
                    <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/30 p-6 shadow-sm space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sm text-gray-800">
                                {editKey ? 'Edit Common Course' : 'Add Common Course'}
                            </h3>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Semester picker */}
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-gray-600 mb-1.5 block">Semester</label>
                                <div className="relative">
                                    <select
                                        value={formSem}
                                        onChange={e => { setFormSem(Number(e.target.value)); setFormCode(''); }}
                                        className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl bg-white focus:border-violet-400 focus:outline-none appearance-none"
                                    >
                                        {semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
                                        {semesters.length === 0 && <option value={6}>Semester 6</option>}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="flex-[2]">
                                <label className="text-xs font-bold text-gray-600 mb-1.5 block">Course</label>
                                <div className="relative">
                                    <select
                                        value={formCode}
                                        onChange={e => setFormCode(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl bg-white focus:border-violet-400 focus:outline-none appearance-none"
                                    >
                                        <option value="">— Select a course —</option>
                                        {semCourses.map(c => (
                                            <option key={`${c.course_code}-${c.department_code}`} value={c.course_code}>
                                                {c.course_code} — {c.course_name} [{c.is_honours ? 'H' : 'M'}]
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Department multi-select */}
                        <div>
                            <label className="text-xs font-bold text-gray-600 mb-2 block">
                                Departments <span className="text-violet-500">({formDepts.length} selected — min 2)</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {departments.map(d => (
                                    <button
                                        key={d.department_code}
                                        onClick={() => toggleDept(d.department_code)}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-xl border-2 transition-all ${formDepts.includes(d.department_code)
                                                ? 'bg-violet-500 border-violet-500 text-white shadow-sm'
                                                : 'bg-white border-gray-200 text-gray-600 hover:border-violet-300'
                                            }`}
                                    >
                                        {d.department_code}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 pt-1">
                            <button
                                onClick={handleSave}
                                disabled={saving || !formCode || formDepts.length < 2}
                                className={`flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl transition-all ${formCode && formDepts.length >= 2
                                        ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-200 hover:from-violet-600 hover:to-purple-700'
                                        : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                    }`}
                            >
                                {saving ? 'Saving...' : saved ? <><Check className="w-3.5 h-3.5" /> Saved!</> : <><Save className="w-3.5 h-3.5" /> Save Group</>}
                            </button>
                            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-xs font-bold border-2 border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition-all">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Groups list */}
                {loading ? (
                    <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
                        <div className="w-6 h-6 border-3 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
                        <span className="text-sm font-medium">Loading common courses...</span>
                    </div>
                ) : groups.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-sm font-semibold text-gray-500">No common courses defined yet</p>
                        <p className="text-xs text-gray-400 mt-1">Click "New Common Course" to mark a shared Honours or Minor course</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {groups.map(g => {
                            const course = allCourses.find(c => c.course_code === g.course_code);
                            const isHonours = course?.is_honours;
                            return (
                                <div
                                    key={`${g.course_code}-${g.semester}`}
                                    className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-start gap-4"
                                >
                                    <div className={`p-2.5 rounded-xl shrink-0 ${isHonours ? 'bg-purple-50 text-purple-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                        <GraduationCap className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-sm text-gray-800">{g.course_code}</span>
                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${isHonours ? 'bg-purple-50 text-purple-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                {isHonours ? 'Honours' : 'Minor'}
                                            </span>
                                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Sem {g.semester}</span>
                                        </div>
                                        {course && <p className="text-xs text-gray-500 mt-0.5 truncate">{course.course_name}</p>}
                                        <div className="flex gap-1.5 flex-wrap mt-2">
                                            {g.departments.map(d => (
                                                <span key={d} className="text-[10px] font-bold px-2 py-0.5 bg-violet-50 text-violet-700 border border-violet-100 rounded-full">
                                                    {d}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => openEdit(g)}
                                            className="p-1.5 rounded-lg text-gray-300 hover:text-violet-500 hover:bg-violet-50 transition-all"
                                            title="Edit"
                                        >
                                            <Link2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(g.course_code, g.semester)}
                                            className="p-1.5 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommonCourses;
