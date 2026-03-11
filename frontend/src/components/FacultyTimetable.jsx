import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Printer, AlertCircle, Loader2, Download, Search, AlertTriangle, Layers } from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { getFaculty, getFacultyTimetable, getDepartments, getBreaks } from '../utils/api';
import { formatTime } from '../utils/timeFormat';

const FacultyTimetable = ({ slots }) => {
    const componentRef = useRef();
    const [downloading, setDownloading] = useState(false);

    const [faculties, setFaculties] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [breakConfigs, setBreakConfigs] = useState([]);
    const [selectedFacultyId, setSelectedFacultyId] = useState('');
    const [timetableData, setTimetableData] = useState(null);
    const [conflicts, setConflicts] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDeptFilter, setSelectedDeptFilter] = useState('');

    // View Options
    const [showLabels, setShowLabels] = useState(true);
    const [showCourseCode, setShowCourseCode] = useState(true);
    const [showFaculty, setShowFaculty] = useState(true);
    const [showVenues, setShowVenues] = useState(true);

    useEffect(() => {
        getFaculty().then(res => setFaculties(res.data)).catch(console.error);
        getDepartments().then(res => setDepartments(res.data)).catch(console.error);
        getBreaks().then(res => setBreakConfigs(res.data)).catch(console.error);
    }, []);

    const fetchTimetable = async () => {
        if (!selectedFacultyId) return;
        setLoading(true);
        try {
            const res = await getFacultyTimetable(selectedFacultyId);
            setTimetableData(res.data.timetable);
            setConflicts(res.data.conflicts);
        } catch (err) {
            console.error(err);
            setTimetableData([]);
            setConflicts([]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTimetable();
    }, [selectedFacultyId]);

    const handlePrint = () => {
        window.print();
    };

    // For Faculty timetable, show all breaks regardless of semester
    const BREAKS = breakConfigs.length > 0
        ? breakConfigs.map(b => ({ name: b.break_type, time: `${formatTime(b.start_time)} - ${formatTime(b.end_time)}` }))
        : [];

    const PERIODS = slots && slots.length > 0
        ? slots.filter(s => s.day_of_week === 'Monday' && s.slot_type === 'REGULAR')
            .sort((a, b) => a.period_number - b.period_number)
            .map((s, i) => ({ name: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][i] || `${i + 1}`, time: `${formatTime(s.start_time)} - ${formatTime(s.end_time)}` }))
        : [
            { name: 'I', time: '08.45 - 09.45 am' },
            { name: 'II', time: '09.45 - 10.45 am' },
            { name: 'III', time: '11.00 - 12.00 pm' },
            { name: 'IV', time: '12.00 - 01.00 pm' },
            { name: 'V', time: '02.00 - 03.00 pm' },
            { name: 'VI', time: '03.00 - 04.00 pm' },
            { name: 'VII', time: '04.15 - 05.15 pm' },
            { name: 'VIII', time: '05.15 - 06.15 pm' }
        ];
    const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    const getCellsData = useCallback((day, periodIndex) => {
        if (!timetableData) return [];
        const targetPeriod = periodIndex + 1;
        const displayToDbDay = {
            "MON": "Monday", "TUE": "Tuesday", "WED": "Wednesday",
            "THU": "Thursday", "FRI": "Friday", "SAT": "Saturday"
        };
        const dbDay = displayToDbDay[day] || day;
        return timetableData.filter(t =>
            t.day_of_week?.toLowerCase() === dbDay.toLowerCase() &&
            parseInt(t.period_number) === targetPeriod
        );
    }, [timetableData]);

    const handleDownloadPDF = async () => {
        if (!timetableData || timetableData.length === 0) return;
        if (!componentRef.current) return;
        setDownloading(true);
        try {
            await new Promise(r => setTimeout(r, 100));

            const dataUrl = await toPng(componentRef.current, {
                quality: 1.0,
                pixelRatio: 3,
                backgroundColor: '#ffffff',
                fontEmbedCSS: ''
            });

            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            const imgProps = pdf.getImageProperties(dataUrl);
            const ratio = Math.min(pdfWidth / imgProps.width, pdfHeight / imgProps.height);
            const imgWidth = imgProps.width * ratio;
            const imgHeight = imgProps.height * ratio;

            const marginX = Math.max(0, (pdfWidth - imgWidth) / 2);
            const marginY = Math.max(0, (pdfHeight - imgHeight) / 2);

            pdf.addImage(dataUrl, 'PNG', marginX, marginY, imgWidth, imgHeight);
            pdf.save(`Faculty_Timetable_${selectedFacultyId}.pdf`);
        } catch (error) {
            console.error("PDF Generation failed:", error);
            alert(`Failed to generate PDF: ${error.message}`);
        } finally {
            setDownloading(false);
        }
    };

    const selectedFacObj = faculties.find(f => f.faculty_id === selectedFacultyId);
    let displayName = selectedFacObj ? `${selectedFacObj.faculty_name} (${selectedFacObj.faculty_id})` : selectedFacultyId;

    // Filter faculties by department and search term
    const filteredFaculties = faculties.filter(f => {
        const matchesDept = !selectedDeptFilter || f.department_code === selectedDeptFilter;
        const matchesSearch = f.faculty_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.faculty_id.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesDept && matchesSearch;
    });

    return (
        <div className="space-y-4">
            <style>{`
                @media print {
                    body * { visibility: hidden !important; }
                    #printable-content, #printable-content * { 
                        visibility: visible !important; 
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    body, html {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                    }

                    #printable-content {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 133% !important; 
                        max-width: none !important;
                        margin: 0 !important;
                        padding: 8mm !important; 
                        box-sizing: border-box !important;
                        page-break-after: avoid !important;
                        
                        zoom: 0.75;
                        transform: scale(0.75);
                        transform-origin: top left;
                    }

                    .no-print { display: none !important; }
                    @page { size: landscape; margin: 0; }
                }
            `}</style>

            {/* Consistent violet filter bar */}
            <div className="flex flex-wrap gap-3 items-center bg-violet-50 p-4 rounded-2xl border border-violet-100 shadow-sm no-print">
                <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-violet-500" />
                    <span className="text-sm font-semibold text-violet-700">Filter:</span>
                </div>

                {/* Department Filter */}
                <select
                    value={selectedDeptFilter}
                    onChange={(e) => { setSelectedDeptFilter(e.target.value); setSelectedFacultyId(''); setTimetableData(null); }}
                    className="p-2.5 border border-violet-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-violet-400 focus:border-violet-400 focus:outline-none shadow-sm font-medium text-gray-700 cursor-pointer transition-all hover:border-violet-300"
                >
                    <option value="">All Departments</option>
                    {departments.map(d => (
                        <option key={d.department_code} value={d.department_code}>{d.department_code}</option>
                    ))}
                </select>

                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                    <div className="relative group">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-violet-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by name, ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 p-2.5 border border-violet-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-violet-100 focus:border-violet-400 focus:outline-none shadow-sm placeholder:text-gray-400 font-medium text-gray-700 transition-all hover:border-violet-300"
                        />
                    </div>
                </div>

                {/* Faculty Select */}
                <select
                    value={selectedFacultyId}
                    onChange={(e) => setSelectedFacultyId(e.target.value)}
                    className="p-2.5 border border-violet-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-violet-400 focus:border-violet-400 focus:outline-none shadow-sm font-medium text-gray-700 cursor-pointer transition-all hover:border-violet-300 max-w-xs"
                >
                    <option value="">Select Faculty ({filteredFaculties.length})</option>
                    {filteredFaculties.map(f => (
                        <option key={f.faculty_id} value={f.faculty_id}>{f.faculty_name} ({f.faculty_id})</option>
                    ))}
                </select>

                {/* Count */}
                <div className="text-xs text-violet-600 font-semibold bg-white px-4 py-2.5 rounded-xl border border-violet-100 shadow-sm">
                    {filteredFaculties.length} Faculty
                </div>

                {/* View Toggles */}
                <div className="flex flex-wrap items-center gap-4 bg-white px-4 py-2 rounded-xl border border-violet-200 shadow-sm ml-auto">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 hover:text-violet-600 transition-colors">
                        <input type="checkbox" checked={showLabels} onChange={e => setShowLabels(e.target.checked)} className="rounded text-violet-600 focus:ring-violet-500 w-4 h-4 cursor-pointer" />
                        Labels
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 hover:text-violet-600 transition-colors">
                        <input type="checkbox" checked={showCourseCode} onChange={e => setShowCourseCode(e.target.checked)} className="rounded text-violet-600 focus:ring-violet-500 w-4 h-4 cursor-pointer" />
                        Course
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 hover:text-violet-600 transition-colors">
                        <input type="checkbox" checked={showFaculty} onChange={e => setShowFaculty(e.target.checked)} className="rounded text-violet-600 focus:ring-violet-500 w-4 h-4 cursor-pointer" />
                        Faculty
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 hover:text-violet-600 transition-colors">
                        <input type="checkbox" checked={showVenues} onChange={e => setShowVenues(e.target.checked)} className="rounded text-violet-600 focus:ring-violet-500 w-4 h-4 cursor-pointer" />
                        Venues
                    </label>
                </div>

                {selectedFacultyId && timetableData && timetableData.length > 0 && (
                    <div className="flex gap-2">
                        <button onClick={handleDownloadPDF} disabled={downloading} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all disabled:opacity-50">
                            {downloading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                            PDF
                        </button>
                        <button onClick={handlePrint} className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-violet-200 hover:bg-violet-700 transition-all">
                            <Printer size={16} /> Print
                        </button>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center p-20">
                    <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
                </div>
            ) : !selectedFacultyId ? (
                <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl border border-violet-100 shadow-lg shadow-violet-50/50">
                    <AlertCircle className="w-12 h-12 text-violet-200 mb-4" />
                    <div className="text-gray-500 text-xl font-bold mb-2">No Faculty Selected</div>
                    <p className="text-sm text-gray-400">Filter by department, then search and select a faculty member.</p>
                </div>
            ) : conflicts.length > 0 ? (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm mb-6 no-print">
                    <div className="flex items-start">
                        <AlertTriangle className="h-6 w-6 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="text-red-800 font-bold text-lg mb-2">Double-Booking Conflict Detected!</h3>
                            <ul className="list-disc pl-5 space-y-1 text-red-700 text-sm">
                                {conflicts.map((c, i) => <li key={i}>{c}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
            ) : null}

            {selectedFacultyId && timetableData && (
                <div className="bg-white p-4 shadow-xl border border-gray-300 overflow-x-auto print:shadow-none print:border-none rounded-xl">
                    <div id="printable-content" ref={componentRef} className="min-w-[1000px] bg-white text-black p-4">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-800 pb-2 inline-block px-10">
                                PERSONALIZED FACULTY TIMETABLE
                            </h2>
                            <h3 className="text-lg font-bold mt-3 text-gray-800">
                                {displayName}
                            </h3>
                            {selectedFacObj && <p className="text-gray-600 font-semibold">{selectedFacObj.department_code}</p>}
                        </div>

                        <table className="w-full border-collapse text-sm mb-10 border-2 border-gray-800">
                            <thead>
                                <tr>
                                    <th className="p-3 w-32 border-2 border-gray-800 bg-gray-100 font-bold uppercase text-gray-800 tracking-wide">Day / Period</th>
                                    {PERIODS.map((p, i) => (
                                        <th key={i} className="p-2 border-2 border-gray-800 bg-gray-50 text-gray-800">
                                            <span className="font-bold text-base">{p.name}</span><br />
                                            <span className="font-medium text-[11px] text-gray-600">{p.time}</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {DAYS.map(day => {
                                    const cells_row = [];
                                    let skipNext = false;

                                    {
                                        PERIODS.map((p, i) => {
                                            if (skipNext) { skipNext = false; return; }

                                            const cells = getCellsData(day, i);
                                            const hasClass = cells.length > 0;
                                            const isLab = hasClass && (cells[0].session_type === 'LAB' || cells[0].session_type === 'Lab');

                                            let colSpan = 1;
                                            if (isLab && i < PERIODS.length - 1) {
                                                const nextCells = getCellsData(day, i + 1);
                                                if (nextCells.length > 0 && (nextCells[0].session_type === 'LAB' || nextCells[0].session_type === 'Lab')) {
                                                    const curCodes = [...new Set(cells.map(c => c.course_code))].sort().join(',');
                                                    const nxtCodes = [...new Set(nextCells.map(c => c.course_code))].sort().join(',');
                                                    if (curCodes === nxtCodes) { colSpan = 2; skipNext = true; }
                                                }
                                            }

                                            cells_row.push(
                                                <td key={i} colSpan={colSpan} className={`p-2 text-center align-middle border-2 border-gray-800 ${isLab ? 'bg-amber-50' : hasClass ? 'bg-white' : 'bg-gray-50 text-gray-300'}`}>
                                                    {hasClass ? (
                                                        <div className="flex flex-col gap-2 h-full justify-center">
                                                            {cells.map((c, idx) => (
                                                                <div key={idx} className={`flex flex-col justify-center ${idx > 0 ? 'border-t border-gray-300 pt-2' : ''}`}>
                                                                    {showCourseCode && (
                                                                        <div className="font-bold text-[13px] text-gray-900 leading-tight">
                                                                            {c.course_code}
                                                                            {showLabels && c.is_honours && <span className="ml-1 text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded uppercase">Honours</span>}
                                                                            {showLabels && c.is_minor && <span className="ml-1 text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded uppercase">Minor</span>}
                                                                        </div>
                                                                    )}
                                                                    {c.course_name && !c.course_name.toLowerCase().includes('mini project') && (
                                                                        <div className="text-[11px] font-semibold text-gray-700 mt-1 px-1 leading-snug">
                                                                            {c.course_name}
                                                                        </div>
                                                                    )}
                                                                    <div className="flex flex-row items-center justify-center mt-1.5 gap-1.5 flex-wrap">
                                                                        {showFaculty && c.faculty_name && c.faculty_name !== 'Unassigned' && (
                                                                            <span className="text-[10px] italic font-serif text-gray-600">
                                                                                {c.faculty_name}
                                                                            </span>
                                                                        )}
                                                                        {showVenues && c.venue_name && (
                                                                            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded shadow-sm whitespace-nowrap">
                                                                                {c.venue_name}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                            );
                                        })
                                    }

                                    return (
                                        <tr key={day}>
                                            <td className="font-bold text-center text-lg tracking-widest border-2 border-gray-800 bg-gray-50 text-gray-800 h-24">
                                                {day}
                                            </td>
                                            {cells_row}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>


                    </div>
                </div>
            )}
        </div>
    );
};

export default FacultyTimetable;
