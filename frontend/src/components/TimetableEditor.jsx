import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DndContext, useDroppable, useDraggable, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors, pointerWithin } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import * as api from '../utils/api';
import { Search, Save, Trash2, Download, Undo2, Coffee, X, BookOpen, FlaskConical, Users2, LayoutTemplate, Palette, ArrowLeftRight } from 'lucide-react';

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
const CourseChip = ({ course, colorStyle, facultyName }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `palette-${course.course_code}`,
        data: { type: 'new', course, facultyName }
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
            {course.is_lab && <span className="text-[9px] font-bold opacity-60 block mt-1 tracking-wider uppercase text-amber-800">2 Periods</span>}
        </div>
    );
};

// ─── Draggable Grid Cell Content ───
const CellContent = ({ entry, cellId, isLabStart }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: cellId,
        data: { type: 'placed', entry }
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

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}
            className={`w-full h-full rounded-xl border-[1.5px] ${bg} ${border} ${text} cursor-grab active:cursor-grabbing transition-all hover:shadow-md group relative overflow-hidden flex flex-col justify-center p-2 shadow-sm`}>
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
                <>
                    <div className="flex justify-between items-start w-full mb-0.5">
                        <div className="font-bold text-xs leading-none truncate tracking-tight">{entry.course_code}</div>
                        {entry.session_type === 'LAB' && isLabStart && (
                            <FlaskConical className="w-3 h-3 opacity-40 shrink-0 ml-1 fill-current" />
                        )}
                    </div>
                    <div className="text-[10px] leading-tight truncate opacity-70 font-medium w-full" title={entry.course_name}>{entry.course_name || ''}</div>
                    {entry.faculty_name && entry.faculty_name !== 'Unassigned' && (
                        <div className="text-[9px] mt-auto flex items-center gap-1 opacity-70 border-t border-current/10 pt-1.5 font-semibold w-full">
                            <Users2 className="w-2.5 h-2.5 opacity-80" />
                            <span className="truncate">{entry.faculty_name}</span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// ─── Droppable Grid Cell (Preserved Logic) ───
const GridCell = ({ id, children, isEmpty, isBreak, isLunch }) => {
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
        <td ref={setNodeRef}
            className={`border-r border-b border-gray-100 relative min-w-[120px] transition-colors duration-200 ${isOver ? (isEmpty ? 'bg-emerald-50/50' : 'bg-amber-50/50') : (isEmpty ? 'bg-white hover:bg-purple-50/10' : '')}`}
            style={{ height: 80, padding: 4 }}>
            {/* Adding specific ring indicator for drops */}
            {isOver && (
                <div className={`absolute inset-1 rounded-xl border-2 border-dashed pointer-events-none z-10 ${isEmpty ? 'border-emerald-400/50 bg-emerald-50/20' : 'border-amber-400/50 bg-amber-50/20'}`} />
            )}
            {children}
        </td>
    );
};

// ─── Droppable Grid Cell Span (Preserved Logic) ───
const DroppableGridCellSpan = ({ id, colSpan, entry, isLabStart, onDelete, swapMode, isSelectedForSwap, onSwapSelect }) => {
    const { setNodeRef, isOver } = useDroppable({ id });

    const handleClick = () => {
        if (swapMode && entry) { // Only allow selecting cells with entries for swap
            onSwapSelect(id);
        }
    };

    return (
        <td ref={setNodeRef}
            colSpan={colSpan}
            className={`border-r border-b border-gray-100 relative transition-colors duration-200
            ${isOver ? (entry ? 'bg-amber-50/50' : 'bg-emerald-50/50') : (entry ? '' : 'bg-white hover:bg-purple-50/10')}
            ${swapMode && entry ? 'cursor-pointer' : ''}
            ${isSelectedForSwap ? 'ring-2 ring-offset-1 ring-blue-500 bg-blue-100/50' : ''}
            `}
            style={{ height: 80, padding: 4, minWidth: colSpan > 1 ? 240 : 120 }}
            onClick={handleClick}
        >
            {isOver && (
                <div className={`absolute inset-1 rounded-xl border-2 border-dashed pointer-events-none z-10 ${entry ? 'border-amber-400/50 bg-amber-50/20' : 'border-emerald-400/50 bg-emerald-50/20'}`} />
            )}
            {entry ? (
                <div className="relative group h-full w-full">
                    <CellContent entry={entry} cellId={`placed-${id}`} isLabStart={isLabStart} />
                    <button onClick={onDelete}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg z-20 scale-75 group-hover:scale-100 cursor-pointer ring-2 ring-white">
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ) : null}
        </td>
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
    const [draggedItem, setDraggedItem] = useState(null);

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
                const [cRes, fRes] = await Promise.all([
                    api.getCourses(paletteDept),
                    api.getCourseFaculty(paletteDept)
                ]);
                setAllCourses(cRes.data || []);
                const fMap = {};
                (fRes.data || []).forEach(m => { fMap[m.course_code] = m.faculty_name || m.faculty_id; });
                setFacultyMap(fMap);
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

    const gridMap = useMemo(() => {
        const gm = {};
        entries.forEach(e => { gm[`${e.day_of_week}-${e.period_number}`] = e; });
        return gm;
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
            placeCourse(activeData.course, activeData.facultyName, targetDay, targetPeriod);
        } else if (activeData.type === 'placed') {
            moveEntry(activeData.entry, targetDay, targetPeriod);
        }
    };

    const placeCourse = (course, facultyName, day, period) => {
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

    // ─── BEAD PHYSICS SHIFT LOGIC ───
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
            if (!nextCol || nextCol.type !== 'PERIOD' || nextCol.period !== parseInt(p) + i) return false;
        }
        return true;
    };

    const getPeriodSegment = (p) => {
        const segments = [];
        let currentSegment = [];
        periodColumns.forEach(col => {
            if (col.type === 'PERIOD') { currentSegment.push(col.period); }
            else { if (currentSegment.length > 0) { segments.push([...currentSegment]); currentSegment = []; } }
        });
        if (currentSegment.length > 0) segments.push(currentSegment);
        return segments.find(seg => seg.includes(parseInt(p))) || [];
    };

    const isSlotFree = (list, day, startP, size) => {
        if (!isValidPeriod(day, startP)) return false;
        if (size === 2 && !isContiguous(day, startP, 2)) return false;
        return !list.some(e => e.day_of_week === day && e.period_number >= startP && e.period_number < startP + size);
    };

    const getEntryBlock = (entry, list, day) => {
        if (entry.session_type === 'LAB') {
            const labParts = list.filter(e => e.day_of_week === day && e.course_code === entry.course_code && e.session_type === 'LAB' && Math.abs(e.period_number - entry.period_number) <= 1);
            const minP = Math.min(...labParts.map(lp => lp.period_number));
            return { entries: labParts, startPeriod: minP, size: 2 };
        }
        return { entries: [entry], startPeriod: entry.period_number, size: 1 };
    };

    const smartInsert = (newEntry, size, currentList = entries) => {
        const day = newEntry.day_of_week;
        const targetP = newEntry.period_number;
        const segment = getPeriodSegment(targetP);

        // 0. Check immediate availability
        if (isSlotFree(currentList, day, targetP, size)) {
            const finalEntry1 = { ...newEntry };
            const newList = [...currentList, finalEntry1];
            if (size === 2) newList.push({ ...newEntry, period_number: targetP + 1 });
            setEntries(newList);
            return;
        }

        const daySegEntries = currentList.filter(e => e.day_of_week === day && segment.includes(e.period_number));
        const otherEntries = currentList.filter(e => !(e.day_of_week === day && segment.includes(e.period_number)));

        // 1. Try Left Shift
        const leftLimit = segment[0];
        const leftResult = tryDirectionalShift(daySegEntries, segment, targetP, size, day, 'left');
        if (leftResult) {
            const finalEntry1 = { ...newEntry };
            const newList = [...otherEntries, ...leftResult, finalEntry1];
            if (size === 2) newList.push({ ...newEntry, period_number: targetP + 1 });
            setEntries(newList);
            return;
        }

        // 2. Try Right Shift
        const rightResult = tryDirectionalShift(daySegEntries, segment, targetP, size, day, 'right');
        if (rightResult) {
            const finalEntry1 = { ...newEntry };
            const newList = [...otherEntries, ...rightResult, finalEntry1];
            if (size === 2) newList.push({ ...newEntry, period_number: targetP + 1 });
            setEntries(newList);
            return;
        }

        console.warn('Shift blocked: Labs act as obstacles for 1-cell shifts, or no space available.');
    };

    const tryDirectionalShift = (dayEntries, segment, targetP, size, day, direction) => {
        // Build Map
        const periodMap = {};
        dayEntries.forEach(e => periodMap[e.period_number] = e);

        const itemsToMove = []; // List of LogicalBlocks
        const shiftAmount = size; // Force = size of inserted block

        // Determine Start Point for scanning
        // If Left Shift: We push items Left. Meaning we start from [targetP-1] and go left?
        // NO. If we insert at TargetP, we need space AT TargetP.
        // So we must move the item currently AT TargetP (and its neighbors) away.
        // If Left Shift: We move item at [TargetP-1] to [TargetP - 1 - Shift]. And item at [TargetP] stays?
        // NO. "insert a cell in the middle... remaining cells should go left or right".
        // This implies splitting the row? 
        // If I insert at P=3. 
        // Left Shift = Move items (P<=2) to Left? Or Move items (P>=3) to Left?
        // Logic: Create a hole at P=3.
        // Option A (Left Shift): Move [P<=2] further Left.
        // Option B (Right Shift): Move [P>=3] further Right.

        let pointer;
        let scanDirection; // -1 (look left) or 1 (look right)

        if (direction === 'left') {
            // We want to move items *before* targetP to the left to open up space at targetP?
            // Or we want to move items *at* targetP to the left?
            // If we move items AT targetP to the left, we are overwriting P-1...
            // "Insert in middle" -> "Others shift their place".
            // Correct Interp: 
            // LEFT SHIFT: Move items at [TargetP-1, TargetP-2...] into [TargetP-1-S, TargetP-2-S...]
            // RIGHT SHIFT: Move items at [TargetP, TargetP+1...] into [TargetP+S, TargetP+1+S...]

            // Wait, if I insert at TargetP, and I shift Left... I am shifting the items *to the left of me* further left.
            pointer = targetP - 1; // Start from immediate left neighbor
            scanDirection = -1;    // Go left
        } else {
            // Right Shift: Move items *at and to the right of me* further right.
            pointer = targetP;
            scanDirection = 1;
        }

        const visitedCodes = new Set();
        const blocksToShift = [];

        // Scan until we find enough gap
        while (pointer >= segment[0] && pointer <= segment[segment.length - 1]) {
            const entry = periodMap[pointer];
            if (!entry) {
                // Empty slot found!
                // Is gap big enough?
                // Simple logic checks 1 slot at a time.
                // If we find 1 empty slot, do we stop?
                // Shift Amount determines how much gap we need.
                // If Shift=2, we need 2 empty slots.
                // Let's simplified: Collect blocks until we find `shiftAmount` empty slots contiguous?
                // Or just shift 1 step at a time?

                // "Bead Physics":
                // Continuous chain of blocks. 
                // If followed by Gap >= ShiftAmount, we can move.

                // Recursive check is hard.
                // Iterative check:
                // 1. Identify chain of contiguous blocks starting from `pointer`.
                // 2. Check if space *beyond* chain is valid/empty.
                break;
            }

            const block = getEntryBlock(entry, dayEntries, day);
            const key = `${block.entries[0].course_code}-${block.entries[0].session_type}`;
            if (!visitedCodes.has(key)) {
                visitedCodes.add(key);

                // LAB OBSTACLE RULE
                if (block.entries[0].session_type === 'LAB' && shiftAmount === 1) {
                    return null; // Force 1 cannot move Lab
                }

                blocksToShift.push(block);
            }
            pointer += scanDirection;
        }

        // Verify space
        // We collected blocks in `blocksToShift`. 
        // We need to verify that moving them by `shiftAmount` * `directionCode` lands in valid empty space.
        // directionCode: 'left' -> -1, 'right' -> +1.

        // This is tricky because we might have gaps inside the chain.
        // Simplified approach:
        // Just take ALL items in the direction and try to shift them?
        // No, that moves too much.

        // Let's stick to the "Chain" idea.
        // Chain = contiguous sequence of blocks starting from impact point.
        // End of Chain = first gap.
        // Check if Gap Size >= Shift Amount.

        return simulateShift(dayEntries, segment, targetP, size, direction);
    };

    const simulateShift = (dayEntries, segment, targetP, size, direction) => {
        const shiftVal = direction === 'left' ? -size : size;
        const scanDir = direction === 'left' ? -1 : 1;
        const startScan = direction === 'left' ? targetP - 1 : targetP;

        // 1. Identify Contiguous Chain
        const periodMap = {};
        dayEntries.forEach(e => periodMap[e.period_number] = e);

        const chainBlocks = [];
        const visited = new Set();
        let curr = startScan;

        // Traverse in the direction of the "Push" (which is opposite to scan? No)
        // If Shift Left: We push neighboring items LEFT. So we scan LEFT.
        // If Shift Right: We push neighboring items RIGHT. So we scan RIGHT.

        // Problem: Labs (size 2).
        while (segment.includes(curr)) {
            const entry = periodMap[curr];
            if (!entry) {
                // Gap found at `curr`.
                // If moving size=2, do we need `curr` and `curr+1` to be empty?
                // The chain ends here.
                // We need to verify if the chain can actually move into this gap.
                // If Chain moves by ShiftVal...
                // The "Head" of the chain is the last item we found.
                // It needs to move into (HeadPos + ShiftVal).
                break;
            }

            const block = getEntryBlock(entry, dayEntries, entries[0] ? entries[0].day_of_week : ''); // day is passed in function
            const key = `${block.entries[0].course_code}-${block.entries[0].session_type}`;

            if (!visited.has(key)) {
                visited.add(key);
                // OBSTACLE CHECK
                if (block.size === 2 && Math.abs(shiftVal) === 1) return null; // Lab obstacle
                chainBlocks.push(block);
            }
            curr += scanDir;
        }

        if (chainBlocks.length === 0) return null; // Should not happen if we are shifting collision

        // 2. Validate Move
        // We have a chain of blocks. 
        // We apply shift to ALL of them.
        // Check if new positions are valid (in segment) AND empty (excluding valid chain members).

        const newPositions = new Map(); // entry -> newPeriod

        // Calculate new positions
        for (const block of chainBlocks) {
            for (const e of block.entries) {
                const newP = e.period_number + shiftVal;
                if (!segment.includes(newP)) return null; // Boundary limit
                newPositions.set(e, newP);
            }
        }

        // Collision Check (against items NOT in the chain)
        const entriesInChain = chainBlocks.flatMap(b => b.entries);
        const staticEntries = dayEntries.filter(e => !entriesInChain.includes(e)); // Items not being moved

        for (const [e, newP] of newPositions.entries()) {
            // Check against static items
            if (staticEntries.some(staticE => staticE.period_number === newP)) return null; // Collision with static wall
        }

        // Construct Result
        const result = dayEntries.map(e => {
            if (newPositions.has(e)) return { ...e, period_number: newPositions.get(e) };
            return e;
        });

        // Verify target slots cleared
        for (let i = 0; i < size; i++) {
            if (result.some(e => e.period_number === targetP + i)) return null; // Target still occupied?
        }

        return result;
    };


    // ─── SWAP Logic ───
    const handleSwapClick = (day, period) => {
        if (!swapMode) return;
        const entry = gridMap[`${day}-${period}`];
        if (!entry) { setSwapSelection(null); return; }

        if (!swapSelection) { setSwapSelection({ day, period, entry }); return; }

        const first = swapSelection;
        const second = { day, period, entry };

        if (first.entry.session_type !== second.entry.session_type) {
            alert('Swap mismatch: Can only swap Theory↔Theory or Lab↔Lab');
            setSwapSelection(null);
            return;
        }

        pushHistory();
        const isLab = first.entry.session_type === 'LAB';

        if (isLab) {
            const block1 = getEntryBlock(first.entry, entries, first.day);
            const block2 = getEntryBlock(second.entry, entries, second.day);
            let temp = entries.filter(e => !block1.entries.includes(e) && !block2.entries.includes(e));
            block1.entries.forEach((e, i) => temp.push({ ...e, day_of_week: second.day, period_number: block2.startPeriod + i }));
            block2.entries.forEach((e, i) => temp.push({ ...e, day_of_week: first.day, period_number: block1.startPeriod + i }));
            setEntries(temp);
        } else {
            setEntries(prev => prev.map(e => {
                const isFirst = e.day_of_week === first.day && e.period_number === first.period;
                const isSecond = e.day_of_week === second.day && e.period_number === second.period;
                if (isFirst) return { ...e, day_of_week: second.day, period_number: second.period };
                if (isSecond) return { ...e, day_of_week: first.day, period_number: first.period };
                return e;
            }));
        }
        setSwapSelection(null);
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
                    <div className="flex items-center gap-4">
                        <button onClick={undo} disabled={history.length === 0} title="Undo"
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${history.length ? 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 shadow-sm hover:shadow' : 'bg-gray-50 border border-transparent text-gray-300 cursor-not-allowed'}`}>
                            <Undo2 className="w-4 h-4" /> Undo
                        </button>
                        <button onClick={() => { setSwapMode(!swapMode); setSwapSelection(null); }}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${swapMode ? 'bg-violet-600 text-white border border-violet-600 shadow-violet-200' : 'bg-white border border-violet-200 text-violet-600 hover:bg-violet-50 hover:border-violet-300'}`}>
                            <ArrowLeftRight className="w-4 h-4" /> {swapMode ? 'Swap ON' : 'Swap'}
                        </button>
                        <button onClick={() => { pushHistory(); setEntries([]); }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-rose-100 text-rose-500 rounded-xl hover:bg-rose-50 hover:border-rose-200 text-sm font-semibold transition-all shadow-sm">
                            <Trash2 className="w-4 h-4" /> Clear
                        </button>
                        {onExportPDF && (
                            <button onClick={() => onExportPDF(entries)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 text-sm font-semibold shadow-sm transition-all group">
                                <Download className="w-4 h-4 text-gray-400 group-hover:text-purple-500" /> PDF
                            </button>
                        )}
                        <button onClick={handleSave}
                            className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 text-sm font-bold shadow-lg shadow-violet-200 hover:shadow-violet-300 transition-all transform hover:-translate-y-0.5 active:scale-95 active:translate-y-0">
                            <Save className="w-4 h-4" /> Save
                        </button>
                    </div>
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
                                facultyName={facultyMap[c.course_code]} />
                        ))}
                    </div>
                </div>

                {/* ─── TIMETABLE GRID (SMOOTH) ─── */}
                <div className="flex-1 overflow-auto p-10 bg-gray-50/50">
                    <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden ring-1 ring-gray-50 mx-auto max-w-[1400px]">
                        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                            <thead>
                                <tr className="bg-white border-b border-gray-200 text-gray-900">
                                    <th className="py-5 px-6 text-left text-xs font-bold uppercase tracking-widest border-r border-gray-100 w-32">Day</th>
                                    {periodColumns.map((col, i) => (
                                        col.type === 'PERIOD' ? (
                                            <th key={`h-${col.period}`} className="py-4 px-3 text-center border-r border-gray-100 last:border-r-0 min-w-[120px]">
                                                <div className="text-[10px] font-black text-gray-400 tracking-widest mb-1 uppercase">Period {col.period}</div>
                                                <div className="text-[11px] font-medium text-gray-600 font-mono tracking-tight bg-gray-50 rounded-full px-2 py-0.5 inline-block border border-gray-200">{col.start} – {col.end}</div>
                                            </th>
                                        ) : (
                                            <th key={`break-${i}`} className={`py-3 px-1 text-center border-r border-gray-100 w-16 ${col.type === 'LUNCH' ? 'bg-orange-50' : 'bg-gray-50'}`}>
                                                <div className="flex flex-col items-center justify-center h-full opacity-60">
                                                    <Coffee className="w-4 h-4 mb-1 text-gray-400" />
                                                </div>
                                            </th>
                                        )
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {activeDays.map((day, dayIdx) => {
                                    const renderedCols = [];
                                    let skipNext = false;

                                    periodColumns.forEach((col, colIdx) => {
                                        if (skipNext) { skipNext = false; return; }

                                        if (col.type !== 'PERIOD') {
                                            renderedCols.push(
                                                <GridCell key={`${day}-${col.type}-${colIdx}`} id={`${day}-${col.type}-${colIdx}`} isBreak={true} isLunch={col.type === 'LUNCH'} />
                                            );
                                            return;
                                        }

                                        const p = col.period;
                                        const key = `${day}-${p}`;
                                        const entry = gridMap[key];

                                        if (isLabBlockTail(day, p)) return;

                                        const labStart = isLabBlockStart(day, p);
                                        const nextCol = periodColumns[colIdx + 1];
                                        const spanTwo = labStart && nextCol && nextCol.type === 'PERIOD';

                                        if (spanTwo) skipNext = true;

                                        const isSwapSelected = swapSelection && swapSelection.day === day && swapSelection.period === p;
                                        renderedCols.push(
                                            <DroppableGridCellSpan
                                                key={key}
                                                id={key}
                                                colSpan={spanTwo ? 2 : 1}
                                                entry={entry}
                                                isLabStart={labStart}
                                                onDelete={() => handleDeleteEntry(day, p)}
                                                onSwapClick={() => handleSwapClick(day, p)}
                                                isSwapSelected={isSwapSelected}
                                                swapMode={swapMode}
                                            />
                                        );
                                    });

                                    return (
                                        <tr key={day} className={`border-b border-gray-50 last:border-b-0 hover:bg-slate-50/50 transition-colors duration-300 ${dayIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                            <td className="py-6 px-6 font-bold text-xs text-gray-500 border-r border-gray-100 bg-gray-50/50 uppercase tracking-widest">{day.slice(0, 3)}</td>
                                            {renderedCols}
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
                        : 'bg-white/90 border-violet-400 text-violet-900 ring-4 ring-violet-400/10'
                        } flex flex-col items-center justify-center min-w-[160px]`}>
                        <div className="font-bold text-sm tracking-tight">{draggedItem.type === 'new' ? draggedItem.course.course_code : draggedItem.entry.course_code}</div>
                        <div className="text-[10px] opacity-80 font-medium mt-1 tracking-wide">{draggedItem.type === 'new' ? draggedItem.course.course_name : (draggedItem.entry.course_name || '')}</div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
