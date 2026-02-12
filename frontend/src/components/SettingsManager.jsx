import React, { useState } from 'react';
import { Save, Building, Clock, Database, Trash2 } from 'lucide-react';

const SettingsManager = () => {
    const [instName, setInstName] = useState("University of Technology");
    const [workingDays, setWorkingDays] = useState(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const toggleDay = (day) => {
        if (workingDays.includes(day)) {
            setWorkingDays(workingDays.filter(d => d !== day));
        } else {
            setWorkingDays([...workingDays, day]);
        }
    };

    const handleSave = (e) => {
        e.preventDefault();
        alert("Settings saved successfully!");
        // Add actual API call here later
    };

    return (
        <div className="space-y-8">
            {/* Institution Profile */}
            <section className="glass-card p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center">
                        <Building size={20} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Institution Profile</h3>
                        <p className="text-sm text-slate-500">Manage your organization details</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-6 max-w-lg">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Institution Name</label>
                        <input
                            type="text"
                            value={instName}
                            onChange={(e) => setInstName(e.target.value)}
                            className="input-field"
                            placeholder="e.g. Gotham University"
                        />
                    </div>
                    <button type="submit" className="btn-primary flex items-center gap-2">
                        <Save size={18} />
                        Save Changes
                    </button>
                </form>
            </section>

            {/* Scheduling Config */}
            <section className="glass-card p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                        <Clock size={20} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Scheduling Configuration</h3>
                        <p className="text-sm text-slate-500">Define your academic week structure</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="block text-sm font-medium text-slate-700">Working Days</label>
                    <div className="flex flex-wrap gap-3">
                        {days.map(day => (
                            <button
                                key={day}
                                onClick={() => toggleDay(day)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${workingDays.includes(day)
                                        ? 'bg-primary-600 text-white shadow-md'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Data Management */}
            <section className="glass-card p-8 border-l-4 border-red-500">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                        <Database size={20} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Data Management</h3>
                        <p className="text-sm text-slate-500">Dangerous actions area</p>
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                    <div>
                        <h4 className="font-bold text-red-800">Reset Database</h4>
                        <p className="text-sm text-red-600">This will permanently delete all faculties, subjects, and generated timetables.</p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium transition-colors">
                        <Trash2 size={18} />
                        Clear All Data
                    </button>
                </div>
            </section>
        </div>
    );
};

export default SettingsManager;
