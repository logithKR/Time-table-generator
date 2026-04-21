import React, { useState, useEffect } from 'react';
import * as api from '../utils/api';
import { Users } from 'lucide-react';

const LearningModeSelector = ({ department, semester, selectedModes, onModesChange, className = "" }) => {
    const [capacities, setCapacities] = useState({});
    
    useEffect(() => {
        if (!department || !semester) {
            setCapacities({});
            return;
        }
        
        const fetchCapacities = async () => {
            try {
                const res = await api.getDepartmentCapacities(department);
                // res.data is an array of objects
                const semData = res.data.find(d => String(d.semester) === String(semester));
                if (semData && semData.student_count_data) {
                    try {
                        const parsed = JSON.parse(semData.student_count_data);
                        setCapacities(parsed);
                    } catch (e) {
                        console.error('Failed to parse student_count_data JSON', e);
                        setCapacities({});
                    }
                } else {
                    setCapacities({});
                }
            } catch (err) {
                console.error("Failed to load capacities for learning modes", err);
            }
        };
        fetchCapacities();
    }, [department, semester]);

    const handleToggle = (id) => {
        const updated = selectedModes.includes(id)
            ? selectedModes.filter(m => m !== id)
            : [...selectedModes, id];
        
        // Prevent deselecting all
        if (updated.length > 0) {
            onModesChange(updated);
        }
    };

    const modesList = [
        { id: 1, label: 'UAL', title: 'University Autonomous Learning', color: 'blue', dotColor: 'bg-blue-500' },
        { id: 2, label: 'PBL', title: 'Project Based Learning', color: 'emerald', dotColor: 'bg-emerald-500' }
    ];

    // Determine visual style based on parent placement (e.g., inline block vs full width panel)
    return (
        <div className={`flex flex-wrap items-center gap-3 bg-violet-50/50 p-2 border border-violet-100 rounded-xl ${className}`}>
            {modesList.map(mode => {
                const count = capacities[String(mode.id)] || 0;
                const isSelected = selectedModes.includes(mode.id);
                
                return (
                    <button
                        key={mode.id}
                        onClick={() => handleToggle(mode.id)}
                        title={mode.title}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all border-2 ${
                            isSelected
                                ? 'bg-violet-600 text-white border-violet-600 shadow-md'
                                : 'bg-white text-gray-500 border-violet-100 hover:border-violet-300'
                        }`}
                    >
                        <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : mode.dotColor}`} />
                        <span>{mode.label}</span>
                        {count > 0 && (
                            <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md ${isSelected ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
                                <Users className="w-3 h-3" /> {count} 
                            </span>
                        )}
                    </button>
                );
            })}
            <span className="ml-auto text-[10px] text-violet-400 font-bold uppercase tracking-widest self-center pr-1 hidden sm:inline-block">
                {selectedModes.length === 2 ? 'Combined Mode' : 'Selective Mode'}
            </span>
        </div>
    );
};

export default LearningModeSelector;
