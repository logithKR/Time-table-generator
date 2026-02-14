import React, { useRef } from 'react';
import { Printer, AlertCircle, RefreshCw } from 'lucide-react';

const BITTimetable = ({ timetableData, department, semester, onRefresh }) => {
    const componentRef = useRef();

    const handlePrint = () => {
        window.print();
    };

    // --- SAFETY CHECK: Prevents White Screen ---
    if (!timetableData || timetableData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 bg-white rounded-xl border-2 border-dashed border-gray-200">
                <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
                <div className="text-gray-500 text-xl font-bold mb-2">No Data Available</div>
                <p className="text-sm text-gray-400 mb-6">Select a Department/Semester above and click "Load Data"</p>
                {onRefresh && (
                    <button onClick={onRefresh} className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded shadow hover:bg-violet-700 transition-all">
                        <RefreshCw size={16} /> Retry Fetch
                    </button>
                )}
            </div>
        );
    }

    // --- Master View Detection ---
    // If we have data from multiple different departments, treat as Master View
    const uniqueDepts = [...new Set(timetableData.map(t => t.department_code))];
    const isMasterView = uniqueDepts.length > 1 || (!department && timetableData.length > 0);

    const deptName = isMasterView ? "ALL DEPARTMENTS (MASTER VIEW)" : (department || timetableData[0]?.department_code || "UNKNOWN");
    const semNum = isMasterView ? "ALL" : (semester || timetableData[0]?.semester || "UNKNOWN");

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
    const BREAKS = [
        { name: 'Morning Break', time: '10.45 am - 11.00 am' },
        { name: 'Lunch Break', time: '01.00 pm - 02.00 pm' },
        { name: 'Evening Break', time: '04.00 pm - 04.15 pm' }
    ];

    const getCellData = (day, periodIndex) => {
        if (!timetableData) return null;
        const targetPeriod = periodIndex + 1;
        const displayToDbDay = {
            "MON": "Monday", "TUE": "Tuesday", "WED": "Wednesday",
            "THU": "Thursday", "FRI": "Friday", "SAT": "Saturday"
        };
        const dbDay = displayToDbDay[day] || day;

        // In Master View, if multiple classes exist for the same slot (Collision),
        // we just show the first one found. (To show all would require a different UI layout)
        return timetableData.find(t => 
            t.day_of_week?.toLowerCase() === dbDay.toLowerCase() && 
            parseInt(t.period_number) === targetPeriod
        );
    };

    return (
        <div className="p-4 bg-gray-100 min-h-screen font-serif">
            {/* CSS for Print Formatting */}
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #printable-content, #printable-content * { visibility: visible; }
                    #printable-content { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
                    .no-print, button, .sidebar, header, .glass-card { display: none !important; }
                    @page { size: landscape; margin: 5mm; }
                }
            `}</style>

            <div className="flex justify-end gap-4 mb-4 dont-print no-print">
                <button onClick={handlePrint} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 font-sans transition-all">
                    <Printer size={20} /> Print View
                </button>
            </div>

            <div id="printable-content" ref={componentRef} className="bg-white mx-auto shadow-lg print:shadow-none print:m-0 w-full max-w-[1400px]" style={{ minHeight: '210mm' }}>
                {/* Header */}
                <div className="flex border-2 border-black border-b-0">
                    <div className="flex-grow text-center">
                        <div className="h-full flex flex-col">
                            <h1 className="font-bold text-xl py-2 border-b border-black">BANNARI AMMAN INSTITUTE OF TECHNOLOGY</h1>
                            <h2 className="font-bold text-lg py-1 border-b border-black">SATHYAMANGALAM</h2>
                            <h3 className="font-bold text-md py-1 border-b border-black">CLASS TIMETABLE</h3>
                            <div className="py-1 font-bold text-sm bg-gray-50 flex-grow flex items-center justify-center">
                                ACADEMIC YEAR 2025 - 2026
                            </div>
                        </div>
                    </div>
                    <div className="w-80 border-l-2 border-black text-xs font-bold">
                        <div className="grid grid-cols-2 border-b border-black bg-gray-50">
                            <div className="p-1 text-center border-r border-black">Breaks</div>
                            <div className="p-1 text-center">Timings</div>
                        </div>
                        {BREAKS.map((b, i) => (
                            <div key={i} className="grid grid-cols-2 border-b border-black last:border-b-0 h-8 items-center">
                                <div className="p-1 text-center border-r border-black">{b.name}</div>
                                <div className="p-1 text-center">{b.time}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Status Bar */}
                <div className="flex border-2 border-black border-y-0 text-sm font-bold">
                    <div className="flex-grow border-r-2 border-black p-2 bg-white text-center uppercase">
                        DEPARTMENT OF {deptName}
                    </div>
                    <div className="w-40 bg-green-600 text-white flex items-center justify-center p-2 print:bg-green-600 print:text-white" style={{ WebkitPrintColorAdjust: 'exact' }}>
                        COMPLETED
                    </div>
                </div>

                {/* Sem Row */}
                <div className="flex border-2 border-black border-b-0 font-bold text-center">
                    <div className="w-24 border-r border-black p-2">Year</div>
                    <div className="flex-grow border-r border-black p-2 bg-yellow-200 print:bg-yellow-200" style={{ WebkitPrintColorAdjust: 'exact' }}>III</div>
                    <div className="w-32 border-r border-black p-2">Semester</div>
                    <div className="w-24 p-2">{semNum}</div>
                </div>

                {/* Main Table */}
                <table className="w-full border-collapse border-2 border-black text-xs">
                    <thead>
                        <tr>
                            <th className="border border-black p-2 w-28 bg-white h-10">Day / Period</th>
                            {PERIODS.map((p, i) => (
                                <th key={i} className="border border-black p-2 h-10">{p.name}<br/><span className="font-normal text-[10px]">{p.time}</span></th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {DAYS.map((day) => (
                            <tr key={day} className="h-28">
                                <td className="border border-black font-bold text-center text-lg bg-gray-50">{day}</td>
                                {PERIODS.map((p, i) => {
                                    const cell = getCellData(day, i);
                                    const isLab = cell && (cell.session_type === 'LAB' || cell.session_type === 'Lab');
                                    
                                    return (
                                        <td key={i} className={`border border-black p-1 text-center align-middle ${isLab ? 'bg-yellow-50 print:bg-yellow-50' : ''}`} style={{ WebkitPrintColorAdjust: 'exact' }}>
                                            {cell ? (
                                                <div className="flex flex-col gap-1 justify-center h-full">
                                                    <span className="font-bold text-[11px] block">{cell.course_code}</span>
                                                    <span className="text-[10px] font-semibold leading-tight block px-1">{cell.course_name}</span>
                                                    <span className="text-[9px] block italic text-gray-600">{cell.faculty_name}</span>
                                                    {/* If Master View, show Dept Name too to distinguish collisions */}
                                                    {isMasterView && <span className="text-[8px] bg-gray-200 px-1 rounded mx-auto">{cell.department_code}</span>}
                                                </div>
                                            ) : (
                                                <span className="text-gray-200">-</span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BITTimetable;