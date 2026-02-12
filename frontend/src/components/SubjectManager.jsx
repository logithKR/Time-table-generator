import React, { useState, useEffect } from 'react';
import { getSubjects, createSubject } from '../utils/api';
import { Plus, BookOpen } from 'lucide-react';

const SubjectManager = () => {
    const [subjects, setSubjects] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newSubject, setNewSubject] = useState({
        code: '', name: '', semester: 1, department: '', classes_per_week: 3
    });

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        try {
            const res = await getSubjects();
            setSubjects(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createSubject(newSubject);
            setIsAdding(false);
            fetchSubjects();
        } catch (err) {
            console.error(err);
            alert("Error saving subject: " + (err.response?.data?.detail || err.message));
        }
    };

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
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {subjects.map(sub => (
                        <div key={sub.id} className="glass-card p-4 flex items-center gap-4">
                            <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center">
                                <BookOpen size={20} />
                            </div>
                            <div>
                                <p className="font-bold">{sub.name}</p>
                                <p className="text-sm text-slate-500">{sub.code} • Sem {sub.semester}</p>
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
                                placeholder="Code (e.g. CS101)"
                                className="input-field"
                                value={newSubject.code}
                                onChange={e => setNewSubject({ ...newSubject, code: e.target.value })}
                                required
                            />
                            <input
                                placeholder="Subject Name"
                                className="input-field"
                                value={newSubject.name}
                                onChange={e => setNewSubject({ ...newSubject, name: e.target.value })}
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
                                    placeholder="Classes/Week"
                                    className="input-field"
                                    value={newSubject.classes_per_week}
                                    onChange={e => setNewSubject({ ...newSubject, classes_per_week: parseInt(e.target.value) })}
                                    required
                                />
                            </div>
                            <input
                                placeholder="Department"
                                className="input-field"
                                value={newSubject.department}
                                onChange={e => setNewSubject({ ...newSubject, department: e.target.value })}
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
