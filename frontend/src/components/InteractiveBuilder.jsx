import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSubjects, getBatches, getFaculties, getTimetable } from '../utils/api';
import { Sparkles, Magnet, AlertCircle, Save } from 'lucide-react';

const InteractiveBuilder = () => {
    const [unscheduled, setUnscheduled] = useState([]);
    const [schedule, setSchedule] = useState({}); // { "Monday-9": { subject, faculty, batch } }
    const [subjects, setSubjects] = useState([]);
    const [batches, setBatches] = useState([]);

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const hours = Array.from({ length: 8 }, (_, i) => i + 9);

    useEffect(() => {
        initializeBuilder();
    }, []);

    const initializeBuilder = async () => {
        try {
            const [subRes, batchRes] = await Promise.all([getSubjects(), getBatches()]);
            setSubjects(subRes.data);
            setBatches(batchRes.data);

            // Generate distinct class blocks (e.g., if Math has 3 classes/week, create 3 blocks)
            let blocks = [];
            batchRes.data.forEach(batch => {
                subRes.data.forEach(sub => {
                    // Filter subjects by department/semester matches if necessary
                    // For demo, we just add all subjects for each batch
                    if (sub.department === batch.department && sub.semester === batch.semester) {
                        for (let i = 0; i < sub.classes_per_week; i++) {
                            blocks.push({
                                id: `${batch.id}-${sub.id}-${i}`,
                                batch: batch,
                                subject: sub,
                                color: getColor(sub.name)
                            });
                        }
                    }
                });
            });
            setUnscheduled(blocks);
        } catch (err) {
            console.error("Failed to init builder", err);
        }
    };

    const getColor = (str) => {
        const colors = ['bg-red-400', 'bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-yellow-400', 'bg-pink-400', 'bg-indigo-400'];
        let hash = 0;
        for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    const handleDrop = (e, info, block) => {
        // Simple collision detection based on mouse position
        const elements = document.elementsFromPoint(info.point.x, info.point.y);
        const slot = elements.find(el => el.dataset.slotId);

        if (slot) {
            const slotId = slot.dataset.slotId;
            // Check for conflicts (simple check: is slot empty?)
            if (!schedule[slotId]) {
                setSchedule(prev => ({ ...prev, [slotId]: block }));
                setUnscheduled(prev => prev.filter(b => b.id !== block.id));
            }
        }
    };

    const returnToDock = (slotId) => {
        const block = schedule[slotId];
        if (block) {
            setUnscheduled(prev => [...prev, block]);
            setSchedule(prev => {
                const newSched = { ...prev };
                delete newSched[slotId];
                return newSched;
            });
        }
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col relative overflow-hidden bg-slate-50 rounded-2xl border border-slate-200 shadow-xl">
            {/* Header */}
            <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center z-10 shadow-sm relative">
                <div className="flex items-center gap-2">
                    <Sparkles className="text-purple-600" />
                    <h2 className="font-bold text-lg text-slate-800">Anti-Gravity Builder</h2>
                </div>
                <div className="flex gap-2 text-sm text-slate-500">
                    <div className="flex items-center gap-1"><Magnet size={14} /> Magnetic Snap On</div>
                    <div className="flex items-center gap-1 text-orange-500"><AlertCircle size={14} /> Physics Active</div>
                </div>
            </div>

            {/* Timetable Grid area */}
            <div className="flex-1 overflow-auto p-8 pb-40">
                <div className="grid grid-cols-[auto_repeat(5,1fr)] gap-4 select-none">
                    {/* Header Row */}
                    <div className="h-12"></div>
                    {days.map(day => (
                        <div key={day} className="h-12 flex items-center justify-center font-bold text-slate-600 bg-white/50 rounded-lg backdrop-blur-sm">
                            {day}
                        </div>
                    ))}

                    {/* Time Slots */}
                    {hours.map(hour => (
                        <React.Fragment key={hour}>
                            {/* Time Label */}
                            <div className="flex items-center justify-center font-mono text-sm text-slate-400">
                                {hour}:00
                            </div>

                            {/* Drop Zones */}
                            {days.map(day => {
                                const slotId = `${day}-${hour}`;
                                const scheduledBlock = schedule[slotId];

                                return (
                                    <div
                                        key={slotId}
                                        data-slot-id={slotId}
                                        className={`h-24 rounded-xl border-2 transition-all relative group
                                            ${scheduledBlock ? 'border-transparent bg-white shadow-md' : 'border-dashed border-slate-200 bg-slate-100/50 hover:border-purple-300 hover:bg-purple-50'}`}
                                    >
                                        {scheduledBlock ? (
                                            <motion.div
                                                layoutId={scheduledBlock.id}
                                                className={`absolute inset-0 m-1 rounded-lg ${scheduledBlock.color} p-2 text-white shadow-sm cursor-grab active:cursor-grabbing flex flex-col justify-center items-center text-center`}
                                                drag
                                                dragSnapToOrigin
                                                onDragEnd={(e, info) => {
                                                    // Only remove if dragged far enough away
                                                    if (Math.abs(info.offset.x) > 50 || Math.abs(info.offset.y) > 50) {
                                                        returnToDock(slotId);
                                                    }
                                                }}
                                            >
                                                <span className="font-bold text-xs">{scheduledBlock.subject.name}</span>
                                                <span className="text-[10px] opacity-90">{scheduledBlock.subject.code}</span>
                                            </motion.div>
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Magnet className="text-purple-300" size={20} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Anti-Gravity Dock */}
            <div className="absolute bottom-0 left-0 right-0 h-48 bg-slate-900/90 backdrop-blur-md rounded-t-3xl border-t border-slate-700 p-6 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
                <div className="text-slate-400 text-xs font-bold uppercase mb-4 flex justify-between">
                    <span>Unscheduled Modules ({unscheduled.length})</span>
                    <span>Drag to Schedule</span>
                </div>

                <div className="flex flex-wrap gap-3 overflow-y-auto h-full pb-10">
                    <AnimatePresence>
                        {unscheduled.map((block) => (
                            <motion.div
                                key={block.id}
                                layoutId={block.id}
                                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                                animate={{
                                    opacity: 1,
                                    scale: 1,
                                    y: 0,
                                    // Floating "Anti-Gravity" effect
                                    y: [0, -5, 0],
                                    transition: {
                                        y: {
                                            repeat: Infinity,
                                            duration: 3 + Math.random(),
                                            ease: "easeInOut"
                                        }
                                    }
                                }}
                                exit={{ opacity: 0, scale: 0 }}
                                drag
                                whileDrag={{ scale: 1.1, zIndex: 100 }}
                                onDragEnd={(e, info) => handleDrop(e, info, block)}
                                className={`w-24 h-24 ${block.color} rounded-xl shadow-lg cursor-grab active:cursor-grabbing flex flex-col items-center justify-center p-2 text-white relative`}
                            >
                                <div className="font-bold text-xs text-center leading-tight mb-1">{block.subject.name}</div>
                                <div className="text-[10px] bg-white/20 px-1.5 rounded">{block.batch.name}</div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {unscheduled.length === 0 && (
                        <div className="w-full text-center py-8 text-slate-500 italic">
                            All classes scheduled! Good job.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InteractiveBuilder;
