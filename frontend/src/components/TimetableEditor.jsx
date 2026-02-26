import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DndContext, useDroppable, useDraggable, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors, pointerWithin } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import * as api from '../utils/api';
import { Search, Save, Trash2, Download, Undo2, Coffee, X, BookOpen, FlaskConical, Users2, LayoutTemplate, Palette, ArrowLeftRight, Plus, ChevronDown, Pencil, Type } from 'lucide-react';

// ─── Simplified Color Palette (Preserved) ───
const THEORY_STYLE = {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-900',
    chip: 'bg-blue-50/80 text-blue-900 border-blue-200 hover:bg-blue-100'
};

const LAB_STYLE = {
    bg: 'bg-amber-50',
    border: 'border-amber-400',
    text: 'text-amber-900',
    chip: 'bg-amber-50/80 text-amber-900 border-amber-300 ring-1 ring-amber-400/20 hover:bg-amber-100'
};

const MENTOR_STYLE = { bg: 'bg-violet-50', border: 'border-violet-300', text: 'text-violet-900' };
const OE_STYLE = { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700' };

// ─── Elegant Legend Component ───
const Legend = () => (
    <div className="flex flex-wrap justify-center gap-6 items-center bg-white px-8 py-3 mt-6 border border-violet-100 rounded-full shadow-sm w-fit mx-auto select-none transition-all hover:shadow-md hover:border-violet-200">
        <div className="flex items-center gap-2">
            <div className={`w-3.5 h-3.5 rounded-full ${THEORY_STYLE.bg} border ${THEORY_STYLE.border}`}></div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Theory</span>
        </div>
        <div className="flex items-center gap-2">
            <div className={`w-3.5 h-3.5 rounded-full ${LAB_STYLE.bg} border ${LAB_STYLE.border} flex items-center justify-center`}>
                <div className="w-1 h-1 bg-amber-400 rounded-full"></div>
            </div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lab</span>
        </div>
        <div className="flex items-center gap-2">
            <div className={`w-3.5 h-3.5 rounded-full ${MENTOR_STYLE.bg} border ${MENTOR_STYLE.border}`}></div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mentor</span>
        </div>
        <div className="flex items-center gap-2">
            <div className={`w-3.5 h-3.5 rounded-full ${OE_STYLE.bg} border ${OE_STYLE.border}`}></div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Elective</span>
        </div>
        <div className="flex items-center gap-2 border-l pl-6 border-gray-200 ml-2">
            <div className="w-3.5 h-3.5 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center">
                <Coffee className="w-2 h-2 text-gray-400" />
            </div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Break</span>
        </div>
    </div>
);

// ─── Draggable Course Chip (Palette) ───
const CourseChip = ({ course, colorStyle, facultyName, venueName }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `palette-${course.course_code}`,
        data: { type: 'new', course, facultyName, venueName }
    });
    const style = transform ? { transform: CSS.Translate.toString(transform), zIndex: 1000 } : undefined;

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}
            className={`flex-shrink-0 px-3 py-2.5 rounded-xl border cursor-grab active:cursor-grabbing transition-all hover:shadow-lg hover:shadow-purple-100/50 ${isDragging ? 'opacity-40 scale-95 shadow-xl' : 'hover:-translate-y-0.5'} ${colorStyle.chip}`}>
            <div className="flex items-center gap-1.5 mb-0.5">
                {course.is_lab ? <FlaskConical className="w-3.5 h-3.5 text-amber-700/80" /> : <BookOpen className="w-3.5 h-3.5 opacity-50" />}
                <span className="font-bold text-xs whitespace-nowrap tracking-tight">{course.course_code}</span>
            </div>
            <div className="text-[10px] opacity-70 truncate max-w-[140px] leading-tight font-medium tracking-wide">{course.course_name}</div>

            {venueName && (
                <div className="text-[8.5px] font-bold mt-1 text-indigo-700 bg-indigo-50/50 px-1 py-0.5 rounded border border-indigo-200 w-fit truncate max-w-full">
                    {venueName}
                </div>
            )}

            {course.is_lab && <span className="text-[9px] font-bold opacity-60 block mt-1 tracking-wider uppercase text-amber-800">2 Periods</span>}
        </div>
    );
};

