
import React, { useRef, useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Download, Printer, Loader } from 'lucide-react';
import { getTimetable } from '../utils/api';

const BITTimetable = ({ timetableData, department = "Department", semester = "Semester" }) => {
    const componentRef = useRef();

    const handlePrint = () => {
        window.print();
    };

    // Configuration for 8 Periods (No Breaks in Columns)
    const PERIODS = [
        { name: "I", time: "8:45 AM - 9:35 AM" },
        { name: "II", time: "9:35 AM - 10:25 AM" },
        { name: "III", time: "10:40 AM - 11:30 AM" },
        { name: "IV", time: "11:30 AM - 12:20 PM" },
        { name: "V", time: "1:20 PM - 2:10 PM" },
        { name: "VI", time: "2:10 PM - 3:00 PM" },
        { name: "VII", time: "3:15 PM - 4:15 PM" }, // Adjusted based on standard flow
        { name: "VIII", time: "4:30 PM - 5:30 PM" },
    ];

    const BREAKS = [
        { name: "Morning Break", time: "10:25 AM - 10:40 AM" },
        { name: "Lunch Break", time: "12:20 PM - 1:20 PM" },
        { name: "Afternoon Break", time: "3:00 PM - 3:15 PM" },
    ];

    const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

    // Mapping Backend Data to Grid
    const getCellData = (day, periodIndex) => {
        // periodIndex is 0-based index corresponding to PERIODS array
        // DB has period_number 1-8.
        if (!timetableData) return null;

        const targetPeriod = periodIndex + 1;

        // Map short day to full day if needed, or matched based on data
        // Assuming DB uses "Mon", "Tue"... 
        // Display uses "MON", "TUE".
        const dayMap = { "MON": "Mon", "TUE": "Tue", "WED": "Wed", "THU": "Thu", "FRI": "Fri", "SAT": "Sat" };
        const searchDay = dayMap[day] || day;

        const entry = timetableData.find(t =>
            t.slot &&
            t.slot.day === searchDay &&
            t.slot.period_number === targetPeriod
        );

        return entry;
    };

    if (!timetableData || timetableData.length === 0) return <div className="text-gray-400 p-10 text-center text-xl italic font-serif">No timetable data to display</div>;

    const deptName = timetableData[0]?.department?.dept_name || department;
    const semNum = timetableData[0]?.semester?.semester_number || semester;

    return (
        <div className="p-4 bg-gray-100 min-h-screen font-serif">
            <div className="flex justify-end gap-4 mb-4 dont-print">
                <button onClick={handlePrint} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 font-sans">
                    <Printer size={20} /> Print View
                </button>
            </div>

            {/* Main Timetable Sheet */}
            <div ref={componentRef} className="bg-white mx-auto shadow-lg print:shadow-none print:m-0 w-full max-w-[1400px]" style={{ minHeight: '210mm' }}>

                {/* ─── TITLE & BREAKS HEADER ─── */}
                <div className="flex border-2 border-black border-b-0">
                    {/* Left: Title Info */}
                    <div className="flex-grow text-center">
                        <div className="h-full flex flex-col">
                            <h1 className="font-bold text-xl py-2 border-b border-black">BANNARI AMMAN INSTITUTE OF TECHNOLOGY</h1>
                            <h2 className="font-bold text-lg py-1 border-b border-black">SATHYAMANGALAM</h2>
                            <h3 className="font-bold text-md py-1 border-b border-black">CLASS TIMETABLE</h3>
                            <div className="py-1 font-bold text-sm bg-gray-50 flex-grow flex items-center justify-center">
                                ACADEMIC YEAR 2025 - 2026 (WITH EFFECT FROM 23.06.2025 TO 19.07.2025)
                            </div>
                        </div>
                    </div>

                    {/* Right: Breaks Table */}
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

                {/* ─── STATUS BAR ─── */}
                <div className="flex border-2 border-black border-y-0 text-sm font-bold">
                    <div className="flex-grow border-r-2 border-black p-2 bg-white text-center">
                        DEPARTMENT OF {deptName}
                    </div>
                    <div className="w-40 bg-green-600 text-white flex items-center justify-center p-2 print:bg-green-600 print:text-white" style={{ WebkitPrintColorAdjust: 'exact' }}>
                        COMPLETED
                    </div>
                </div>

                {/* ─── YEAR / SEMESTER ROW ─── */}
                <div className="flex border-2 border-black border-b-0 font-bold text-center">
                    <div className="w-24 border-r border-black p-2">Year</div>
                    <div className="flex-grow border-r border-black p-2 bg-yellow-200 print:bg-yellow-200" style={{ WebkitPrintColorAdjust: 'exact' }}>III</div>
                    <div className="w-32 border-r border-black p-2">Semester</div>
                    <div className="w-24 p-2">V</div>
                </div>

                {/* ─── MAIN GRID ─── */}
                <table className="w-full border-collapse border-2 border-black text-xs">
                    <thead>
                        {/* Period Numbers Row */}
                        <tr>
                            <th className="border border-black p-2 w-28 bg-white h-10">Period</th>
                            {PERIODS.map((p, i) => (
                                <th key={i} className="border border-black p-2 h-10">{p.name}</th>
                            ))}
                        </tr>
                        {/* Timings Row */}
                        <tr>
                            <th className="border border-black p-2 h-10">Day / Timings</th>
                            {PERIODS.map((p, i) => (
                                <th key={i} className="border border-black p-1 h-10 text-[11px]">{p.time}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {DAYS.map((day) => (
                            <tr key={day} className="h-28">
                                <td className="border border-black font-bold text-center text-lg">{day}</td>
                                {PERIODS.map((p, i) => {
                                    const cell = getCellData(day, i);

                                    // Lab Logic: Check if it's a Lab to apply styling
                                    const isLab = cell && cell.session_type === 'LAB';
                                    const isMentor = day === 'SAT' && i === 6; // Example logic for Mentor

                                    // Dynamic classes
                                    let bgClass = "";
                                    if (isLab) bgClass = "bg-yellow-200 print:bg-yellow-200";
                                    if (isMentor) bgClass = "bg-blue-200 print:bg-blue-200";

                                    // Special case: Mentor Iteraction on Sat last period?
                                    // Just render cell normally.

                                    return (
                                        <td key={i} className={`border border-black p-1 text-center align-middle ${bgClass}`} style={{ WebkitPrintColorAdjust: 'exact' }}>
                                            {cell ? (
                                                <div className="flex flex-col gap-1 justify-center h-full">
                                                    <span className="font-bold text-sm block">{cell.course?.course_code}</span>
                                                    <span className="text-xs font-semibold leading-tight block px-1">{cell.course?.course_name}</span>
                                                    <span className="text-xs block">{cell.faculty?.faculty_name}</span>
                                                    <span className="text-[10px] block mt-1">{cell.venue?.venue_name || "EW 102"}</span>
                                                    {isLab && <span className="text-[10px] block font-bold mt-1">Mech Block-Computer Lab 23</span>}
                                                </div>
                                            ) : (
                                                // Handle Empty Slot (or specific text like OPEN ELECTIVE)
                                                i === 2 && (day === 'TUE' || day === 'THU') ? (
                                                    <span className="font-bold">OPEN ELECTIVE</span>
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* CSS for print settings */}
            <style>{`
                @media print {
                    @page {
                        size: landscape;
                        margin: 5mm;
                    }
                    .dont-print { display: none; }
                    body { 
                        -webkit-print-color-adjust: exact; 
                        print-color-adjust: exact;
                    }
                }
            `}</style>
        </div>
    );
};

export default BITTimetable;


