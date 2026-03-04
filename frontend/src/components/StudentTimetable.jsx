import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Printer, AlertCircle, Loader2, Download, Search, AlertTriangle, Layers } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { getDepartments, getStudents, getStudentTimetable } from '../utils/api';

const StudentTimetable = () => {
    const componentRef = useRef();
    const [downloading, setDownloading] = useState(false);

    const [departments, setDepartments] = useState([]);
    const [selectedDept, setSelectedDept] = useState('');

    const [students, setStudents] = useState([]);
    const [selectedStudentId, setSelectedStudentId] = useState('');

    const [timetableData, setTimetableData] = useState(null);
    const [conflicts, setConflicts] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [loadingTimetable, setLoadingTimetable] = useState(false);

    // Filter state
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        getDepartments().then(res => {
            setDepartments(res.data);
        }).catch(console.error);
    }, []);

    useEffect(() => {
        setLoadingStudents(true);
        getStudents(selectedDept || '').then(res => {
            setStudents(res.data);
            setSelectedStudentId('');
            setTimetableData(null);
        }).catch(console.error).finally(() => setLoadingStudents(false));
    }, [selectedDept]);

    const fetchTimetable = async () => {
        if (!selectedStudentId) return;
        setLoadingTimetable(true);
        try {
            const res = await getStudentTimetable(selectedStudentId);
            setTimetableData(res.data.timetable);
            setConflicts(res.data.conflicts);
        } catch (err) {
            console.error(err);
            setTimetableData([]);
            setConflicts([]);
        }
        setLoadingTimetable(false);
    };

    useEffect(() => {
        fetchTimetable();
    }, [selectedStudentId]);

    const handlePrint = () => {
        window.print();
    };

    const PERIODS = [
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
        setDownloading(true);
        try {
            const captureElement = componentRef.current;
            const canvas = await html2canvas(captureElement, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgProperties = pdf.getImageProperties(imgData);

            const margin = 10;
            const availableWidth = pdfWidth - (margin * 2);
            const availableHeight = pdfHeight - (margin * 2);

            const ratio = Math.min(availableWidth / imgProperties.width, availableHeight / imgProperties.height);
            const finalWidth = imgProperties.width * ratio;
            const finalHeight = imgProperties.height * ratio;

            const x = (pdfWidth - finalWidth) / 2;
            const y = (pdfHeight - finalHeight) / 2;

            pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
            pdf.save(`Student_Timetable_${selectedStudentId}.pdf`);
        } catch (error) {
            alert(`Failed to generate PDF: ${error.message}`);
        } finally {
            setDownloading(false);
        }
    };

    const selectedStudentObj = students.find(s => s.student_id === selectedStudentId);
    let displayName = selectedStudentObj ? `${selectedStudentObj.name} (${selectedStudentObj.student_id})` : selectedStudentId;

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.student_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #printable-content, #printable-content * { visibility: visible; }
                    #printable-content { 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 100% !important; 
                        margin: 0; 
                        padding: 5mm;
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

                {/* Department */}
                <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
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
                            placeholder="Search students by name, ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 p-2.5 border border-violet-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-violet-100 focus:border-violet-400 focus:outline-none shadow-sm placeholder:text-gray-400 font-medium text-gray-700 transition-all hover:border-violet-300"
                        />
                    </div>
                </div>

                {/* Student Select */}
                <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    disabled={loadingStudents}
                    className="p-2.5 border border-violet-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-violet-400 focus:border-violet-400 focus:outline-none shadow-sm font-medium text-gray-700 cursor-pointer transition-all hover:border-violet-300 max-w-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                    <option value="">Select Student ({filteredStudents.length})</option>
                    {filteredStudents.map(s => (
                        <option key={s.student_id} value={s.student_id}>{s.name} ({s.student_id})</option>
                    ))}
                </select>

                {loadingStudents && <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />}

                {/* Count */}
                <div className="text-xs text-violet-600 font-semibold bg-white px-4 py-2.5 rounded-xl border border-violet-100 shadow-sm">
                    {filteredStudents.length} Students
                </div>

                {selectedStudentId && timetableData && timetableData.length > 0 && (
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

            {loadingTimetable ? (
                <div className="flex justify-center p-20">
                    <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
                </div>
            ) : !selectedStudentId ? (
                <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl border border-violet-100 shadow-lg shadow-violet-50/50">
                    <AlertCircle className="w-12 h-12 text-violet-200 mb-4" />
                    <div className="text-gray-500 text-xl font-bold mb-2">No Student Selected</div>
                    <p className="text-sm text-gray-400">Filter by department, then search and select a student to view their schedule.</p>
                </div>
            ) : conflicts.length > 0 ? (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm mb-6 no-print">
                    <div className="flex items-start">
                        <AlertTriangle className="h-6 w-6 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="text-red-800 font-bold text-lg mb-2">Registration Conflict Detected!</h3>
                            <ul className="list-disc pl-5 space-y-1 text-red-700 text-sm">
                                {conflicts.map((c, i) => <li key={i}>{c}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
            ) : null}

            {selectedStudentId && timetableData && (
                <div className="bg-white p-4 shadow-xl border border-gray-300 overflow-x-auto print:shadow-none print:border-none rounded-xl">
                    <div id="printable-content" ref={componentRef} className="min-w-[1000px] bg-white text-black p-4">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-800 pb-2 inline-block px-10">
                                PERSONALIZED STUDENT TIMETABLE
                            </h2>
                            <h3 className="text-xl font-bold mt-4 text-gray-800">
                                {displayName}
                            </h3>
                            {selectedStudentObj && <p className="text-gray-600 font-semibold text-lg">{selectedStudentObj.department_code}</p>}
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
                                {DAYS.map(day => (
                                    <tr key={day}>
                                        <td className="font-bold text-center text-lg tracking-widest border-2 border-gray-800 bg-gray-50 text-gray-800 h-24">
                                            {day}
                                        </td>
                                        {PERIODS.map((p, i) => {
                                            const cells = getCellsData(day, i);
                                            const hasClass = cells.length > 0;
                                            const isLab = hasClass && (cells[0].session_type === 'LAB' || cells[0].session_type === 'Lab');

                                            return (
                                                <td key={i} className={`p-2 text-center align-middle border-2 border-gray-800 ${isLab ? 'bg-amber-50' : hasClass ? 'bg-white' : 'bg-gray-50 text-gray-300'}`}>
                                                    {hasClass ? (
                                                        <div className="flex flex-col gap-2 h-full justify-center">
                                                            {cells.map((c, idx) => (
                                                                <div key={idx} className={`flex flex-col justify-center ${idx > 0 ? 'border-t border-gray-300 pt-2' : ''}`}>
                                                                    <div className="font-bold text-[13px] text-gray-900 leading-tight">
                                                                        {c.course_code}
                                                                        {c.department_code && <span className="ml-1 text-[9px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded uppercase">{c.department_code}</span>}
                                                                    </div>
                                                                    {c.course_name && !c.course_name.toLowerCase().includes('mini project') && (
                                                                        <div className="text-[11px] font-semibold text-gray-700 mt-1 px-1 leading-snug">
                                                                            {c.course_name}
                                                                        </div>
                                                                    )}
                                                                    <div className="flex flex-row items-center justify-center mt-1.5 gap-1.5 flex-wrap">
                                                                        {c.faculty_name && c.faculty_name !== 'Unassigned' && (
                                                                            <span className="text-[10px] italic font-serif text-gray-600">
                                                                                {c.faculty_name}
                                                                            </span>
                                                                        )}
                                                                        {c.venue_name && (
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
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="flex justify-between font-bold text-sm px-10 text-gray-800 mt-16 pt-8 border-t border-gray-300 print:mt-16">
                            <div>STUDENT SIGNATURE</div>
                            <div>CLASS TUTOR</div>
                            <div>HoD</div>
                            <div>PRINCIPAL</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentTimetable;
