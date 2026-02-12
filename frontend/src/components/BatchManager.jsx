import React, { useState, useEffect } from 'react';
import { getBatches, createBatch } from '../utils/api';
import { Plus, Users } from 'lucide-react';

const BatchManager = () => {
    const [batches, setBatches] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newBatch, setNewBatch] = useState({
        name: '', semester: 1, size: 30, department: ''
    });

    useEffect(() => {
        fetchBatches();
    }, []);

    const fetchBatches = async () => {
        try {
            const res = await getBatches();
            setBatches(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createBatch(newBatch);
            setIsAdding(false);
            fetchBatches();
        } catch (err) {
            console.error(err);
            alert("Error saving batch: " + (err.response?.data?.detail || err.message));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Student Batches</h3>
                <button
                    onClick={() => setIsAdding(true)}
                    className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
                >
                    <Plus size={16} /> Add Batch
                </button>
            </div>

            {batches.length === 0 ? (
                <div className="text-center py-20 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 col-span-full">
                    <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-600 mb-1">No Batches Found</h3>
                    <p className="text-slate-500 mb-6 max-w-xs mx-auto">Create student batches to schedule classes for.</p>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="btn-primary py-2 px-6"
                    >
                        Add First Batch
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {batches.map(batch => (
                        <div key={batch.id} className="glass-card p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Users className="text-primary-600" size={20} />
                                <h4 className="font-bold text-slate-800">{batch.name}</h4>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-slate-500 uppercase tracking-wider">{batch.department}</p>
                                <p className="text-sm font-semibold">Semester {batch.semester}</p>
                                <p className="text-sm text-slate-600">{batch.size} Students</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isAdding && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
                        <h4 className="text-xl font-bold mb-6">Add New Batch</h4>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input
                                placeholder="Batch Name (e.g. CSE-A 2024)"
                                className="input-field"
                                value={newBatch.name}
                                onChange={e => setNewBatch({ ...newBatch, name: e.target.value })}
                                required
                            />
                            <div className="flex gap-4">
                                <input
                                    type="number"
                                    placeholder="Semester"
                                    className="input-field"
                                    value={newBatch.semester}
                                    onChange={e => setNewBatch({ ...newBatch, semester: parseInt(e.target.value) })}
                                    required
                                />
                                <input
                                    type="number"
                                    placeholder="Size"
                                    className="input-field"
                                    value={newBatch.size}
                                    onChange={e => setNewBatch({ ...newBatch, size: parseInt(e.target.value) })}
                                    required
                                />
                            </div>
                            <input
                                placeholder="Department"
                                className="input-field"
                                value={newBatch.department}
                                onChange={e => setNewBatch({ ...newBatch, department: e.target.value })}
                                required
                            />
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 text-slate-500 font-medium">Cancel</button>
                                <button type="submit" className="flex-1 btn-primary">Save Batch</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BatchManager;
