import React, { useRef, useState, useCallback } from 'react';
import { Printer, AlertCircle, RefreshCw, Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const BITTimetable = ({ timetableData, department, semester, courses, onRefresh }) => {
    const componentRef = useRef();
    const [downloading, setDownloading] = useState(false);

    // Display Toggles
    const [showLabels, setShowLabels] = useState(true);
    const [showCourseCode, setShowCourseCode] = useState(true);
    const [showFaculty, setShowFaculty] = useState(true);
    const [showVenues, setShowVenues] = useState(true);

    const handlePrint = () => {
        window.print();
    };

    // --- Data Setup (must be before hooks that depend on it) ---
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

    const uniqueDepts = [...new Set((timetableData || []).map(t => t.department_code))];
    const isMasterView = uniqueDepts.length > 1 || (!department && (timetableData || []).length > 0);
    const deptName = isMasterView ? "ALL DEPARTMENTS (MASTER VIEW)" : (department || (timetableData && timetableData[0]?.department_code) || "UNKNOWN");
    const semNum = isMasterView ? "ALL" : (semester || (timetableData && timetableData[0]?.semester) || "UNKNOWN");

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

    const getCourseBadge = useCallback((courseCode, isPdf = false) => {
        if (!courses) return isPdf ? '' : null;
        const course = courses.find(c => c.course_code === courseCode);
        if (!course) return isPdf ? '' : null;

        if (isPdf) {
            if (!showLabels) return '';
            if (course.is_honours) return `<span style="font-size:7px;background-color:#f3e8ff;color:#7e22ce;padding:1px 3px;border-radius:2px;border:1px solid #e9d5ff;margin-left:3px;text-transform:uppercase;letter-spacing:0.05em;display:inline-block;vertical-align:middle;">Honours</span>`;
            if (course.is_minor) return `<span style="font-size:7px;background-color:#e0e7ff;color:#4338ca;padding:1px 3px;border-radius:2px;border:1px solid #c7d2fe;margin-left:3px;text-transform:uppercase;letter-spacing:0.05em;display:inline-block;vertical-align:middle;">Minor</span>`;
            if (course.is_elective) return `<span style="font-size:7px;background-color:#dcfce7;color:#15803d;padding:1px 3px;border-radius:2px;border:1px solid #bbf7d0;margin-left:3px;text-transform:uppercase;letter-spacing:0.05em;display:inline-block;vertical-align:middle;">Elective</span>`;
        } else {
            if (!showLabels) return null;
            if (course.is_honours) return <span className="text-[7.5px] bg-purple-100 text-purple-700 px-1 py-0.5 rounded shadow-sm font-bold border border-purple-200 uppercase tracking-wider ml-1 align-middle">Honours</span>;
            if (course.is_minor) return <span className="text-[7.5px] bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded shadow-sm font-bold border border-indigo-200 uppercase tracking-wider ml-1 align-middle">Minor</span>;
            if (course.is_elective) return <span className="text-[7.5px] bg-green-100 text-green-700 px-1 py-0.5 rounded shadow-sm font-bold border border-green-200 uppercase tracking-wider ml-1 align-middle">Elective</span>;
        }
        return isPdf ? '' : null;
    }, [courses]);

    // --- PDF Download: render in isolated iframe, capture, remove ---
    const handleDownloadPDF = useCallback(async () => {
        if (!timetableData || timetableData.length === 0) return;
        setDownloading(true);
        try {
            // Build breaks HTML
            const breaksHTML = BREAKS.map(b => `
                <div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid black;height:32px;align-items:center;">
                    <div style="padding:4px;text-align:center;border-right:1px solid black;">${b.name}</div>
                    <div style="padding:4px;text-align:center;font-family:Arial,sans-serif;">${b.time}</div>
                </div>
            `).join('');

            // Build period headers
            const periodsHeaderHTML = PERIODS.map(p => `
                <th style="border:1px solid black;padding:8px;height:40px;">
                    <span style="font-size:14px;">${p.name}</span><br/>
                    <span style="font-weight:normal;font-size:10px;font-family:Arial,sans-serif;">${p.time}</span>
                </th>
            `).join('');

            // Build table rows
            const rowsHTML = DAYS.map(day => {
                const cellsHTML = PERIODS.map((p, i) => {
                    const cells = getCellsData(day, i);
                    const primaryCell = cells[0];
                    const isLab = primaryCell && (primaryCell.session_type === 'LAB' || primaryCell.session_type === 'Lab');
                    const isMentor = primaryCell && (primaryCell.session_type === 'MENTOR' || primaryCell.session_type === 'Mentor');
                    let bg = '#ffffff';
                    if (isLab) bg = '#fefce8';
                    if (isMentor) bg = '#dbeafe';

                    if (cells.length > 0) {
                        const uniqueCodes = [...new Set(cells.map(c => c.course_code))];
                        const isPaired = uniqueCodes.length > 1;
                        const hasMultiple = cells.length > 1;

                        const deptBadge = isMasterView
                            ? `<span style="font-size:8px;padding:0 4px;border-radius:4px;margin:4px auto 0;background-color:#e5e7eb;font-family:Arial,sans-serif;display:inline-block;">${primaryCell.department_code || ''}</span>`
                            : '';

                        let cellContentStr = '';
                        // Render completely differently: vertically slice distinct courses
                        const groupBlocks = uniqueCodes.map((code, idx) => {
                            const groupEntries = cells.filter(c => c.course_code === code);
                            const groupName = groupEntries[0]?.course_name || '';
                            const isMiniProject = groupName.toLowerCase().includes('mini project');

                            const codeHTML = showCourseCode ? `<span style="font-weight:bold;font-size:11px;font-family:Arial,sans-serif;letter-spacing:-0.025em;">${code}</span>` : '';
                            const badgeHTML = getCourseBadge(code, true);

                            let detailsHTML = '';
                            if (!isMiniProject) {
                                if (groupEntries.length > 1 && !isPaired) {
                                    // Multiple sections of the same exact code
                                    detailsHTML = `<div style="border-top:1px solid #e5e7eb;margin-top:3px;padding-top:2px;">` + groupEntries.map((c, sIdx) => {
                                        const facHTML = showFaculty ? `<span style="font-size:8px;display:block;font-style:italic;color:#4b5563;white-space:nowrap;"><span style="font-weight:600;">S${c.section_number || sIdx + 1}:</span> ${c.faculty_name || ''}</span>` : '';
                                        const venHTML = (showVenues && c.venue_name) ? `<span style="font-size:7.5px;padding:0 4px;border-radius:3px;margin:1px auto 0;background-color:#e0e7ff;color:#3730a3;font-family:Arial,sans-serif;display:inline-block;font-weight:bold;border:1px solid #c7d2fe;white-space:nowrap;">${c.venue_name}</span>` : '';
                                        return `<div style="margin-top:2px;">${facHTML}${venHTML}</div>`;
                                    }).join('') + `</div>`;
                                } else {
                                    // Single section
                                    const c = groupEntries[0];
                                    const facHTML = showFaculty ? `<span style="font-size:9px;display:block;font-style:italic;color:#4b5563;white-space:nowrap;">${c.faculty_name || ''}</span>` : '';
                                    const venHTML = (showVenues && c.venue_name) ? `<span style="font-size:8.5px;padding:0 4px;border-radius:4px;margin:2px auto 0;background-color:#e0e7ff;color:#3730a3;font-family:Arial,sans-serif;display:inline-block;font-weight:bold;border:1px solid #c7d2fe;white-space:nowrap;">${c.venue_name}</span>` : '';
                                    detailsHTML = `${facHTML}${venHTML}`;
                                }
                            }

                            return `
                                <div style="display:flex;flex-direction:column;justify-content:center;padding:2px 0;${idx > 0 ? 'border-top:1px solid #d1d5db;margin-top:2px;' : ''}">
                                    <div style="display:flex;justify-content:center;align-items:center;">
                                        ${codeHTML} ${badgeHTML}
                                    </div>
                                    <span style="font-size:10px;font-weight:600;line-height:1.25;display:block;padding:0 4px;">${groupName}</span>
                                    ${detailsHTML}
                                </div>
                            `;
                        });

                        cellContentStr = groupBlocks.join('');

                        return `<td style="border:1px solid black;padding:4px;text-align:center;vertical-align:middle;background-color:${bg};">
                            <div style="display:flex;flex-direction:column;gap:2px;justify-content:center;height:100%;">
                                ${cellContentStr}
                                ${deptBadge}
                            </div>
                        </td>`;
                    } else {
                        return `<td style="border:1px solid black;padding:4px;text-align:center;vertical-align:middle;background-color:${bg};"><span style="color:#e5e7eb;">-</span></td>`;
                    }
                }).join('');

                return `<tr style="height:96px;">
                    <td style="border:1px solid black;font-weight:bold;text-align:center;font-size:18px;background-color:#f9fafb;letter-spacing:0.1em;">${day}</td>
                    ${cellsHTML}
                </tr>`;
            }).join('');

            const fullHTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: white; color: black; font-family: 'Times New Roman', serif; }
</style></head>
<body>
<div id="capture-root" style="width:1123px;padding:40px;background:white;">
    <div style="display:flex;border:2px solid black;border-bottom:none;">
        <div style="flex-grow:1;text-align:center;display:flex;flex-direction:column;justify-content:center;">
            <h1 style="margin:4px 0;font-size:24px;font-weight:bold;">BANNARI AMMAN INSTITUTE OF TECHNOLOGY</h1>
            <h2 style="margin:4px 0;font-size:20px;font-weight:bold;">SATHYAMANGALAM</h2>
            <h3 style="margin:4px 0;font-size:16px;font-weight:bold;">CLASS TIMETABLE</h3>
            <div style="margin:4px 0;font-size:14px;font-family:Arial,sans-serif;font-weight:bold;">ACADEMIC YEAR 2025 - 2026</div>
        </div>
        <div style="width:320px;font-size:12px;font-weight:bold;border-left:2px solid black;">
            <div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid black;background-color:#f9fafb;">
                <div style="padding:4px;text-align:center;border-right:1px solid black;">Breaks</div>
                <div style="padding:4px;text-align:center;">Timings</div>
            </div>
            ${breaksHTML}
        </div>
    </div>
    <div style="display:flex;border:2px solid black;border-top:none;border-bottom:none;font-size:18px;font-weight:bold;">
        <div style="flex-grow:1;padding:8px;text-align:center;text-transform:uppercase;letter-spacing:0.05em;">
            DEPARTMENT OF ${deptName}
        </div>
    </div>
    <div style="display:flex;border:2px solid black;border-bottom:none;font-weight:bold;text-align:center;">
        <div style="width:100px;padding:8px;border-right:1px solid black;background-color:#f9fafb;">Year</div>
        <div style="flex-grow:1;padding:8px;border-right:1px solid black;font-size:20px;font-family:Arial,sans-serif;">III</div>
        <div style="width:150px;padding:8px;border-right:1px solid black;background-color:#f9fafb;">Semester</div>
        <div style="width:100px;padding:8px;font-size:20px;font-family:Arial,sans-serif;">${semNum}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;border:2px solid black;font-size:12px;">
        <thead>
            <tr>
                <th style="border:1px solid black;padding:8px;width:120px;height:40px;background-color:#f9fafb;">Day / Period</th>
                ${periodsHeaderHTML}
            </tr>
        </thead>
        <tbody>${rowsHTML}</tbody>
    </table>
    <div style="margin-top:32px;display:flex;justify-content:space-between;font-weight:bold;font-size:14px;padding:0 40px;">
        <div>HoD</div>
        <div>PRINCIPAL</div>
    </div>
</div>
</body></html>`;

            // 1. Create hidden iframe (completely isolated from Tailwind)
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:fixed;top:0;left:0;width:1250px;height:1000px;opacity:0;pointer-events:none;z-index:-1;border:none;';
            document.body.appendChild(iframe);

            // 2. Write clean HTML into the iframe
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            iframeDoc.open();
            iframeDoc.write(fullHTML);
            iframeDoc.close();

            // 3. Wait for paint
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 4. Capture from the iframe
            const captureElement = iframeDoc.getElementById('capture-root');
            if (!captureElement) throw new Error('Could not find capture element in iframe');

            const canvas = await html2canvas(captureElement, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: 1250,
                windowHeight: 1000,
            });

            // 5. Remove iframe
            document.body.removeChild(iframe);

            // 6. Generate PDF
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgProperties = pdf.getImageProperties(imgData);
            const margin = 10;
            const availableWidth = pdfWidth - (margin * 2);
            const availableHeight = pdfHeight - (margin * 2);
            const widthRatio = availableWidth / imgProperties.width;
            const heightRatio = availableHeight / imgProperties.height;
            const ratio = Math.min(widthRatio, heightRatio);
            const finalWidth = imgProperties.width * ratio;
            const finalHeight = imgProperties.height * ratio;
            const x = (pdfWidth - finalWidth) / 2;
            const y = (pdfHeight - finalHeight) / 2;

            pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
            pdf.save(`Timetable_${department || 'Master'}_${semester || 'All'}.pdf`);
        } catch (error) {
            console.error("PDF Generation failed:", error);
            alert(`Failed to generate PDF: ${error.message}`);
        } finally {
            setDownloading(false);
        }
    }, [timetableData, department, semester, isMasterView, deptName, semNum, getCellsData, getCourseBadge]);

    // --- SAFETY CHECK ---
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

    return (
        <div className="p-4 bg-gray-100 min-h-screen font-serif">
            {/* CSS for Print Formatting */}
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #printable-content, #printable-content * { visibility: visible; }
                    #printable-content { 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 100% !important; 
                        max-width: none !important;
                        margin: 0; 
                        padding: 5mm;
                        transform: scale(0.95);
                        transform-origin: top left;
                    }
                    .no-print, button, .sidebar, header, .glass-card { display: none !important; }
                    @page { size: landscape; margin: 0; }
                }
            `}</style>

            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4 dont-print no-print">
                <div className="flex flex-wrap gap-3 bg-white p-2 border border-gray-200 rounded-lg shadow-sm text-xs">
                    <span className="font-semibold text-gray-600 flex items-center pr-2 border-r border-gray-200">View Options:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer hover:text-blue-600 transition-colors">
                        <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer" />
                        Labels
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer hover:text-blue-600 transition-colors">
                        <input type="checkbox" checked={showCourseCode} onChange={(e) => setShowCourseCode(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer" />
                        Codes
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer hover:text-blue-600 transition-colors">
                        <input type="checkbox" checked={showFaculty} onChange={(e) => setShowFaculty(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer" />
                        Faculty
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer hover:text-blue-600 transition-colors">
                        <input type="checkbox" checked={showVenues} onChange={(e) => setShowVenues(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer" />
                        Venues
                    </label>
                </div>

                <div className="flex gap-4">
                    <button onClick={handleDownloadPDF} disabled={downloading} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded shadow hover:bg-emerald-700 font-sans transition-all disabled:opacity-50">
                        {downloading ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
                        Download PDF
                    </button>
                    <button onClick={handlePrint} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 font-sans transition-all">
                        <Printer size={20} /> Print View
                    </button>
                </div>
            </div>

            <div className="mx-auto shadow-lg max-w-[1400px] mb-8 bg-white print:shadow-none print:w-full print:max-w-none">
                <div id="printable-content" ref={componentRef} className="w-full" style={{ minHeight: '210mm', padding: '10mm', backgroundColor: '#ffffff' }}>
                    {/* Header */}
                    <div className="flex" style={{ border: '2px solid #000000', borderBottom: 'none' }}>
                        <div className="flex-grow text-center">
                            <div className="h-full flex flex-col justify-center">
                                <h1 className="font-bold text-xl py-1 font-serif tracking-wide" style={{ color: '#000000' }}>BANNARI AMMAN INSTITUTE OF TECHNOLOGY</h1>
                                <h2 className="font-bold text-lg py-1 font-serif tracking-wide" style={{ color: '#000000' }}>SATHYAMANGALAM</h2>
                                <h3 className="font-bold text-md py-1 font-serif tracking-wide" style={{ color: '#000000' }}>CLASS TIMETABLE</h3>
                                <div className="font-bold text-sm py-1 font-sans" style={{ color: '#000000' }}>ACADEMIC YEAR 2025 - 2026</div>
                            </div>
                        </div>
                        <div className="w-80 text-xs font-bold" style={{ borderLeft: '2px solid #000000' }}>
                            <div className="grid grid-cols-2" style={{ borderBottom: '1px solid #000000', backgroundColor: '#f9fafb' }}>
                                <div className="p-1 text-center font-serif" style={{ borderRight: '1px solid #000000', color: '#000000' }}>Breaks</div>
                                <div className="p-1 text-center font-serif" style={{ color: '#000000' }}>Timings</div>
                            </div>
                            {BREAKS.map((b, i) => (
                                <div key={i} className="grid grid-cols-2 h-8 items-center" style={{ borderBottom: '1px solid #000000' }}>
                                    <div className="p-1 text-center font-serif" style={{ borderRight: '1px solid #000000', color: '#000000' }}>{b.name}</div>
                                    <div className="p-1 text-center font-sans" style={{ color: '#000000' }}>{b.time}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Status Bar */}
                    <div className="flex text-lg font-bold" style={{ border: '2px solid #000000', borderTop: 'none', borderBottom: 'none' }}>
                        <div className="flex-grow p-2 text-center uppercase font-serif tracking-wider" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
                            DEPARTMENT OF {deptName}
                        </div>
                    </div>

                    {/* Sem Row */}
                    <div className="flex font-bold text-center" style={{ border: '2px solid #000000', borderBottom: 'none' }}>
                        <div className="w-24 p-2 font-serif" style={{ borderRight: '1px solid #000000', backgroundColor: '#f9fafb', color: '#000000' }}>Year</div>
                        <div className="flex-grow p-2 text-xl font-sans" style={{ borderRight: '1px solid #000000', backgroundColor: '#ffffff', color: '#000000' }}>III</div>
                        <div className="w-32 p-2 font-serif" style={{ borderRight: '1px solid #000000', backgroundColor: '#f9fafb', color: '#000000' }}>Semester</div>
                        <div className="w-24 p-2 text-xl font-sans" style={{ color: '#000000' }}>{semNum}</div>
                    </div>

                    {/* Main Table */}
                    <table className="w-full border-collapse text-xs" style={{ border: '2px solid #000000' }}>
                        <thead>
                            <tr>
                                <th className="p-2 w-28 h-10 font-serif" style={{ border: '1px solid #000000', backgroundColor: '#f9fafb', color: '#000000' }}>Day / Period</th>
                                {PERIODS.map((p, i) => (
                                    <th key={i} className="p-2 h-10" style={{ border: '1px solid #000000', color: '#000000' }}>
                                        <span className="font-serif text-sm">{p.name}</span><br />
                                        <span className="font-normal text-[10px] font-sans">{p.time}</span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {DAYS.map((day) => (
                                <tr key={day} className="h-24">
                                    <td className="font-bold text-center text-lg font-serif tracking-widest" style={{ border: '1px solid #000000', backgroundColor: '#f9fafb', color: '#000000' }}>{day}</td>
                                    {PERIODS.map((p, i) => {
                                        const cells = getCellsData(day, i);
                                        const primaryCell = cells[0];
                                        const isLab = primaryCell && (primaryCell.session_type === 'LAB' || primaryCell.session_type === 'Lab');
                                        const isMentor = primaryCell && (primaryCell.session_type === 'MENTOR' || primaryCell.session_type === 'Mentor');

                                        let bgStyle = { backgroundColor: '#ffffff' };
                                        if (isLab) bgStyle = { backgroundColor: '#fefce8' };
                                        if (isMentor) bgStyle = { backgroundColor: '#dbeafe' };

                                        const uniqueCodes = [...new Set(cells.map(c => c.course_code))];
                                        const isPaired = uniqueCodes.length > 1;
                                        const hasMultiple = cells.length > 1;

                                        return (
                                            <td key={i} className="p-1 text-center align-middle" style={{ border: '1px solid #000000', WebkitPrintColorAdjust: 'exact', ...bgStyle }}>
                                                {cells.length > 0 ? (
                                                    <div className="flex flex-col gap-0.5 justify-center h-full">
                                                        <div className="font-bold text-[11px] font-sans tracking-tight flex justify-center items-center flex-wrap gap-1 leading-tight" style={{ color: '#000000' }}>
                                                            {uniqueCodes.map((code, idx) => {
                                                                const groupEntries = cells.filter(e => e.course_code === code);
                                                                const groupName = groupEntries[0]?.course_name || '';
                                                                const isMiniProject = groupName.toLowerCase().includes('mini project');

                                                                return (
                                                                    <div key={idx} className={`flex flex-col justify-center flex-grow py-1 ${idx > 0 ? 'border-t border-gray-300 mt-1' : ''}`}>
                                                                        <div className="font-bold text-[11px] font-sans tracking-tight flex justify-center items-center gap-1 leading-tight" style={{ color: '#000000' }}>
                                                                            {showCourseCode && <span>{code}</span>}
                                                                            {getCourseBadge(code, false)}
                                                                        </div>
                                                                        <span className="text-[10.5px] font-semibold leading-tight block px-1 font-serif my-0.5" style={{ color: '#000000' }}>{groupName}</span>

                                                                        {!isMiniProject && (
                                                                            groupEntries.length > 1 && !isPaired ? (
                                                                                <div className="flex flex-col gap-0.5 border-t border-gray-200/50 pt-1 mt-0.5">
                                                                                    {groupEntries.map((e, sIdx) => (
                                                                                        <div key={sIdx} className="flex flex-col items-center">
                                                                                            {showFaculty && <span className="text-[8.5px] font-semibold italic font-serif opacity-80 whitespace-nowrap" style={{ color: '#4b5563' }}><span style={{ color: '#000000' }}>S{e.section_number || sIdx + 1}:</span> {e.faculty_name}</span>}
                                                                                            {showVenues && e.venue_name && <span className="text-[7.5px] px-1 rounded mt-0.5 font-sans font-bold shadow-sm whitespace-nowrap" style={{ backgroundColor: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe' }}>{e.venue_name}</span>}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            ) : (
                                                                                <>
                                                                                    {showFaculty && <span className="text-[9px] block italic font-serif mt-0.5 whitespace-nowrap" style={{ color: '#4b5563' }}>{groupEntries[0]?.faculty_name || ''}</span>}
                                                                                    {showVenues && groupEntries[0]?.venue_name && <span className="text-[8.5px] px-1 rounded mx-auto mt-0.5 font-sans font-bold shadow-sm w-fit whitespace-nowrap" style={{ backgroundColor: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe' }}>{groupEntries[0].venue_name}</span>}
                                                                                </>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        {isMasterView && <span className="text-[8px] px-1 rounded mx-auto mt-1 font-sans" style={{ backgroundColor: '#e5e7eb', color: '#000000' }}>{primaryCell.department_code}</span>}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#e5e7eb' }}>-</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="mt-8 flex justify-between font-bold text-sm px-10 font-serif" style={{ color: '#000000' }}>
                        <div>HoD</div>
                        <div>PRINCIPAL</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BITTimetable;