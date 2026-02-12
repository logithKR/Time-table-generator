
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

    // Configuration for 8 Periods + Breaks
    const PERIODS = [
        { name: "I", time: "8:45 AM - 9:35 AM" },
        { name: "II", time: "9:35 AM - 10:25 AM" },
        { name: "BREAK", time: "10:25 AM - 10:40 AM", label: "Morning Break" },
        { name: "III", time: "10:40 AM - 11:30 AM" },
        { name: "IV", time: "11:30 AM - 12:20 PM" },
        { name: "LUNCH", time: "12:20 PM - 1:20 PM", label: "Lunch Break" },
        { name: "V", time: "1:20 PM - 2:10 PM" },
        { name: "VI", time: "2:10 PM - 3:00 PM" },
        { name: "BREAK", time: "3:00 PM - 3:15 PM", label: "Afternoon Break" },
        { name: "VII", time: "3:15 PM - 4:25 PM" },
        { name: "VIII", time: "4:30 PM - 5:30 PM" },
    ];

    const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Mapping Backend Data to Grid
    const getCellData = (day, periodIndex) => {
        // periodIndex is 0-based index of periods (I=0, II=1...)
        // DB has period_number 1-8.
        if (!timetableData) return null;

        const targetPeriod = periodIndex + 1;

        // Find entry
        // Schema: entry.slot.day (e.g. "Mon"), entry.slot.period_number
        const entry = timetableData.find(t =>
            t.slot &&
            t.slot.day === day &&
            t.slot.period_number === targetPeriod
        );

        return entry;
    };

    if (!timetableData || timetableData.length === 0) return <div className="text-gray-400 p-10 text-center text-xl italic">No timetable data to display</div>;

    return (
        <div className="p-4 bg-gray-100 min-h-screen">
            <div className="flex justify-end gap-4 mb-4 dont-print">
                <button onClick={handlePrint} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">
                    <Printer size={20} /> Print View
                </button>
            </div>

            {/* Main Timetable Sheet */}
            <div ref={componentRef} className="bg-white p-8 mx-auto shadow-lg print:shadow-none print:p-0 max-w-[1200px]" style={{ minHeight: '297mm' }}>

                {/* Header */}
                <div className="text-center border-2 border-black mb-1">
                    <h1 className="font-bold text-xl py-1 border-b border-black">BANNARI AMMAN INSTITUTE OF TECHNOLOGY</h1>
                    <h2 className="font-bold text-lg py-1 border-b border-black">SATHYAMANGALAM</h2>
                    <h3 className="font-bold text-md py-1">CLASS TIMETABLE</h3>
                </div>

                {/* Academic Year Info */}
                <div className="flex justify-between border-2 border-black mb-1 text-sm font-semibold">
                    <div className="p-1 px-4 w-full text-center">ACADEMIC YEAR 2025 - 2026 (WITH EFFECT FROM 23.06.2025 TO 19.07.2025)</div>
                </div>

                {/* Department Info */}
                <div className="text-center border-2 border-black font-bold py-2 mb-4 bg-gray-50 uppercase">
                    DEPARTMENT OF {timetableData[0]?.department?.dept_name || department}
                </div>

                {/* Year/Sem Grid */}
                <div className="grid grid-cols-4 border-2 border-black text-center font-bold mb-4">
                    <div className="border-r border-black p-1">Year</div>
                    <div className="border-r border-black p-1">III</div>
                    <div className="border-r border-black p-1">Semester</div>
                    <div className="p-1">{timetableData[0]?.semester?.semester_number || semester}</div>
                </div>

                {/* Timetable Grid */}
                <table className="w-full border-collapse border-2 border-black text-xs">
                    <thead>
                        {/* Period Numbers */}
                        <tr>
                            <th className="border border-black p-1 bg-gray-50 w-24">Period</th>
                            {PERIODS.map((p, i) => (
                                <th key={i} className={`border border-black p-1 ${p.name === 'BREAK' || p.name === 'LUNCH' ? 'bg-gray-200' : ''}`}>
                                    {p.name === 'BREAK' || p.name === 'LUNCH' ? '' : p.name}
                                </th>
                            ))}
                        </tr>
                        {/* Timings */}
                        <tr>
                            <th className="border border-black p-1 bg-gray-50">Day / Timings</th>
                            {PERIODS.map((p, i) => (
                                <th key={i} className={`border border-black p-1 ${p.name === 'BREAK' || p.name === 'LUNCH' ? 'bg-gray-200' : ''}`}>
                                    {p.time}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {DAYS.map((day) => (
                            <tr key={day}>
                                <td className="border border-black p-2 font-bold text-center bg-gray-50">{day}</td>
                                {PERIODS.map((p, i) => {
                                    if (p.name === 'BREAK' || p.name === 'LUNCH') {
                                        return <td key={i} className="border border-black bg-gray-200 text-center font-bold rotate-text">{p.label}</td>;
                                    }

                                    // Determine Actual Period Index (0, 1, 2...) skipping breaks
                                    let realIndex = 0;
                                    if (p.name === 'I') realIndex = 0;
                                    if (p.name === 'II') realIndex = 1;
                                    if (p.name === 'III') realIndex = 2;
                                    if (p.name === 'IV') realIndex = 3;
                                    if (p.name === 'V') realIndex = 4;
                                    if (p.name === 'VI') realIndex = 5;
                                    if (p.name === 'VII') realIndex = 6;
                                    if (p.name === 'VIII') realIndex = 7;

                                    const cell = getCellData(day, realIndex);

                                    return (
                                        <td key={i} className="border border-black p-1 text-center h-24 align-middle">
                                            {cell ? (
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-bold text-blue-900">{cell.course?.course_code}</span>
                                                    <span className="text-xs font-semibold">{cell.course?.course_name}</span>
                                                    <span className="text-xs italic text-gray-700">{cell.faculty?.faculty_name}</span>
                                                    <span className="text-[10px] bg-gray-200 rounded px-1 w-fit mx-auto">{cell.venue?.venue_name || "TBA"}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="mt-4 text-xs">
                    <p><strong>Computed by:</strong> AI Solver (OR-Tools) | <strong>Status:</strong> <span className="text-green-600 font-bold">OPTIMAL</span></p>
                </div>

            </div>

            {/* CSS for print/vertical text */}
            <style>{`
        @media print {
            .dont-print { display: none; }
            body { -webkit-print-color-adjust: exact; }
        }
        .rotate-text {
            writing-mode: vertical-rl;
            text-orientation: mixed;
            font-size: 10px;
            padding: 2px;
        }
      `}</style>
        </div>
    );
};

export default BITTimetable;
