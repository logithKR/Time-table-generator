import React, { useState, useEffect } from 'react';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../utils/api';
import { Building2, Plus, Pencil, Check, X, Trash2, Users } from 'lucide-react';

const DepartmentsManager = () => {
    const [departments, setDepartments] = useState([]);
    const [isAdding, setIsAdding] = useState(false);

    // Edit state
    const [editingCode, setEditingCode] = useState(null);
    const [editCount, setEditCount] = useState('');

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const res = await getDepartments();
            setDepartments(res.data);
        } catch (err) {
            console.error("Failed to fetch departments", err);
        }
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const code = fd.get('department_code').toUpperCase();
        const count = fd.get('student_count') || 0;

        try {
            await createDepartment({
                department_code: code,
                student_count: parseInt(count)
            });
            await fetchDepartments();
            setIsAdding(false);
            e.target.reset();
        } catch (err) {
            alert(err.response?.data?.detail || err.message);
        }
    };

    const handleSaveEdit = async (code) => {
        try {
            await updateDepartment(code, {
                student_count: parseInt(editCount) || 0
            });
            await fetchDepartments();
            setEditingCode(null);
            setEditCount('');
        } catch (err) {
            alert(err.response?.data?.detail || err.message);
        }
    };

    const handleDelete = async (code) => {
        if (!window.confirm(`Are you sure you want to delete ${code}? This can only be done if no faculty or courses are linked.`)) return;
        try {
            await deleteDepartment(code);
            await fetchDepartments();
        } catch (err) {
            alert(err.response?.data?.detail || err.message);
        }
    };

    const startEdit = (dept) => {
        setEditingCode(dept.department_code);
        setEditCount(dept.student_count || 0);
    };

    const cancelEdit = () => {
        setEditingCode(null);
        setEditCount('');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="w-6 h-6 text-indigo-600" /> Department Manager
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Manage departments and maximum student capacities.</p>
                </div>

                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all active:scale-95"
                >
                    <Plus className="w-4 h-4" /> Add Department
                </button>
            </div>

            {isAdding && (
                <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-xl shadow-indigo-100/50 p-6">
                    <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Plus className="w-4 h-4 text-indigo-600" /> Add New Department
                    </h4>
                    <form onSubmit={handleAddSubmit} className="flex flex-col md:flex-row gap-3">
                        <input
                            name="department_code"
                            placeholder="Department Code (e.g., CSE) *"
                            required
                            className="flex-1 p-2.5 border border-indigo-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 focus:outline-none shadow-sm uppercase placeholder:normal-case"
                        />
                        <input
                            name="student_count"
                            type="number"
                            placeholder="Student Capacity (Optional)"
                            min="0"
                            className="flex-1 p-2.5 border border-indigo-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 focus:outline-none shadow-sm"
                        />
                        <div className="flex gap-2 shrink-0">
                            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all">Save</button>
                            <button type="button" onClick={() => setIsAdding(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-medium transition-all">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departments.map(dept => (
                    <div key={dept.department_code} className="bg-white rounded-2xl border border-indigo-100 shadow-sm hover:shadow-md transition-shadow p-5 relative group overflow-hidden">
                        {/* Status decoration */}
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>

                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="text-xl font-black text-slate-800 tracking-tight">
                                    {dept.department_code}
                                </h4>
                                <p className="text-xs text-slate-400 font-medium">Department Code</p>
                            </div>

                            <div className="flex gap-1">
                                {editingCode !== dept.department_code ? (
                                    <>
                                        <button onClick={() => startEdit(dept)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Capacity">
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(dept.department_code)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Delete Department">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : null}
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <div className="flex items-center text-sm font-medium text-slate-600 mb-2">
                                <Users className="w-4 h-4 mr-1.5" /> Student Capacity
                            </div>

                            {editingCode === dept.department_code ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        autoFocus
                                        value={editCount}
                                        onChange={(e) => setEditCount(e.target.value)}
                                        className="w-24 p-1.5 text-sm border-2 border-indigo-300 rounded focus:outline-none focus:ring-0 focus:border-indigo-500"
                                    />
                                    <button onClick={() => handleSaveEdit(dept.department_code)} className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded transition-colors" title="Save">
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button onClick={cancelEdit} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded transition-colors" title="Cancel">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-baseline">
                                    <span className="text-2xl font-bold text-indigo-700">
                                        {dept.student_count || 0}
                                    </span>
                                    <span className="text-xs text-slate-500 ml-1">students</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {departments.length === 0 && !isAdding && (
                    <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
                        No departments found. Click "Add Department" to start.
                    </div>
                )}
            </div>
        </div>
    );
};

export default DepartmentsManager;
