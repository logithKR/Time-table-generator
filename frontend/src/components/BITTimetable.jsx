import React, { useState, useCallback, useRef } from 'react';
import { Printer, AlertCircle, RefreshCw, Download, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

const BITTimetable = ({ timetableData, department, semester, courses, slots, onRefresh }) => {
    const componentRef = useRef(null);
    const [downloading, setDownloading] = useState(false);

    // Display Toggles
    const [showLabels, setShowLabels] = useState(true);
    const [showCourseCode, setShowCourseCode] = useState(true);
    const [showFaculty, setShowFaculty] = useState(true);
    const [showVenues, setShowVenues] = useState(true);

    const handlePrint = () => {
        window.print();
    };

    // --- Data Setup ---
    const PERIODS = slots && slots.length > 0
        ? slots.filter(s => s.day_of_week === 'Monday' && s.slot_type === 'REGULAR')
            .sort((a, b) => a.period_number - b.period_number)
            .map((s, i) => ({ name: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][i] || `${i + 1}`, time: `${s.start_time} - ${s.end_time}` }))
        : [
            { name: 'I', time: '08.45 - 09.45' },
            { name: 'II', time: '09.45 - 10.45' },
            { name: 'III', time: '11.00 - 12.00' },
            { name: 'IV', time: '12.00 - 01.00' },
            { name: 'V', time: '02.00 - 03.00' },
            { name: 'VI', time: '03.00 - 04.00' },
            { name: 'VII', time: '04.15 - 05.15' },
            { name: 'VIII', time: '05.15 - 06.15' }
        ];
    const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const BREAKS = slots && slots.length > 0
        ? slots.filter(s => s.day_of_week === 'Monday' && s.slot_type !== 'REGULAR')
            .sort((a, b) => a.start_time.localeCompare(b.start_time))
            .map(s => ({ name: s.slot_type === 'LUNCH' ? 'Lunch Break' : s.slot_type || 'Break', time: `${s.start_time} - ${s.end_time}` }))
        : [
            { name: 'Morning Break', time: '10.45 - 11.00' },
            { name: 'Lunch Break', time: '01.00 - 02.00' },
            { name: 'Evening Break', time: '04.00 - 04.15' }
        ];

    const uniqueDepts = [...new Set((timetableData || []).map(t => t.department_code).filter(Boolean))];
    const uniqueSems = [...new Set((timetableData || []).map(t => t.semester).filter(Boolean))];
    // Only true master view when the data genuinely covers multiple departments
    const isMasterView = uniqueDepts.length > 1;
    const deptName = department
        || (uniqueDepts.length === 1 ? uniqueDepts[0] : (uniqueDepts.length > 1 ? 'ALL DEPARTMENTS' : 'UNKNOWN'));
    const semNum = semester
        || (uniqueSems.length === 1 ? uniqueSems[0] : (uniqueSems.length > 1 ? 'ALL' : 'UNKNOWN'));

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

    const getCourseBadge = useCallback((courseCode) => {
        if (!courses) return null;
        const course = courses.find(c => c.course_code === courseCode);
        if (!course) return null;
        if (!showLabels) return null;
        if (course.is_honours) return <span className="text-[7.5px] bg-purple-100 text-purple-700 px-1 py-0.5 rounded shadow-sm font-bold border border-purple-200 uppercase tracking-wider ml-1 align-middle">Honours</span>;
        if (course.is_minor) return <span className="text-[7.5px] bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded shadow-sm font-bold border border-indigo-200 uppercase tracking-wider ml-1 align-middle">Minor</span>;
        if (course.is_elective) return <span className="text-[7.5px] bg-green-100 text-green-700 px-1 py-0.5 rounded shadow-sm font-bold border border-green-200 uppercase tracking-wider ml-1 align-middle">Elective</span>;
        return null;
    }, [courses, showLabels]);

    // --- PDF Download relies on html-to-image for accurate screenshot capture ---
    const handleDownloadPDF = useCallback(async () => {
        if (!timetableData || timetableData.length === 0) return;
        if (!componentRef.current) return;
        setDownloading(true);
        try {
            // Give react a moment to render the loading state
            await new Promise(r => setTimeout(r, 100));

            // toPng is vastly superior to html2canvas for Tailwind / modern CSS
            const dataUrl = await toPng(componentRef.current, {
                quality: 1.0,
                pixelRatio: 3, // High-res capture
                backgroundColor: '#ffffff',
                fontEmbedCSS: '' // bypass cross-origin font fetching errors
            });

            // A4 landscape sizing
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            // Calculate aspect ratio fit
            const imgProps = pdf.getImageProperties(dataUrl);
            const ratio = Math.min(pdfWidth / imgProps.width, pdfHeight / imgProps.height);
            const imgWidth = imgProps.width * ratio;
            const imgHeight = imgProps.height * ratio;

            // Center the image horizontally and vertically
            const marginX = Math.max(0, (pdfWidth - imgWidth) / 2);
            const marginY = Math.max(0, (pdfHeight - imgHeight) / 2);

            pdf.addImage(dataUrl, 'PNG', marginX, marginY, imgWidth, imgHeight);
            pdf.save(`Timetable_${department || 'Master'}_${semester || 'All'}.pdf`);
        } catch (error) {
            console.error("PDF Generation failed:", error);
            alert(`Failed to generate PDF: ${error.message}`);
        } finally {
            setDownloading(false);
        }
    }, [timetableData, department, semester]);

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
        <div className="bg-white min-h-screen" style={{ fontFamily: 'Arial, sans-serif' }}>
            {/* CSS for Print - Perfect Screenshot Look */}
            <style>{`
                @media print {
                    body * { visibility: hidden !important; }
                    /* Show only printable content and its children */
                    #printable-content, #printable-content * { 
                        visibility: visible !important; 
                        /* Force background colors to print exactly as seen */
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    /* Reset everything to let the table fill the page perfectly */
                    /* Reset everything to let the table fill the page perfectly */
                    body, html {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                    }

                    #printable-content {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        /* The secret to making it fit: extend the width then scale it down! */
                        width: 133% !important; 
                        max-width: none !important;
                        margin: 0 !important;
                        padding: 8mm !important; 
                        box-sizing: border-box !important;
                        page-break-after: avoid !important;
                        
                        /* Scale down globally so the 1135px table fits onto the ~1050px landscape page */
                        zoom: 0.75;
                        /* Firefox fallback */
                        transform: scale(0.75);
                        transform-origin: top left;
                    }

                    /* Hide UI elements */
                    .no-print { display: none !important; }

                    /* Enforce landscape and zero native margin */
                    @page { 
                        size: A4 landscape;
                        margin: 0mm; 
                    }
                }
            `}</style>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4 no-print" style={{ fontFamily: 'Arial, sans-serif' }}>
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
                    <button onClick={handleDownloadPDF} disabled={downloading} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg shadow-md hover:bg-emerald-700 font-sans font-bold transition-all disabled:opacity-70">
                        {downloading ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
                        {downloading ? 'Capturing Image...' : 'Download Image PDF'}
                    </button>
                    <button onClick={handlePrint} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg shadow-md hover:bg-blue-700 font-sans font-bold transition-all">
                        <Printer size={20} /> Print Layout
                    </button>
                </div>
            </div>

            {/* Printable Content - Now managed simply by browser scaling */}
            <div className="w-full bg-white print:shadow-none bg-transparent">
                <div id="printable-content" ref={componentRef} className="w-full" style={{ backgroundColor: '#ffffff', padding: '6mm' }}>
                    {/* Header */}
                    <div className="flex" style={{ border: '2px solid #000000', borderBottom: 'none' }}>
                        <div className="flex-grow text-center">
                            <div className="h-full flex flex-col justify-center py-1">
                                <h1 className="font-bold text-xl py-0.5 tracking-wide" style={{ color: '#000000', fontFamily: 'Arial, sans-serif' }}>BANNARI AMMAN INSTITUTE OF TECHNOLOGY</h1>
                                <h2 className="font-bold text-base py-0.5 tracking-wide" style={{ color: '#000000', fontFamily: 'Arial, sans-serif' }}>SATHYAMANGALAM</h2>
                                <h3 className="font-bold text-sm py-0.5 tracking-wide" style={{ color: '#000000', fontFamily: 'Arial, sans-serif' }}>CLASS TIMETABLE</h3>
                                <div className="font-bold text-xs py-0.5" style={{ color: '#000000', fontFamily: 'Arial, sans-serif' }}>ACADEMIC YEAR 2025 - 2026</div>
                            </div>
                        </div>
                        <div className="w-72 text-xs font-bold" style={{ borderLeft: '2px solid #000000' }}>
                            <div className="grid grid-cols-2" style={{ borderBottom: '1px solid #000000', backgroundColor: '#f3f4f6' }}>
                                <div className="p-1 text-center" style={{ borderRight: '1px solid #000000', color: '#000000', fontFamily: 'Arial, sans-serif' }}>Breaks</div>
                                <div className="p-1 text-center" style={{ color: '#000000', fontFamily: 'Arial, sans-serif' }}>Timings</div>
                            </div>
                            {BREAKS.map((b, i) => (
                                <div key={i} className="grid grid-cols-2 items-center" style={{ borderBottom: '1px solid #000000', minHeight: '28px' }}>
                                    <div className="p-1 text-center text-[10px]" style={{ borderRight: '1px solid #000000', color: '#000000', fontFamily: 'Arial, sans-serif' }}>{b.name}</div>
                                    <div className="p-1 text-center text-[10px]" style={{ color: '#000000', fontFamily: 'Arial, sans-serif' }}>{b.time}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Department bar */}
                    <div className="flex text-base font-bold" style={{ border: '2px solid #000000', borderTop: 'none', borderBottom: 'none', fontFamily: 'Arial, sans-serif' }}>
                        <div className="flex-grow p-1.5 text-center uppercase tracking-wider" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
                            DEPARTMENT OF {deptName}
                        </div>
                    </div>

                    {/* Sem Row */}
                    <div className="flex font-bold text-center text-sm" style={{ border: '2px solid #000000', borderBottom: 'none', fontFamily: 'Arial, sans-serif' }}>
                        <div className="w-20 p-1.5" style={{ borderRight: '1px solid #000000', backgroundColor: '#f3f4f6', color: '#000000' }}>Year</div>
                        <div className="flex-grow p-1.5 text-lg" style={{ borderRight: '1px solid #000000', backgroundColor: '#ffffff', color: '#000000' }}>III</div>
                        <div className="w-28 p-1.5" style={{ borderRight: '1px solid #000000', backgroundColor: '#f3f4f6', color: '#000000' }}>Semester</div>
                        <div className="w-20 p-1.5 text-lg" style={{ color: '#000000' }}>{semNum}</div>
                    </div>

                    {/* Main Table */}
                    <table className="w-full border-collapse" style={{ border: '2px solid #000000', fontFamily: 'Arial, sans-serif', fontSize: '11px' }}>
                        <thead>
                            <tr>
                                <th style={{ border: '1px solid #000000', padding: '6px 4px', backgroundColor: '#f3f4f6', color: '#000000', width: '70px', textAlign: 'center' }}>Day</th>
                                {(() => {
                                    const headers = [];
                                    PERIODS.forEach((p, i) => {
                                        headers.push(
                                            <th key={`p-${i}`} style={{ border: '1px solid #000000', padding: '4px 2px', textAlign: 'center', color: '#000000', minWidth: '90px' }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{p.name}</div>
                                                <div style={{ fontWeight: 'normal', fontSize: '9px', color: '#6b7280' }}>{p.time}</div>
                                            </th>
                                        );
                                        const afterPeriod = i + 1;
                                        const breakAfter = BREAKS.find((b, bi) => {
                                            if (slots && slots.length > 0) {
                                                const thisPeriodSlot = slots.find(s => s.day_of_week === 'Monday' && s.slot_type === 'REGULAR' && s.period_number === afterPeriod);
                                                const nextBreak = slots.filter(s => s.day_of_week === 'Monday' && s.slot_type !== 'REGULAR').sort((a, b2) => a.start_time.localeCompare(b2.start_time))[bi];
                                                return thisPeriodSlot && nextBreak && nextBreak.start_time === thisPeriodSlot.end_time;
                                            }
                                            return (bi === 0 && afterPeriod === 2) || (bi === 1 && afterPeriod === 4) || (bi === 2 && afterPeriod === 6);
                                        });
                                        if (breakAfter) {
                                            headers.push(
                                                <th key={`b-${i}`} style={{ border: '1px solid #000000', padding: '4px 2px', textAlign: 'center', backgroundColor: '#f3f4f6', color: '#6b7280', width: '55px', writingMode: 'vertical-rl', fontSize: '9px', fontWeight: 'bold' }}>
                                                    {breakAfter.name}<br /><span style={{ fontSize: '8px', fontWeight: 'normal', writingMode: 'horizontal-tb' }}>{breakAfter.time}</span>
                                                </th>
                                            );
                                        }
                                    });
                                    return headers;
                                })()}
                            </tr>
                        </thead>
                        <tbody>
                            {DAYS.map((day) => {
                                let skipNext = false;
                                const cells_row = [];

                                PERIODS.forEach((p, i) => {
                                    if (i > 0) {
                                        const prevPeriodNum = i;
                                        const breakHere = BREAKS.find((b, bi) => {
                                            if (slots && slots.length > 0) {
                                                const prevSlot = slots.find(s => s.day_of_week === 'Monday' && s.slot_type === 'REGULAR' && s.period_number === prevPeriodNum);
                                                const nextBreak = slots.filter(s => s.day_of_week === 'Monday' && s.slot_type !== 'REGULAR').sort((a, b2) => a.start_time.localeCompare(b2.start_time))[bi];
                                                return prevSlot && nextBreak && nextBreak.start_time === prevSlot.end_time;
                                            }
                                            return (bi === 0 && prevPeriodNum === 2) || (bi === 1 && prevPeriodNum === 4) || (bi === 2 && prevPeriodNum === 6);
                                        });
                                        if (breakHere) {
                                            cells_row.push(
                                                <td key={`br-${i}`} style={{ border: '1px solid #000000', backgroundColor: '#f9fafb', textAlign: 'center', verticalAlign: 'middle', width: '55px' }}>
                                                    <span style={{ fontSize: '14px', color: '#9ca3af' }}>☕</span>
                                                </td>
                                            );
                                        }
                                    }

                                    if (skipNext) { skipNext = false; return; }

                                    const cells = getCellsData(day, i);
                                    const primaryCell = cells[0];
                                    const isLab = primaryCell && (primaryCell.session_type === 'LAB' || primaryCell.session_type === 'Lab');
                                    const isMentor = primaryCell && (primaryCell.session_type === 'MENTOR' || primaryCell.session_type === 'Mentor');

                                    let colSpan = 1;
                                    if (isLab && i < PERIODS.length - 1) {
                                        const nextCells = getCellsData(day, i + 1);
                                        if (nextCells.length > 0 && (nextCells[0].session_type === 'LAB' || nextCells[0].session_type === 'Lab')) {
                                            const curCodes = [...new Set(cells.map(c => c.course_code))].sort().join(',');
                                            const nxtCodes = [...new Set(nextCells.map(c => c.course_code))].sort().join(',');
                                            if (curCodes === nxtCodes) { colSpan = 2; skipNext = true; }
                                        }
                                    }

                                    let bgColor = '#ffffff';
                                    if (isLab) bgColor = '#fefce8';
                                    if (isMentor) bgColor = '#dbeafe';

                                    if (cells.length > 0) {
                                        const explicitOEEntries = cells.filter(e => e.session_type === 'OPEN_ELECTIVE' || e.course_code === 'OPEN_ELEC' || courses?.find(c => c.course_code === e.course_code)?.is_open_elective);
                                        const regularEntries = cells.filter(e => !explicitOEEntries.includes(e));
                                        const regularCodes = [...new Set(regularEntries.map(e => e.course_code))];
                                        const explicitOECodes = [...new Set(explicitOEEntries.map(e => e.course_code))];
                                        const hasImplicitOE = regularEntries.some(e => e.course_name && e.course_name.toLowerCase().includes('open elective'));
                                        const shouldShowOEPlaceholder = hasImplicitOE && explicitOECodes.length === 0;

                                        const renderBlock = (code, idx, isOEBlock, groupEntries) => {
                                            let groupName = groupEntries[0]?.course_name || '';
                                            groupName = groupName.replace(/\s*\/\s*OPEN\s*ELECTIVE\s*/gi, '').trim();

                                            const isMiniProject = groupName.toLowerCase().includes('mini project');
                                            return (
                                                <div key={code + idx} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2px 0', borderTop: idx > 0 || (isOEBlock && regularCodes.length > 0) ? '1px solid #d1d5db' : 'none', marginTop: idx > 0 ? '2px' : 0, flexGrow: 1 }}>
                                                    {showCourseCode && <div style={{ fontWeight: 'bold', fontSize: '11px', color: isOEBlock ? '#0f766e' : '#000000' }}>{code}{getCourseBadge(code)}</div>}
                                                    <div style={{ fontWeight: '600', fontSize: '10px', lineHeight: 1.2, color: isOEBlock ? '#0d9488' : '#000000' }}>{groupName || (isOEBlock ? 'OPEN ELECTIVE' : '')}</div>
                                                    {!isMiniProject && groupEntries.map((e, sIdx) => (
                                                        <div key={sIdx}>
                                                            {showFaculty && e.faculty_name && e.faculty_name !== 'Unassigned' && <div style={{ fontSize: '9px', fontStyle: 'italic', color: '#4b5563' }}>{e.faculty_name}</div>}
                                                            {showVenues && e.venue_name && <div style={{ fontSize: '8.5px', color: '#3730a3', background: '#e0e7ff', borderRadius: '3px', padding: '0 3px', display: 'inline-block', border: '1px solid #c7d2fe', marginTop: '1px' }}>{e.venue_name}</div>}
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        };

                                        cells_row.push(
                                            <td key={i} colSpan={colSpan} style={{ border: '1px solid #000000', padding: '2px', textAlign: 'center', verticalAlign: 'middle', backgroundColor: bgColor, height: '80px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                                                    {regularCodes.map((code, idx) => renderBlock(code, idx, false, regularEntries.filter(c => c.course_code === code)))}
                                                    {explicitOECodes.map((code, idx) => renderBlock(code, regularCodes.length + idx, true, explicitOEEntries.filter(c => c.course_code === code)))}
                                                    {shouldShowOEPlaceholder && <div style={{ fontSize: '9px', color: '#0f766e', background: '#ccfbf1', borderRadius: '4px', padding: '2px 6px', margin: '2px auto', fontWeight: 'bold', border: '1px solid #99f6e4' }}>OPEN ELECTIVE</div>}
                                                    {isMasterView && primaryCell && <div style={{ fontSize: '8px', background: '#e5e7eb', borderRadius: '3px', padding: '0 3px', marginTop: '2px', display: 'inline-block' }}>{primaryCell.department_code}</div>}
                                                </div>
                                            </td>
                                        );
                                    } else {
                                        cells_row.push(
                                            <td key={i} colSpan={colSpan} style={{ border: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', backgroundColor: bgColor, height: '80px', color: '#d1d5db' }}>-</td>
                                        );
                                    }
                                });

                                return (
                                    <tr key={day}>
                                        <td style={{ border: '1px solid #000000', fontWeight: 'bold', textAlign: 'center', fontSize: '14px', backgroundColor: '#f3f4f6', color: '#000000', letterSpacing: '0.1em' }}>{day}</td>
                                        {cells_row}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BITTimetable;