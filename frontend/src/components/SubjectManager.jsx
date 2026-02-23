import React, { useState, useEffect, useMemo } from 'react';
import { getCourses, createCourse } from '../utils/api';
import { Plus, BookOpen, Search, Filter } from 'lucide-react';

const SubjectManager = () => {
    const [subjects, setSubjects] = useState([]);
    const [isAdding, setIsAdding] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSemester, setFilterSemester] = useState('All');
    const [filterCredits, setFilterCredits] = useState('All');
    const [filterType, setFilterType] = useState('All');

    const [newSubject, setNewSubject] = useState({
        course_code: '', course_name: '', semester: 1, department_code: '', weekly_sessions: 3, credits: 3, course_category: 'Core'
    });

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        try {
            const res = await getCourses();
            setSubjects(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createCourse(newSubject);
            setIsAdding(false);
            fetchSubjects();
        } catch (err) {
            console.error(err);
            alert("Error saving subject: " + (err.response?.data?.detail || err.message));
        }
    };

    // Filter Logic
    const filteredSubjects = useMemo(() => {
        return subjects.filter(sub => {
            const matchesSearch = (sub.course_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (sub.course_code || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesSem = filterSemester === 'All' || sub.semester?.toString() === filterSemester;
            const matchesCredits = filterCredits === 'All' || sub.credits?.toString() === filterCredits;

            // For type, we can check category or the boolean flags
            let matchesType = true;
            if (filterType !== 'All') {
                if (filterType === 'Core') matchesType = !sub.is_lab && !sub.is_elective && !sub.is_honours && !sub.is_add_course && !sub.is_minor && !sub.is_open_elective;
                else if (filterType === 'Lab') matchesType = sub.is_lab;
                else if (filterType === 'Elective') matchesType = sub.is_elective || sub.is_open_elective;
                else if (filterType === 'Honours/Minor') matchesType = sub.is_honours || sub.is_minor;
                else if (filterType === 'Add Course') matchesType = sub.is_add_course;
            }

            return matchesSearch && matchesSem && matchesCredits && matchesType;
        });
    }, [subjects, searchTerm, filterSemester, filterCredits, filterType]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Subjects</h3>
                <button
                    onClick={() => setIsAdding(true)}
                    className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
                >
                    <Plus size={16} /> Add Subject
                </button>
            </div>

            {/* Filters Section */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap gap-4 items-center shadow-sm">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by code or name..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-4 flex-wrap">
                    <select
                        className="py-2 px-3 border border-slate-200 rounded-lg text-sm bg-slate-50 outline-none focus:border-primary-500"
                        value={filterSemester}
                        onChange={(e) => setFilterSemester(e.target.value)}
                    >
                        <option value="All">All Semesters</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>

                    <select
                        className="py-2 px-3 border border-slate-200 rounded-lg text-sm bg-slate-50 outline-none focus:border-primary-500"
                        value={filterCredits}
                        onChange={(e) => setFilterCredits(e.target.value)}
                    >
                        <option value="All">All Credits</option>
                        {[1, 2, 3, 4, 5, 6].map(c => <option key={c} value={c}>{c} Credits</option>)}
                    </select>

                    <select
                        className="py-2 px-3 border border-slate-200 rounded-lg text-sm bg-slate-50 outline-none focus:border-primary-500"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="All">All Types</option>
                        <option value="Core">Core</option>
                        <option value="Lab">Lab</option>
                        <option value="Elective">Elective</option>
                        <option value="Honours/Minor">Honours & Minors</option>
                        <option value="Add Course">Add Course</option>
                    </select>
                </div>
            </div>

            {subjects.length === 0 ? (
                <div className="text-center py-20 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BookOpen size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-600 mb-1">No Subjects Found</h3>
                    <p className="text-slate-500 mb-6 max-w-xs mx-auto">Add subjects to start building your curriculum.</p>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="btn-primary py-2 px-6"
                    >
                        Add First Subject
                    </button>
                </div>
            ) : filteredSubjects.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-slate-500">No subjects match your filters.</p>
                    <button onClick={() => { setSearchTerm(''); setFilterSemester('All'); setFilterCredits('All'); setFilterType('All'); }} className="text-primary-600 text-sm mt-2 hover:underline">
                        Clear all filters
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSubjects.map(sub => (
                        <div key={sub.course_code} className="glass-card p-4 flex flex-col gap-2 relative group overflow-hidden">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center shrink-0">
                                    <BookOpen size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-800 truncate" title={sub.course_name}>{sub.course_name}</p>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                                        <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">{sub.course_code}</span>
                                        <span className="text-xs font-medium text-slate-500">Sem {sub.semester}</span>
                                        <span className="text-xs font-medium text-slate-500">{sub.credits || 0} Cr</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100 flex-wrap">
                                {sub.is_add_course && <span className="text-[10px] font-bold px-2 py-1 bg-amber-100 text-amber-700 rounded-full">ADD COURSE</span>}
                                {sub.is_honours && <span className="text-[10px] font-bold px-2 py-1 bg-purple-100 text-purple-700 rounded-full">HONOURS</span>}
                                {sub.is_minor && <span className="text-[10px] font-bold px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">MINOR</span>}
                                {sub.is_lab && <span className="text-[10px] font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">LAB</span>}
                                {!(sub.is_add_course || sub.is_honours || sub.is_minor || sub.is_lab) && sub.course_category && (
                                    <span className="text-[10px] font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">{sub.course_category.toUpperCase()}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isAdding && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
                        <h4 className="text-xl font-bold mb-6">Add New Subject</h4>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input
                                placeholder="Course Code (e.g. 22CS101)"
                                className="input-field"
                                value={newSubject.course_code}
                                onChange={e => setNewSubject({ ...newSubject, course_code: e.target.value })}
                                required
                            />
                            <input
                                placeholder="Course Name"
                                className="input-field"
                                value={newSubject.course_name}
                                onChange={e => setNewSubject({ ...newSubject, course_name: e.target.value })}
                                required
                            />
                            <div className="flex gap-4">
                                <input
                                    type="number"
                                    placeholder="Semester"
                                    className="input-field"
                                    value={newSubject.semester}
                                    onChange={e => setNewSubject({ ...newSubject, semester: parseInt(e.target.value) })}
                                    required
                                />
                                <input
                                    type="number"
                                    placeholder="Credits"
                                    className="input-field"
                                    value={newSubject.credits}
                                    onChange={e => setNewSubject({ ...newSubject, credits: parseInt(e.target.value) })}
                                    required
                                />
                                <input
                                    type="number"
                                    placeholder="Sessions/Wk"
                                    className="input-field"
                                    value={newSubject.weekly_sessions}
                                    onChange={e => setNewSubject({ ...newSubject, weekly_sessions: parseInt(e.target.value) })}
                                    required
                                />
                            </div>
                            <input
                                placeholder="Department Code (e.g. CSE)"
                                className="input-field"
                                value={newSubject.department_code}
                                onChange={e => setNewSubject({ ...newSubject, department_code: e.target.value })}
                                required
                            />
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 text-slate-500 font-medium">Cancel</button>
                                <button type="submit" className="flex-1 btn-primary">Save Subject</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubjectManager;