// ─── Draggable Grid Cell Content (Dashboard-style layout) ───
const CellContent = ({ entry, sections, cellId, isLabStart, isSwapMode, isSelected, onClick }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: cellId,
        data: { type: 'placed', entry },
        disabled: isSwapMode
    });
    const style = transform ? { transform: CSS.Translate.toString(transform), zIndex: 999 } : undefined;

    if (isDragging) return <div ref={setNodeRef} style={style} className="w-full h-full rounded-xl bg-purple-50/50 border-2 border-dashed border-purple-300 opacity-60 backdrop-blur-sm" />;

    let bg, border, text;
    if (entry.session_type === 'MENTOR') {
        bg = MENTOR_STYLE.bg; border = MENTOR_STYLE.border; text = MENTOR_STYLE.text;
    }
    else if (entry.session_type === 'OPEN_ELECTIVE' || entry.course_code === 'OPEN_ELEC') {
        bg = OE_STYLE.bg; border = OE_STYLE.border; text = OE_STYLE.text;
    }
    else if (entry.session_type === 'LAB') {
        bg = LAB_STYLE.bg; border = LAB_STYLE.border; text = LAB_STYLE.text;
    } else {
        bg = THEORY_STYLE.bg; border = THEORY_STYLE.border; text = THEORY_STYLE.text;
    }

    const isMentor = entry.session_type === 'MENTOR';
    const isOE = entry.session_type === 'OPEN_ELECTIVE' || entry.course_code === 'OPEN_ELEC';
    const allSections = sections && sections.length > 0 ? sections : [entry];

    // Helper: check if a faculty name is a real displayable name
    const isValidFaculty = (name) => {
        if (!name || name.trim() === '') return false;
        const lower = name.trim().toLowerCase();
        if (lower === 'unassigned') return false;
        if (lower.includes('select')) return false;
        return true;
    };

    // Group sections by course code (like dashboard does)
    const uniqueCodes = [...new Set(allSections.map(s => s.course_code))];
    const isPaired = uniqueCodes.length > 1;

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} onClick={onClick}
            className={`w-full h-full rounded-xl border-[1.5px] ${bg} ${border} ${text} ${isSwapMode ? 'cursor-pointer hover:ring-2 hover:ring-violet-400' : 'cursor-pointer hover:ring-2 hover:ring-violet-200'} ${isSelected ? 'ring-4 ring-fuchsia-500 shadow-xl scale-105 z-50' : ''} transition-all hover:shadow-md group relative flex flex-col justify-center p-2.5 shadow-sm min-h-[80px]`}>
            {isMentor ? (
                <div className="text-center">
                    <div className="font-bold text-[10px] uppercase tracking-wider opacity-90">MENTOR</div>
                    <div className="text-[9px] opacity-60 font-medium mt-0.5">Interaction</div>
                </div>
            ) : isOE ? (
                <div className="text-center">
                    <div className="font-bold text-[10px] uppercase tracking-wider opacity-90">OPEN</div>
                    <div className="text-[9px] font-medium opacity-60 mt-0.5">Elective</div>
                </div>
            ) : (
                <div className="flex flex-col gap-0.5 justify-center h-full w-full">
                    {uniqueCodes.map((code, idx) => {
                        const groupEntries = allSections.filter(s => s.course_code === code);
                        const groupName = groupEntries[0]?.course_name || '';

                        return (
                            <div key={idx} className={`flex flex-col justify-center py-0.5 ${idx > 0 ? 'border-t border-current/15 mt-1 pt-1' : ''}`}>
                                {/* Course code + lab icon */}
                                <div className="flex justify-center items-center gap-1">
                                    <span className="font-bold text-[11px] tracking-tight leading-tight">{code}</span>
                                    {entry.session_type === 'LAB' && isLabStart && idx === 0 && (
                                        <FlaskConical className="w-3 h-3 opacity-40 shrink-0 fill-current" />
                                    )}
                                </div>

                                {/* Course name */}
                                <div className="text-[9.5px] font-semibold leading-tight text-center px-0.5 my-0.5 opacity-80">
                                    {groupName}
                                </div>

                                {/* Faculty & Venue inline */}
                                {groupEntries.length > 1 && !isPaired ? (
                                    /* Multiple sections of same course — each faculty + venue on same line */
                                    <div className="flex flex-col gap-0.5 border-t border-current/10 pt-0.5 mt-0.5">
                                        {groupEntries.map((sec, sIdx) => (
                                            <div key={sIdx} className="flex items-center justify-center gap-1.5 w-full">
                                                {isValidFaculty(sec.faculty_name) && (
                                                    <span className="text-[8.5px] font-semibold italic opacity-80 whitespace-nowrap">{sec.faculty_name}</span>
                                                )}
                                                {sec.venue_name && (
                                                    <span className="text-[7.5px] font-bold text-indigo-700 bg-indigo-50/80 px-1.5 rounded border border-indigo-200 shrink-0 whitespace-nowrap">{sec.venue_name}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    /* Single section or paired — faculty + venue on same line */
                                    (isValidFaculty(groupEntries[0]?.faculty_name) || groupEntries[0]?.venue_name) && (
                                        <div className="flex items-center justify-center gap-1.5 mt-0.5 w-full">
                                            {isValidFaculty(groupEntries[0]?.faculty_name) && (
                                                <span className="text-[9px] italic font-semibold opacity-80 whitespace-nowrap">{groupEntries[0].faculty_name}</span>
                                            )}
                                            {groupEntries[0]?.venue_name && (
                                                <span className="text-[8px] font-bold text-indigo-700 bg-indigo-50/80 px-1.5 py-0.5 rounded border border-indigo-200 shrink-0 whitespace-nowrap">{groupEntries[0].venue_name}</span>
                                            )}
                                        </div>
                                    )
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ─── Droppable Grid Cell (Preserved Logic) ───
const GridCell = ({ id, children, isEmpty, isBreak, isLunch, onCellClick }) => {
    // Break/Lunch cells are purely visual (static)
    if (isBreak || isLunch) {
        return (
            <td className={`border-r border-b border-gray-100 text-center align-middle min-w-[50px] ${isLunch ? 'bg-orange-50/30 pattern-diagonal-lines pattern-orange-100/50' : 'bg-gray-50/50'}`} style={{ height: 80 }}>
                <div className="flex flex-col items-center justify-center h-full py-2 opacity-40 select-none grayscale contrast-50 hover:grayscale-0 transition-all duration-500">
                    <Coffee className={`w-3.5 h-3.5 mb-1 ${isLunch ? 'text-orange-400' : 'text-gray-400'}`} />
                    <span className={`text-[9px] font-bold tracking-wider uppercase ${isLunch ? 'text-orange-400' : 'text-gray-400'}`}>{isLunch ? 'LUNCH' : 'BREAK'}</span>
                </div>
            </td>
        );
    }

    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <td ref={setNodeRef} onClick={isEmpty ? onCellClick : undefined}
            className={`border-r border-b border-gray-100 relative min-w-[220px] transition-colors duration-200 ${isOver ? (isEmpty ? 'bg-emerald-50/50' : 'bg-amber-50/50') : (isEmpty ? 'bg-white hover:bg-purple-50/10 cursor-pointer' : '')}`}
            style={{ minHeight: 80, height: 'auto', padding: 4 }}>
            {/* Adding specific ring indicator for drops */}
            {isOver && (
                <div className={`absolute inset-1 rounded-xl border-2 border-dashed pointer-events-none z-10 ${isEmpty ? 'border-emerald-400/50 bg-emerald-50/20' : 'border-amber-400/50 bg-amber-50/20'}`} />
            )}
            {children}
        </td>
    );
};

// ─── Droppable Grid Cell Span (Preserved Logic) ───
const DroppableGridCellSpan = ({ id, colSpan, entry, sections, isLabStart, onDelete, isSwapMode, isSelected, onCellClick }) => {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <td ref={setNodeRef}
            colSpan={colSpan}
            onClick={!entry ? onCellClick : undefined}
            className={`border-r border-b border-gray-100 relative transition-colors duration-200 ${isOver ? (entry ? 'bg-amber-50/50' : 'bg-emerald-50/50') : (entry ? '' : 'bg-white hover:bg-purple-50/10 cursor-pointer')}`}
            style={{ minHeight: 80, height: 'auto', padding: 4, minWidth: colSpan > 1 ? 440 : 220 }}>
            {isOver && (
                <div className={`absolute inset-1 rounded-xl border-2 border-dashed pointer-events-none z-10 ${entry ? 'border-amber-400/50 bg-amber-50/20' : 'border-emerald-400/50 bg-emerald-50/20'}`} />
            )}
            {entry ? (
                <div className="relative group h-full w-full">
                    <CellContent
                        entry={entry}
                        sections={sections}
                        cellId={`placed-${id}`}
                        isLabStart={isLabStart}
                        isSwapMode={isSwapMode}
                        isSelected={isSelected}
                        onClick={onCellClick}
                    />
                    <button onClick={onDelete}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg z-20 scale-75 group-hover:scale-100 cursor-pointer ring-2 ring-white">
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ) : null}
        </td>
    );
};

const ManualEntryModal = ({ isOpen, onClose, onSave, initialData, allSections, department, semester, day, period }) => {
    if (!isOpen) return null;
    const [formData, setFormData] = useState(initialData || { course_code: '', course_name: '', faculty_name: '', venue_name: '' });
    const [sectionEdits, setSectionEdits] = useState([]);
    const [availableFaculty, setAvailableFaculty] = useState([]);
    const [availableVenues, setAvailableVenues] = useState([]);
    const [loading, setLoading] = useState(false);
    const [manualMode, setManualMode] = useState({}); // { 'faculty-0': true, 'venue-1': true }

    // Initialize section edits
    React.useEffect(() => {
        if (allSections && allSections.length >= 1) {
            setSectionEdits(allSections.map(s => ({
                faculty_name: s.faculty_name || '',
                venue_name: s.venue_name || '',
                course_code: s.course_code,
                course_name: s.course_name,
                section_number: s.section_number,
                session_type: s.session_type,
                _original: s,
                _deleted: false
            })));
        } else {
            setSectionEdits([]);
        }
    }, [allSections]);

    // Fetch availability data on mount
    React.useEffect(() => {
        if (!department || !day || !period) return;
        setLoading(true);
        Promise.all([
            api.getAvailableFaculty(department, day, period).catch(() => ({ data: [] })),
            api.getAvailableVenues(department, semester, day, period).catch(() => ({ data: [] }))
        ]).then(([facRes, venRes]) => {
            setAvailableFaculty(facRes.data || []);
            setAvailableVenues(venRes.data || []);
        }).finally(() => setLoading(false));
    }, [department, semester, day, period]);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Filter out deleted sections
        const activeSections = sectionEdits.filter(s => !s._deleted);
        onSave(formData, activeSections);
        onClose();
    };

    const updateSection = (idx, field, value) => {
        setSectionEdits(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
    };

    const addSection = () => {
        const base = sectionEdits[0] || {};
        setSectionEdits(prev => [...prev, {
            faculty_name: '',
            venue_name: '',
            course_code: base.course_code || formData.course_code,
            course_name: base.course_name || formData.course_name,
            section_number: prev.length + 1,
            session_type: base.session_type || 'THEORY',
            _original: null,
            _deleted: false,
            _isNew: true
        }]);
    };

    const deleteSection = (idx) => {
        setSectionEdits(prev => prev.map((s, i) => i === idx ? { ...s, _deleted: true } : s));
    };

    const toggleManual = (key) => {
        setManualMode(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const activeSections = sectionEdits.filter(s => !s._deleted);
    const hasSections = activeSections.length > 0;

    // Helper: render faculty selector for a section
    const renderFacultyField = (sec, idx, actualIdx) => {
        const manualKey = `faculty-${idx}`;
        const isManual = manualMode[manualKey];

        return (
            <div>
                <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Faculty</label>
                    <button type="button" onClick={() => toggleManual(manualKey)}
                        className="text-[9px] text-violet-500 hover:text-violet-700 flex items-center gap-0.5 font-semibold">
                        {isManual ? <><ChevronDown className="w-2.5 h-2.5" /> Dropdown</> : <><Type className="w-2.5 h-2.5" /> Type</>}
                    </button>
                </div>
                {isManual ? (
                    <input type="text" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-violet-400 outline-none"
                        value={sec.faculty_name} onChange={e => updateSection(actualIdx, 'faculty_name', e.target.value)} placeholder="Type faculty name..." />
                ) : (
                    <select className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-violet-400 outline-none bg-white cursor-pointer"
                        value={sec.faculty_name} onChange={e => updateSection(actualIdx, 'faculty_name', e.target.value)}>
                        <option value="">-- Select Faculty --</option>
                        {availableFaculty.map(f => (
                            <option key={f.faculty_id} value={f.faculty_name} disabled={!f.is_available}
                                style={{ color: f.is_available ? '#059669' : '#dc2626' }}>
                                {f.is_available ? '✓ ' : '✗ '}{f.faculty_name}{!f.is_available ? ' (Busy)' : ''}
                            </option>
                        ))}
                    </select>
                )}
            </div>
        );
    };

    // Helper: render venue selector for a section
    const renderVenueField = (sec, idx, actualIdx) => {
        const manualKey = `venue-${idx}`;
        const isManual = manualMode[manualKey];

        return (
            <div>
                <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Venue</label>
                    <button type="button" onClick={() => toggleManual(manualKey)}
                        className="text-[9px] text-violet-500 hover:text-violet-700 flex items-center gap-0.5 font-semibold">
                        {isManual ? <><ChevronDown className="w-2.5 h-2.5" /> Dropdown</> : <><Type className="w-2.5 h-2.5" /> Type</>}
                    </button>
                </div>
                {isManual ? (
                    <input type="text" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-violet-400 outline-none"
                        value={sec.venue_name} onChange={e => updateSection(actualIdx, 'venue_name', e.target.value)} placeholder="Type venue name..." />
                ) : (
                    <select className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-violet-400 outline-none bg-white cursor-pointer"
                        value={sec.venue_name} onChange={e => updateSection(actualIdx, 'venue_name', e.target.value)}>
                        <option value="">-- Select Venue --</option>
                        {availableVenues.map(v => (
                            <option key={v.venue_id} value={v.venue_name} disabled={!v.is_available}
                                style={{ color: v.is_available ? '#059669' : '#dc2626' }}>
                                {v.is_available ? '✓ ' : '✗ '}{v.venue_name}{v.capacity ? ` (${v.capacity})` : ''}{v.is_lab ? ' [Lab]' : ''}{!v.is_available ? ' (In Use)' : ''}
                            </option>
                        ))}
                    </select>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-gray-100 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-800">{initialData ? 'Edit Entry' : 'Add Manual Entry'}</h3>
                    {loading && <span className="text-xs text-violet-500 animate-pulse font-semibold">Loading availability...</span>}
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* Course Code & Name */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Code</label>
                            <input type="text" autoFocus className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-violet-400 outline-none"
                                value={formData.course_code} onChange={e => setFormData({ ...formData, course_code: e.target.value })} placeholder="e.g. CS101" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Name</label>
                            <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 outline-none"
                                value={formData.course_name} onChange={e => setFormData({ ...formData, course_name: e.target.value })} placeholder="Course name" />
                        </div>
                    </div>

                    {/* Sections */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">Sections ({activeSections.length})</span>
                            <div className="flex-1 h-px bg-violet-100"></div>
                            <button type="button" onClick={addSection}
                                className="flex items-center gap-1 text-[10px] font-bold text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded-lg border border-green-200 transition-all">
                                <Plus className="w-3 h-3" /> Add Section
                            </button>
                        </div>

                        {sectionEdits.map((sec, idx) => {
                            if (sec._deleted) return null;
                            const displayIdx = sectionEdits.slice(0, idx + 1).filter(s => !s._deleted).length;
                            return (
                                <div key={idx} className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2 relative group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                                Section {displayIdx}
                                            </span>
                                            {sec._isNew && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">NEW</span>}
                                        </div>
                                        {activeSections.length > 1 && (
                                            <button type="button" onClick={() => deleteSection(idx)}
                                                className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                title="Remove section">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {renderFacultyField(sec, displayIdx - 1, idx)}
                                        {renderVenueField(sec, displayIdx - 1, idx)}
                                    </div>
                                </div>
                            );
                        })}

                        {/* If no sections at all (new manual entry), show simple fields */}
                        {activeSections.length === 0 && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Faculty</label>
                                    <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 outline-none"
                                        value={formData.faculty_name || ''} onChange={e => setFormData({ ...formData, faculty_name: e.target.value })} placeholder="Optional" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Venue</label>
                                    <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 outline-none"
                                        value={formData.venue_name || ''} onChange={e => setFormData({ ...formData, venue_name: e.target.value })} placeholder="e.g. CS 203" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Slot Info Badge */}
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
                        <span className="bg-gray-100 px-2 py-0.5 rounded">{day}</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded">Period {period}</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded">{department} - Sem {semester}</span>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg shadow-lg hover:shadow-violet-200">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
export default function TimetableEditor({ department, semester, onSave, onExportPDF }) {
    const [allCourses, setAllCourses] = useState([]);
    const [entries, setEntries] = useState([]);
    const [history, setHistory] = useState([]);
    const [slots, setSlots] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [facultyMap, setFacultyMap] = useState({});
    const [venueMap, setVenueMap] = useState({});
    const [draggedItem, setDraggedItem] = useState(null);
    const [isSwapMode, setIsSwapMode] = useState(false);
    const [swapSource, setSwapSource] = useState(null);
    const [editModalData, setEditModalData] = useState(null);

    // Filters
    const [paletteDept, setPaletteDept] = useState(department || '');
    const [searchQuery, setSearchQuery] = useState('');
    const [showTheory, setShowTheory] = useState(true);
    const [showLabs, setShowLabs] = useState(true);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
    );

    // ─── Load Data ───
    useEffect(() => { loadData(); }, [department, semester]);

    const loadData = async () => {
        try {
            const [tRes, sRes, dRes] = await Promise.all([
                api.getTimetable(department, semester),
                api.getSlots(),
                api.getDepartments()
            ]);
            setEntries(tRes.data || []);
            setSlots(sRes.data || []);
            setDepartments(dRes.data?.map(d => d.department_code) || []);
            setPaletteDept(department);
        } catch (err) { console.error('Load error:', err); }
    };

    // Load courses when palette dept changes
    useEffect(() => {
        if (!paletteDept) return;
        const loadCourses = async () => {
            try {
                const [cRes, fRes, cvRes, dvRes] = await Promise.all([
                    api.getCourses(paletteDept),
                    api.getCourseFaculty(paletteDept),
                    api.getCourseVenues ? api.getCourseVenues(paletteDept).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
                    api.getDepartmentVenues ? api.getDepartmentVenues(paletteDept).catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
                ]);
                setAllCourses(cRes.data || []);
                const fMap = {};
                (fRes.data || []).forEach(m => { fMap[m.course_code] = m.faculty_name || m.faculty_id; });
                setFacultyMap(fMap);

                const vMap = {};
                const theoryVenues = [];
                const labVenues = [];

                (dvRes.data || []).forEach(dv => {
                    const isLab = dv.venue?.is_lab;
                    const vName = dv.venue?.venue_name || dv.venue_name || `Venue ${dv.venue_id}`;
                    if (isLab) labVenues.push(vName);
                    else theoryVenues.push(vName);
                });

                (cvRes.data || []).forEach(cv => {
                    vMap[cv.course_code] = cv.venue?.venue_name || cv.venue_name || `Venue ${cv.venue_id}`;
                });

                let tIdx = 0;
                let lIdx = 0;

                (cRes.data || []).forEach(c => {
                    if (!vMap[c.course_code]) {
                        if (c.is_lab) {
                            vMap[c.course_code] = labVenues.length > 0 ? labVenues[lIdx % labVenues.length] : 'No Lab Venue';
                            if (labVenues.length > 0) lIdx++;
                        } else {
                            vMap[c.course_code] = theoryVenues.length > 0 ? theoryVenues[tIdx % theoryVenues.length] : 'No Theory Venue';
                            if (theoryVenues.length > 0) tIdx++;
                        }
                    }
                });

                setVenueMap(vMap);
            } catch (err) { console.error('Load courses error:', err); }
        };
        loadCourses();
    }, [paletteDept]);

    // ─── Memoized structures ───
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const { periodColumns, validPeriods } = useMemo(() => {
        if (!slots.length) return { periodColumns: [], validPeriods: new Set() };

        const sampleDay = slots.find(s => s.day_of_week === 'Monday') ? 'Monday' : slots[0]?.day_of_week;
        const daySlots = slots.filter(s => s.day_of_week === sampleDay).sort((a, b) => a.period_number - b.period_number);

        const cols = [];
        const valid = new Set();

        let lastEndTime = null;

        daySlots.forEach(slot => {
            if (lastEndTime && slot.start_time > lastEndTime) {
                const gap = timeToMinutes(slot.start_time) - timeToMinutes(lastEndTime);
                if (gap >= 10) {
                    cols.push({ type: 'BREAK', label: 'Break', start: lastEndTime, end: slot.start_time });
                }
            }

            if (slot.slot_type === 'LUNCH') {
                cols.push({ type: 'LUNCH', label: 'Lunch', start: slot.start_time, end: slot.end_time });
            } else if (slot.slot_type !== 'REGULAR') {
                cols.push({ type: 'BREAK', label: slot.slot_type, start: slot.start_time, end: slot.end_time });
            } else {
                cols.push({ type: 'PERIOD', period: slot.period_number, start: slot.start_time, end: slot.end_time });
                valid.add(slot.period_number);
            }
            lastEndTime = slot.end_time;
        });

        return { periodColumns: cols, validPeriods: valid };
    }, [slots]);

    const activeDays = useMemo(() =>
        dayOrder.filter(d => slots.some(s => s.day_of_week === d)),
        [slots]
    );

    const { gridMap, sectionsMap } = useMemo(() => {
        const gm = {};
        const sm = {};
        entries.forEach(e => {
            const key = `${e.day_of_week}-${e.period_number}`;
            // gridMap: keep the first entry (section 1 or first encountered) as the primary for drag-and-drop
            if (!gm[key]) gm[key] = e;
            // sectionsMap: group all entries for the same slot
            if (!sm[key]) sm[key] = [];
            sm[key].push(e);
        });
        return { gridMap: gm, sectionsMap: sm };
    }, [entries]);

    const filteredCourses = useMemo(() => {
        let list = allCourses;
        if (!showTheory) list = list.filter(c => c.is_lab);
        if (!showLabs) list = list.filter(c => !c.is_lab);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(c => c.course_code.toLowerCase().includes(q) || c.course_name.toLowerCase().includes(q));
        }
        return list;
    }, [allCourses, searchQuery, showTheory, showLabs]);

    // ─── Helpers ───
    function timeToMinutes(t) {
        if (!t) return 0;
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    }

    const pushHistory = useCallback(() => {
        setHistory(prev => [...prev.slice(-20), JSON.parse(JSON.stringify(entries))]);
    }, [entries]);

    const undo = useCallback(() => {
        if (history.length === 0) return;
        const prev = history[history.length - 1];
        setEntries(prev);
        setHistory(h => h.slice(0, -1));
    }, [history]);

    // ─── Drag Logic ───
    const handleDragStart = ({ active }) => setDraggedItem(active.data.current);

    const handleDragEnd = ({ active, over }) => {
        setDraggedItem(null);
        if (!over) return;

        const overId = over.id;
        // Strict Visual Safety: Breaks are not targets
        if (overId.includes('BREAK') || overId.includes('LUNCH')) return;

        const activeData = active.data.current;
        const [targetDay, targetPeriodStr] = overId.split('-');
        const targetPeriod = parseInt(targetPeriodStr);

        pushHistory();

        if (activeData.type === 'new') {
            placeCourse(activeData.course, activeData.facultyName, activeData.venueName, targetDay, targetPeriod);
        } else if (activeData.type === 'placed') {
            moveEntry(activeData.entry, targetDay, targetPeriod);
        }
    };

    const placeCourse = (course, facultyName, venueName, day, period) => {
        const isLab = course.is_lab;
        if (isLab) {
            if (!isValidPeriod(day, period)) return;
            if (!isContiguous(day, period, 2)) return;
        } else {
            if (!isValidPeriod(day, period)) return;
        }

        const fName = facultyName || facultyMap[course.course_code] || 'Unassigned';
        const newEntry = {
            department_code: department, semester: parseInt(semester),
            course_code: course.course_code, course_name: course.course_name,
            session_type: isLab ? 'LAB' : 'THEORY',
            faculty_id: null, faculty_name: fName, slot_id: 0,
            venue_name: venueName || '',
            day_of_week: day, period_number: period
        };

        smartInsert(newEntry, isLab ? 2 : 1);
    };

    const moveEntry = (entry, newDay, newPeriod) => {
        const isLab = entry.session_type === 'LAB';
        if (isLab) {
            if (!isValidPeriod(newDay, newPeriod)) return;
            if (!isContiguous(newDay, newPeriod, 2)) return;
        } else {
            if (!isValidPeriod(newDay, newPeriod)) return;
        }

        let tempEntries = entries.filter(e => {
            if (isLab) {
                return !(e.day_of_week === entry.day_of_week &&
                    e.course_code === entry.course_code &&
                    e.session_type === 'LAB' &&
                    Math.abs(e.period_number - entry.period_number) <= 1);
            } else {
                return !(e.day_of_week === entry.day_of_week &&
                    e.period_number === entry.period_number &&
                    e.course_code === entry.course_code);
            }
        });

        const newEntry = { ...entry, day_of_week: newDay, period_number: newPeriod };
        smartInsert(newEntry, isLab ? 2 : 1, tempEntries);
    };

    // ─── Smart Logic ───
    const isValidPeriod = (day, p) => {
        const parsedP = parseInt(p);
        return periodColumns.some(c => c.type === 'PERIOD' && c.period === parsedP);
    };

    const isContiguous = (day, p, size) => {
        if (size <= 1) return true;
        const startIdx = periodColumns.findIndex(c => c.type === 'PERIOD' && c.period === parseInt(p));
        if (startIdx === -1) return false;

        for (let i = 1; i < size; i++) {
            const nextCol = periodColumns[startIdx + i];
            // Must strictly be the next period visually (no break)
            if (!nextCol || nextCol.type !== 'PERIOD' || nextCol.period !== parseInt(p) + i) {
                return false;
            }
        }
        return true;
    };

    const smartInsert = (newEntry, size, currentList = entries) => {
        const day = newEntry.day_of_week;
        const p = newEntry.period_number;

        // 1. Identify Collisions
        const collisions = [];
        for (let i = 0; i < size; i++) {
            const targetP = p + i;
            const existing = currentList.find(e => e.day_of_week === day && e.period_number === targetP);
            if (existing && !collisions.some(c => c.course_code === existing.course_code && c.day_of_week === existing.day_of_week && c.period_number === existing.period_number)) {
                if (existing.session_type === 'LAB') {
                    const labParts = currentList.filter(l => l.day_of_week === day && l.course_code === existing.course_code && l.session_type === 'LAB' && Math.abs(l.period_number - existing.period_number) <= 1);
                    labParts.forEach(lp => {
                        if (!collisions.some(c => c === lp)) collisions.push(lp);
                    });
                } else {
                    collisions.push(existing);
                }
            }
        }

        // 2. Remove collisions
        let tempList = currentList.filter(e => !collisions.includes(e));

        // 3. Add Key Entry
        const finalEntry1 = { ...newEntry };
        const finalEntry2 = size === 2 ? { ...newEntry, period_number: newEntry.period_number + 1 } : null;
        tempList = [...tempList, finalEntry1];
        if (finalEntry2) tempList = [...tempList, finalEntry2];

        // 4. Relocate UNIQUE Collisions
        if (collisions.length === 0) {
            setEntries(tempList);
            return;
        }

        const logicalCollisions = [];
        collisions.forEach(c => {
            if (c.session_type === 'LAB') {
                const isStart = currentList.find(e => e.day_of_week === day && e.period_number === c.period_number - 1 && e.course_code === c.course_code && e.session_type === 'LAB') === undefined;
                if (isStart) {
                    logicalCollisions.push({ entry: c, size: 2 });
                }
            } else {
                logicalCollisions.push({ entry: c, size: 1 });
            }
        });

        let finalList = [...tempList];

        logicalCollisions.forEach(item => {
            const resultList = tryRelocate(item.entry, item.size, finalList, p);
            if (resultList) {
                finalList = resultList;
            } else {
                console.warn(`Could not relocate ${item.entry.course_code}, dropping it.`);
            }
        });

        setEntries(finalList);
    };

    const tryRelocate = (entry, size, list, pivotPeriod) => {
        const day = entry.day_of_week;

        // 1. Left Search
        let curr = pivotPeriod - 1;
        while (curr > 0) {
            if (isSlotFree(list, day, curr, size)) {
                return placeAt(entry, day, curr, size, list);
            }
            curr--;
        }

        // 2. Right Search
        curr = pivotPeriod + 1;
        while (curr < 20) {
            if (isValidPeriod(day, curr)) {
                if (isSlotFree(list, day, curr, size)) {
                    return placeAt(entry, day, curr, size, list);
                }
            }
            curr++;
        }

        return null; // Could not place nearby
    };

    const isSlotFree = (list, day, startP, size) => {
        if (!isValidPeriod(day, startP)) return false;

        if (size === 2) {
            if (!isContiguous(day, startP, 2)) return false;
        }

        const occupied = list.some(e => e.day_of_week === day && e.period_number >= startP && e.period_number < startP + size);
        return !occupied;
    };

    const placeAt = (entry, day, p, size, list) => {
        const main = { ...entry, day_of_week: day, period_number: p };
        const secondary = size === 2 ? { ...entry, day_of_week: day, period_number: p + 1 } : null;
        const res = [...list, main];
        if (secondary) res.push(secondary);
        return res;
    };

    const handleDeleteEntry = (day, period) => {
        pushHistory();
        const entry = gridMap[`${day}-${period}`];
        if (!entry) return;

        if (entry.session_type === 'LAB') {
            setEntries(prev => prev.filter(e => !(
                e.day_of_week === day && e.course_code === entry.course_code && e.session_type === 'LAB' &&
                Math.abs(e.period_number - period) <= 1
            )));
        } else {
            setEntries(prev => prev.filter(e => !(e.day_of_week === day && e.period_number === period)));
        }
    };

    const handleSave = async () => {
        try {
            await api.saveTimetable({ department_code: department, semester: parseInt(semester), entries });
            alert('Timetable Saved Successfully!');
        } catch (err) {
            alert('Failed to save: ' + err.message);
        }
    };

    const isLabBlockStart = (day, period) => {
        const entry = gridMap[`${day}-${period}`];
        if (!entry || entry.session_type !== 'LAB') return false;
        const prevEntry = gridMap[`${day}-${period - 1}`];
        if (prevEntry && prevEntry.course_code === entry.course_code && prevEntry.session_type === 'LAB') return false;
        return true;
    };

    const isLabBlockTail = (day, period) => {
        const entry = gridMap[`${day}-${period}`];
        if (!entry || entry.session_type !== 'LAB') return false;
        const prevEntry = gridMap[`${day}-${period - 1}`];
        return prevEntry && prevEntry.course_code === entry.course_code && prevEntry.session_type === 'LAB';
    };

    const handleSwapClick = (day, period, entry) => {
        if (!isSwapMode || !entry) return;

        if (!swapSource) {
            setSwapSource({ day, period, entry });
            return;
        }

        // Deselect if clicking same
        if (swapSource.day === day && swapSource.period === period) {
            setSwapSource(null);
            return;
        }

        // Validate types
        if (swapSource.entry.session_type !== entry.session_type) {
            alert(`Cannot swap ${swapSource.entry.session_type} with ${entry.session_type}. Types must match.`);
            setSwapSource(null);
            return;
        }

        // Execute Swap
        executeSwap(swapSource, { day, period, entry });
        setSwapSource(null);
        // setIsSwapMode(false); // User might want to do multiple swaps
    };

    const executeSwap = (source, target) => {
        pushHistory();
        let newEntries = [...entries];

        const getRelatedEntries = (refEntry, d, p) => {
            if (refEntry.session_type === 'LAB') {
                return newEntries.filter(e =>
                    e.day_of_week === d &&
                    e.course_code === refEntry.course_code &&
                    e.session_type === 'LAB' &&
                    Math.abs(e.period_number - p) <= 1
                );
            } else {
                return newEntries.filter(e => e.day_of_week === d && e.period_number === p);
            }
        };

        const sourceGroup = getRelatedEntries(source.entry, source.day, source.period);
        const targetGroup = getRelatedEntries(target.entry, target.day, target.period);

        // Remove old positions
        newEntries = newEntries.filter(e => !sourceGroup.includes(e) && !targetGroup.includes(e));

        const sourceStartP = Math.min(...sourceGroup.map(e => e.period_number));
        const targetStartP = Math.min(...targetGroup.map(e => e.period_number));

        const updatedSourceGroup = sourceGroup.map(e => ({
            ...e,
            day_of_week: target.day,
            period_number: targetStartP + (e.period_number - sourceStartP)
        }));

        const updatedTargetGroup = targetGroup.map(e => ({
            ...e,
            day_of_week: source.day,
            period_number: sourceStartP + (e.period_number - targetStartP)
        }));

        setEntries([...newEntries, ...updatedSourceGroup, ...updatedTargetGroup]);
    };

    const handleCellClick = (day, period, entry = null) => {
        if (isSwapMode) {
            handleSwapClick(day, period, entry);
            return;
        }
        const key = `${day}-${period}`;
        const allSectionsForSlot = sectionsMap[key] || [];
        setEditModalData({
            isOpen: true,
            day,
            period,
            entry,
            allSections: allSectionsForSlot,
            initialData: entry ? {
                course_code: entry.course_code,
                course_name: entry.course_name,
                faculty_name: entry.faculty_name,
                venue_name: entry.venue_name || ''
            } : null
        });
    };

    const handleManualSave = (formData, sectionEdits = []) => {
        const { day, period, entry, allSections } = editModalData;
        pushHistory();

        // Sanitize faculty names: strip out placeholder/dropdown values
        const cleanFaculty = (name) => {
            if (!name || name.trim() === '') return '';
            const lower = name.trim().toLowerCase();
            if (lower === 'unassigned' || lower.includes('select')) return '';
            return name.trim();
        };

        let currentEntries = [...entries];

        if (sectionEdits.length > 0) {
            // Clean faculty names in section edits
            sectionEdits = sectionEdits.map(s => ({ ...s, faculty_name: cleanFaculty(s.faculty_name) }));
            // Handle deletions: remove entries whose originals are no longer in active sections
            if (allSections && allSections.length >= 1) {
                // Find originals that were deleted
                const survivingOriginals = new Set(sectionEdits.filter(s => s._original).map(s => s._original));
                currentEntries = currentEntries.filter(e => {
                    // If this entry is one of the slot's original sections, check if it survived
                    const isSlotEntry = allSections.includes(e);
                    if (isSlotEntry && !survivingOriginals.has(e)) return false; // deleted
                    return true;
                });

                // Handle updates: update surviving originals
                currentEntries = currentEntries.map(e => {
                    const editMatch = sectionEdits.find(s => s._original === e);
                    if (editMatch) {
                        return {
                            ...e,
                            course_code: formData.course_code || e.course_code,
                            course_name: formData.course_name || e.course_name,
                            faculty_name: editMatch.faculty_name,
                            venue_name: editMatch.venue_name
                        };
                    }
                    return e;
                });

                // Handle additions: add new sections
                sectionEdits.filter(s => s._isNew).forEach(s => {
                    currentEntries.push({
                        department_code: department,
                        semester: parseInt(semester),
                        course_code: formData.course_code || s.course_code || 'CUSTOM',
                        course_name: formData.course_name || s.course_name || '',
                        session_type: s.session_type || 'THEORY',
                        faculty_id: null,
                        faculty_name: s.faculty_name || '',
                        venue_name: s.venue_name || '',
                        slot_id: 0,
                        day_of_week: day,
                        period_number: period,
                        section_number: s.section_number
                    });
                });
            }
        } else {
            // Single-section edit / new entry (original logic)
            const isLab = entry?.session_type === 'LAB';
            const newEntry = {
                department_code: department, semester: parseInt(semester),
                course_code: formData.course_code || 'CUSTOM',
                course_name: formData.course_name,
                session_type: isLab ? 'LAB' : 'THEORY',
                faculty_id: null,
                faculty_name: cleanFaculty(formData.faculty_name),
                venue_name: formData.venue_name || '',
                slot_id: 0,
                day_of_week: day,
                period_number: period
            };

            if (entry) {
                currentEntries = currentEntries.map(e => {
                    if (e === entry) return { ...e, ...newEntry };
                    if (isLab && e.day_of_week === day && e.course_code === entry.course_code && e.session_type === 'LAB' && Math.abs(e.period_number - period) === 1) {
                        return { ...e, ...newEntry, period_number: e.period_number };
                    }
                    return e;
                });
            } else {
                currentEntries = currentEntries.filter(e => !(e.day_of_week === day && e.period_number === period));
                currentEntries.push(newEntry);
            }
        }

        setEntries(currentEntries);
        setEditModalData(null);
    };

    // ═══════════════════════════════════════
    // RENDER (ELEGANT WHITES & PURPLES)
    // ═══════════════════════════════════════
    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={pointerWithin}>
            <div className="flex flex-col h-full bg-white font-sans text-gray-800" style={{ minHeight: '80vh' }}>

                {/* ─── TOOLBAR ─── */}
                <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100 shadow-sm flex-shrink-0 z-20">
                    <div className="flex items-center gap-5">
                        <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-2.5 border border-violet-100 shadow-sm ring-1 ring-violet-50">
                            <span className="text-lg font-bold text-gray-800 tracking-tight">{department}</span>
                            <span className="text-violet-200 h-5 w-px bg-violet-200"></span>
                            <span className="text-base font-medium text-gray-500">Sem {semester}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 text-violet-700 rounded-lg border border-violet-100">
                            <LayoutTemplate className="w-4 h-4 text-violet-500" />
                            <span className="text-xs font-bold tracking-wide uppercase">{entries.length} Classes</span>
                        </div>
                    </div>
                </div>

                {/* ─── FLOATING ACTION BAR (RIGHT) ─── */}
                <div className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-50">
                    <button onClick={undo} disabled={history.length === 0} title="Undo"
                        className={`p-3 rounded-full shadow-lg transition-all transform hover:scale-110 ${history.length ? 'bg-white text-gray-700 hover:text-gray-900 border border-gray-200' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}>
                        <Undo2 className="w-5 h-5" />
                    </button>

                    <button onClick={() => { setIsSwapMode(!isSwapMode); setSwapSource(null); }} title={isSwapMode ? "Exit Swap Mode" : "Swap Slots"}
                        className={`p-3 rounded-full shadow-lg transition-all transform hover:scale-110 ${isSwapMode ? 'bg-fuchsia-600 text-white ring-4 ring-fuchsia-200' : 'bg-white text-fuchsia-600 border border-gray-200 hover:bg-fuchsia-50'}`}>
                        <ArrowLeftRight className="w-5 h-5" />
                    </button>

                    <button onClick={() => { pushHistory(); setEntries([]); }} title="Clear Timetable"
                        className="p-3 bg-white text-rose-500 rounded-full border border-gray-200 shadow-lg hover:bg-rose-50 hover:text-rose-600 transition-all transform hover:scale-110">
                        <Trash2 className="w-5 h-5" />
                    </button>

                    {onExportPDF && (
                        <button onClick={() => onExportPDF(entries)} title="Export PDF"
                            className="p-3 bg-white text-violet-600 rounded-full border border-gray-200 shadow-lg hover:bg-violet-50 hover:text-violet-700 transition-all transform hover:scale-110">
                            <Download className="w-5 h-5" />
                        </button>
                    )}

                    <button onClick={handleSave} title="Save Timetable"
                        className="p-3 bg-violet-600 text-white rounded-full shadow-xl shadow-violet-300 hover:bg-violet-700 transition-all transform hover:scale-110 hover:shadow-violet-400">
                        <Save className="w-5 h-5" />
                    </button>
                </div>

                {/* ─── COURSE PALETTE (ELEGANT) ─── */}
                <div className="bg-white border-b border-gray-100 px-8 py-5 flex-shrink-0 z-10 sticky top-0 shadow-sm">
                    <div className="flex items-center gap-6 mb-4">
                        <div className="flex items-center gap-2.5 text-xs font-extra-bold text-gray-400 uppercase tracking-widest">
                            <Palette className="w-4 h-4 text-violet-400" /> Palette
                        </div>

                        <div className="h-6 w-px bg-violet-100"></div>

                        <select value={paletteDept} onChange={e => setPaletteDept(e.target.value)}
                            className="text-sm border border-gray-200 rounded-lg px-4 py-2 bg-gray-50/50 hover:bg-white focus:ring-2 focus:ring-violet-400 focus:outline-none font-semibold text-gray-700 shadow-sm transition-all cursor-pointer">
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <div className="relative flex-1 max-w-sm group">
                            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-400 group-focus-within:text-violet-500 transition-colors" />
                            <input type="text" placeholder="Search courses..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-9 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-violet-100 focus:border-violet-300 focus:outline-none shadow-sm transition-all placeholder:text-gray-400 font-medium text-gray-700" />
                            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5"><X className="w-4 h-4 text-gray-300 hover:text-gray-500 transition-colors" /></button>}
                        </div>

                        <div className="flex items-center gap-1.5 ml-auto bg-gray-50 p-1.5 rounded-xl border border-gray-100 shadow-inner">
                            <button onClick={() => setShowTheory(!showTheory)}
                                className={`text-[11px] px-4 py-1.5 rounded-lg font-bold transition-all ${showTheory ? 'bg-white text-violet-700 shadow-sm ring-1 ring-violet-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                                Theory
                            </button>
                            <button onClick={() => setShowLabs(!showLabs)}
                                className={`text-[11px] px-4 py-1.5 rounded-lg font-bold transition-all ${showLabs ? 'bg-white text-amber-700 shadow-sm ring-1 ring-amber-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                                Labs
                            </button>
                        </div>
                    </div>
                    {/* Course Chips */}
                    <div className="flex gap-3 overflow-x-auto pb-4 pt-1 px-1 scrollbar-thin scrollbar-thumb-violet-100 scrollbar-track-transparent hover:scrollbar-thumb-violet-200 transition-all">
                        {filteredCourses.map(c => (
                            <CourseChip key={c.course_code} course={c}
                                colorStyle={c.is_lab ? LAB_STYLE : THEORY_STYLE}
                                facultyName={facultyMap[c.course_code]}
                                venueName={venueMap[c.course_code]} />
                        ))}
                    </div>
                </div>

                {/* ─── TIMETABLE GRID (SMOOTH) ─── */}
                <div className="flex-1 overflow-auto p-10 bg-gray-50/50">
                    <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-auto ring-1 ring-gray-50 mx-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-white border-b border-gray-200 text-gray-900">
                                    <th className="py-5 px-6 text-left text-xs font-bold uppercase tracking-widest border-r border-gray-100 w-32">Day</th>
                                    {periodColumns.filter(col => col.type === 'PERIOD').map((col) => (
                                        <th key={`h-${col.period}`} className="py-4 px-3 text-center border-r border-gray-100 last:border-r-0 min-w-[220px]">
                                            <div className="text-[10px] font-black text-gray-400 tracking-widest mb-1 uppercase">Period {col.period}</div>
                                            <div className="text-[11px] font-medium text-gray-600 font-mono tracking-tight bg-gray-50 rounded-full px-2 py-0.5 inline-block border border-gray-200">{col.start} – {col.end}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {activeDays.map((day, dayIdx) => {
                                    let skipNext = false;

                                    return (
                                        <tr key={day} className={`border-b border-gray-50 last:border-b-0 hover:bg-slate-50/50 transition-colors duration-300 ${dayIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                            <td className="py-6 px-6 font-bold text-xs text-gray-500 border-r border-gray-100 bg-gray-50/50 uppercase tracking-widest">{day.slice(0, 3)}</td>
                                            {periodColumns.filter(col => col.type === 'PERIOD').map((col, colIdx) => {
                                                if (skipNext) { skipNext = false; return null; }

                                                const p = col.period;
                                                const key = `${day}-${p}`;
                                                const entry = gridMap[key];

                                                const labStart = isLabBlockStart(day, p);
                                                const periodCols = periodColumns.filter(c => c.type === 'PERIOD');
                                                const nextPeriodCol = periodCols[colIdx + 1];
                                                const spanTwo = labStart && nextPeriodCol && nextPeriodCol.type === 'PERIOD';

                                                if (spanTwo) skipNext = true;

                                                return (
                                                    <DroppableGridCellSpan
                                                        key={key}
                                                        id={key}
                                                        colSpan={spanTwo ? 2 : 1}
                                                        entry={entry}
                                                        sections={sectionsMap[key]}
                                                        isLabStart={labStart}
                                                        onDelete={() => handleDeleteEntry(day, p)}
                                                        isSwapMode={isSwapMode}
                                                        isSelected={swapSource?.day === day && Math.abs(swapSource?.period - p) < (entry?.session_type === 'LAB' ? 2 : 1)}
                                                        onCellClick={() => handleCellClick(day, p, entry)}
                                                    />
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {/* Elegant Legend */}
                    <Legend />
                </div>
            </div>

            {/* ─── DRAG OVERLAY (ELEGANT) ─── */}
            <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
                {draggedItem ? (
                    <div className={`px-5 py-4 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] border-2 transform scale-105 backdrop-blur-xl ${draggedItem.type === 'new'
                        ? (draggedItem.course.is_lab ? 'bg-amber-50/90 border-amber-400 text-amber-900' : 'bg-blue-50/90 border-blue-400 text-blue-900')
                        : (draggedItem.entry.session_type === 'LAB' ? 'bg-amber-50/90 border-amber-400 text-amber-900' : 'bg-blue-50/90 border-blue-400 text-blue-900')
                        } flex flex-col items-center justify-center min-w-[160px]`}>

                        <div className="font-bold text-sm tracking-tight flex items-center justify-center gap-1.5 w-full">
                            {(draggedItem.type === 'new' ? draggedItem.course.is_lab : draggedItem.entry.session_type === 'LAB')
                                ? <FlaskConical className="w-4 h-4 text-amber-700/80" />
                                : <BookOpen className="w-4 h-4 opacity-50" />}
                            {draggedItem.type === 'new' ? draggedItem.course.course_code : draggedItem.entry.course_code}
                        </div>

                        <div className="text-[10px] opacity-80 font-medium mt-1 tracking-wide text-center">
                            {draggedItem.type === 'new' ? draggedItem.course.course_name : (draggedItem.entry.course_name || '')}
                        </div>

                        {(draggedItem.type === 'new' ? draggedItem.venueName : draggedItem.entry.venue_name) && (
                            <div className="text-[9px] font-bold mt-2 text-indigo-700 bg-indigo-50/90 px-2 py-0.5 rounded border border-indigo-200 shadow-sm text-center">
                                {draggedItem.type === 'new' ? draggedItem.venueName : draggedItem.entry.venue_name}
                            </div>
                        )}

                        {(draggedItem.type === 'new' ? draggedItem.course.is_lab : draggedItem.entry.session_type === 'LAB') && (
                            <span className="text-[9px] font-bold opacity-70 block mt-1 tracking-wider uppercase text-amber-800 text-center">
                                2 Periods
                            </span>
                        )}

                    </div>
                ) : null}
            </DragOverlay>

            <ManualEntryModal
                isOpen={editModalData?.isOpen}
                onClose={() => setEditModalData(null)}
                onSave={handleManualSave}
                initialData={editModalData?.initialData}
                allSections={editModalData?.allSections}
                department={department}
                semester={semester}
                day={editModalData?.day}
                period={editModalData?.period}
            />
        </DndContext >
    );
}
