import { useState, useEffect } from 'react';
import { Trash2, Plus, Save, Download, RefreshCw, Layers, Monitor, Calendar, LayoutDashboard, BookOpen, Users, GraduationCap, GripVertical, Search, X, Menu, RotateCw, Pencil, Clock, Check } from 'lucide-react';
import TimetableEditor from './components/TimetableEditor';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as api from './utils/api';

function App() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');

    // Master Data
    const [departments, setDepartments] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [slots, setSlots] = useState([]);

    // Data pages
    const [allCourses, setAllCourses] = useState([]);
    const [allFaculty, setAllFaculty] = useState([]);
    const [courseFacultyMappings, setCourseFacultyMappings] = useState([]);

    // Filters for data pages
    const [filterDept, setFilterDept] = useState('');
    const [filterSem, setFilterSem] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Show/hide add forms
    const [showAddCourse, setShowAddCourse] = useState(false);
    const [showAddFaculty, setShowAddFaculty] = useState(false);
    const [showAddMapping, setShowAddMapping] = useState(false);
    const [editorDept, setEditorDept] = useState('');
    const [editorSem, setEditorSem] = useState('');
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [editingSlotId, setEditingSlotId] = useState(null);
    const [editingSlotData, setEditingSlotData] = useState({});
    const [showAddSlot, setShowAddSlot] = useState(false);

    // Lookups
    const [coursesMap, setCoursesMap] = useState({});
    const [facultyMap, setFacultyMap] = useState({});

    // Selection State (dashboard)
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedSem, setSelectedSem] = useState('');
    const [mentorDay, setMentorDay] = useState('Friday');
    const [mentorPeriod, setMentorPeriod] = useState(8);

    // Timetable Data
    const [timetableEntries, setTimetableEntries] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => { fetchMasterData(); }, []);

    useEffect(() => {
        if (activeTab === 'subjects') fetchCourses();
        if (activeTab === 'faculty') fetchFaculty();
        if (activeTab === 'mappings') fetchCourseFacultyMappings();
    }, [activeTab, filterDept, filterSem]);

    const fetchMasterData = async () => {
        try {
            const [d, s, sl] = await Promise.all([api.getDepartments(), api.getSemesters(), api.getSlots()]);
            setDepartments(d.data);
            setSemesters(s.data);
            setSlots(sl.data);
        } catch (err) { console.error("Failed to load master data", err); }
    };

    const fetchCourses = async () => {
        try { setAllCourses((await api.getCourses(filterDept || null, filterSem ? parseInt(filterSem) : null)).data); }
        catch (err) { console.error(err); }
    };
    const fetchFaculty = async () => {
        try { setAllFaculty((await api.getFaculty(filterDept || null)).data); }
        catch (err) { console.error(err); }
    };
    const fetchCourseFacultyMappings = async () => {
        try { setCourseFacultyMappings((await api.getCourseFaculty(filterDept || null)).data); }
        catch (err) { console.error(err); }
    };

    // --- CRUD Handlers ---
    const handleAddCourse = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = {
            course_code: fd.get('course_code'),
            course_name: fd.get('course_name'),
            department_code: fd.get('department_code'),
            semester: parseInt(fd.get('semester')),
            lecture_hours: parseInt(fd.get('lecture_hours') || '0'),
            tutorial_hours: parseInt(fd.get('tutorial_hours') || '0'),
            practical_hours: parseInt(fd.get('practical_hours') || '0'),
            credits: parseInt(fd.get('credits') || '0'),
            weekly_sessions: parseInt(fd.get('weekly_sessions') || '1'),
            is_lab: fd.get('is_lab') === 'on',
            is_honours: fd.get('is_honours') === 'on',
            is_minor: fd.get('is_minor') === 'on',
            is_elective: fd.get('is_elective') === 'on',
        };
        try {
            await api.createCourse(data);
            setShowAddCourse(false);
            fetchCourses();
            fetchMasterData();
            e.target.reset();
        } catch (err) { alert(err.response?.data?.detail || err.message); }
    };

    const handleDeleteCourse = async (code) => {
        if (!confirm(`Delete course ${code}? This also removes faculty mappings.`)) return;
        try { await api.deleteCourse(code); fetchCourses(); }
        catch (err) { alert(err.response?.data?.detail || err.message); }
    };

    const handleAddFaculty = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = {
            faculty_id: fd.get('faculty_id'),
            faculty_name: fd.get('faculty_name'),
            faculty_email: fd.get('faculty_email') || null,
            department_code: fd.get('department_code'),
            status: 'Active',
        };
        try {
            await api.createFaculty(data);
            setShowAddFaculty(false);
            fetchFaculty();
            e.target.reset();
        } catch (err) { alert(err.response?.data?.detail || err.message); }
    };

    const handleDeleteFaculty = async (fid) => {
        if (!confirm(`Delete faculty ${fid}? This also removes their course mappings.`)) return;
        try { await api.deleteFaculty(fid); fetchFaculty(); }
        catch (err) { alert(err.response?.data?.detail || err.message); }
    };

    const handleAddMapping = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = {
            course_code: fd.get('course_code'),
            faculty_id: fd.get('faculty_id'),
            department_code: fd.get('department_code'),
            delivery_type: fd.get('delivery_type') || 'Theory',
        };
        try {
            await api.createCourseFaculty(data);
            setShowAddMapping(false);
            fetchCourseFacultyMappings();
            e.target.reset();
        } catch (err) { alert(err.response?.data?.detail || err.message); }
    };

    const handleDeleteMapping = async (mid) => {
        if (!confirm('Remove this faculty-course mapping?')) return;
        try { await api.deleteCourseFaculty(mid); fetchCourseFacultyMappings(); }
        catch (err) { alert(err.response?.data?.detail || err.message); }
    };

    // --- Timetable Generation ---
    const fetchTimetable = async () => {
        if (!selectedDept || !selectedSem) return;
        try {
            const t_res = await api.getTimetable(selectedDept, parseInt(selectedSem));
            setTimetableEntries(t_res.data);
            const c_res = await api.getCourses(selectedDept, parseInt(selectedSem));
            const c_map = {}; c_res.data.forEach(c => c_map[c.course_code] = c.course_name); setCoursesMap(c_map);
            const f_res = await api.getFaculty(selectedDept);
            const f_map = {}; f_res.data.forEach(f => f_map[f.faculty_id] = f.faculty_name); setFacultyMap(f_map);
        } catch (err) {
            console.error("Failed to fetch timetable data:", err);
            setTimetableEntries([]);
            setCoursesMap({});
            setFacultyMap({});
        }
    };

    const handleGenerate = async () => {
        if (!selectedDept || !selectedSem) { alert("Please select Department and Semester!"); return; }
        setLoading(true);
        try {
            const res = await api.generateTimetable({
                department_code: selectedDept, semester: parseInt(selectedSem),
                mentor_day: mentorDay, mentor_period: parseInt(mentorPeriod)
            });
            if (res.data.status === 'success') {
                alert('Timetable Generated Successfully!');
                fetchTimetable();
                setRefreshTrigger(prev => prev + 1);
            }
        } catch (err) {
            alert('Failed to generate: ' + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = (dataToExport) => {
        try {
            const data = dataToExport && Array.isArray(dataToExport) ? dataToExport : timetableEntries;
            if (!data || data.length === 0) { alert("No timetable data to export!"); return; }

            const dept = data[0].department_code || selectedDept || 'Unknown';
            const sem = data[0].semester || selectedSem || 'Unknown';

            const doc = new jsPDF('l', 'mm', 'a4');
            doc.text(`Timetable - ${dept} - Sem ${sem}`, 14, 15);

            let uniquePeriods = [...new Set(slots.map(s => s.period_number))].sort((a, b) => a - b);
            if (uniquePeriods.length === 0) uniquePeriods = [1, 2, 3, 4, 5, 6, 7, 8];

            const periodsHeader = uniquePeriods.map(p => {
                const s = slots.find(sl => sl.period_number === p);
                return `P${p}\n${s ? s.start_time : ''}`;
            });
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
            if (slots.some(s => s.day_of_week === 'Saturday') || data.some(t => t.day_of_week === 'Saturday')) days.push('Saturday');

            const rows = days.map(day => {
                const rowData = [day];
                uniquePeriods.forEach(p => {
                    const entry = data.find(t => t.day_of_week === day && t.period_number === p);
                    if (entry) {
                        if (entry.session_type === 'MENTOR') rowData.push('MENTOR\nINTERACTION');
                        else if (entry.session_type === 'OPEN_ELECTIVE') rowData.push('OPEN\nELECTIVE');
                        else rowData.push(`${entry.course_code}\n${entry.course_name || ''}\n${entry.faculty_name || ''}`);
                    } else rowData.push('-');
                });
                return rowData;
            });

            autoTable(doc, {
                head: [['Day', ...periodsHeader]], body: rows, startY: 20,
                styles: { fontSize: 7, cellPadding: 2 }, theme: 'grid',
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index > 0) {
                        const t = data.cell.raw;
                        if (t && t.includes('MENTOR')) { data.cell.styles.fillColor = [173, 216, 230]; data.cell.styles.fontStyle = 'bold'; }
                        else if (t && t.includes('OPEN')) { data.cell.styles.fillColor = [220, 220, 220]; }
                    }
                }
            });
            doc.save(`timetable_${dept}_${sem}.pdf`);
        } catch (err) {
            console.error(err);
            alert("Failed to export PDF: " + err.message);
        }
    };

    // --- Timetable Render ---
    const renderTimetable = () => {
        if (!timetableEntries.length && !loading) return <div className="text-center p-10 text-gray-500">No timetable generated yet. Select criteria and click Generate.</div>;
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        if (slots.some(s => s.day_of_week === 'Saturday')) days.push('Saturday');
        const maxPeriod = Math.max(...slots.map(s => s.period_number), 0);
        const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);
        const isLabStart = (day, p) => {
            const e1 = timetableEntries.find(t => t.day_of_week === day && t.period_number === p && t.session_type === 'LAB');
            const e2 = timetableEntries.find(t => t.day_of_week === day && t.period_number === p + 1 && t.session_type === 'LAB');
            return e1 && e2 && e1.course_code === e2.course_code;
        };
        const isLabEnd = (day, p) => {
            const e1 = timetableEntries.find(t => t.day_of_week === day && t.period_number === p - 1 && t.session_type === 'LAB');
            const e2 = timetableEntries.find(t => t.day_of_week === day && t.period_number === p && t.session_type === 'LAB');
            return e1 && e2 && e1.course_code === e2.course_code;
        };
        return (
            <div>
                <div className="flex gap-4 mb-3 text-xs">
                    <span className="flex items-center gap-1"><span className="w-4 h-4 rounded" style={{ backgroundColor: '#FEF9C3' }}></span> Lab (2 periods)</span>
                    <span className="flex items-center gap-1"><span className="w-4 h-4 rounded" style={{ backgroundColor: '#BFDBFE' }}></span> Mentor Hour</span>
                    <span className="flex items-center gap-1"><span className="w-4 h-4 rounded" style={{ backgroundColor: '#F3F4F6' }}></span> Open Elective</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border-collapse border border-gray-300 text-xs">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="p-2 border border-gray-300 text-left font-bold w-24 sticky left-0 bg-gray-100 z-10">Day</th>
                                {periods.map(p => {
                                    const slot = slots.find(s => s.period_number === p && s.day_of_week === 'Monday');
                                    return (<th key={p} className="p-2 border border-gray-300 text-center font-bold min-w-[110px]"><div>Period {p}</div><div className="text-[10px] text-gray-500 font-normal">{slot ? `${slot.start_time} - ${slot.end_time}` : ''}</div></th>);
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {days.map(day => {
                                const cells = []; let skipNext = false;
                                periods.forEach(p => {
                                    if (skipNext) { skipNext = false; return; }
                                    const isValidSlot = slots.some(s => s.day_of_week === day && s.period_number === p);
                                    if (!isValidSlot) { cells.push(<td key={p} className="p-2 border border-gray-300 bg-gray-200"></td>); return; }
                                    const entry = timetableEntries.find(t => t.day_of_week === day && t.period_number === p);
                                    if (isLabStart(day, p)) {
                                        skipNext = true;
                                        cells.push(<td key={p} colSpan={2} className="p-2 border border-gray-300 text-center align-middle h-20" style={{ backgroundColor: '#FEF9C3' }}><div className="flex flex-col justify-center h-full"><div className="font-bold text-amber-900 text-xs">{entry.course_code}</div><div className="text-[10px] text-amber-800 mt-0.5 font-medium">{entry.course_name || ''}</div><div className="text-[10px] text-amber-700 mt-0.5 italic">{entry.faculty_name || ''}</div><div className="text-[9px] text-amber-600 mt-0.5 font-medium">LAB</div></div></td>);
                                        return;
                                    }
                                    if (isLabEnd(day, p)) return;
                                    if (!entry) { cells.push(<td key={p} className="p-2 border border-gray-300 text-center text-gray-300">-</td>); return; }
                                    if (entry.session_type === 'MENTOR') {
                                        cells.push(<td key={p} className="p-2 border border-gray-300 text-center align-middle h-20" style={{ backgroundColor: '#BFDBFE' }}><div className="flex flex-col justify-center h-full"><div className="font-bold text-blue-900 text-sm">MENTOR</div><div className="text-xs text-blue-700 mt-1">INTERACTION</div></div></td>);
                                        return;
                                    }
                                    if (entry.session_type === 'OPEN_ELECTIVE') {
                                        cells.push(<td key={p} className="p-2 border border-gray-300 text-center align-middle h-20 bg-gray-100"><div className="flex flex-col justify-center h-full"><div className="font-bold text-gray-600 text-xs">OPEN</div><div className="text-xs text-gray-500">ELECTIVE</div></div></td>);
                                        return;
                                    }
                                    cells.push(<td key={p} className="p-2 border border-gray-300 text-center align-middle h-20 hover:bg-blue-50 transition-colors"><div className="flex flex-col justify-center h-full"><div className="font-bold text-blue-800 text-xs">{entry.course_code}</div><div className="text-[10px] text-blue-600 mt-0.5 line-clamp-2">{entry.course_name || ''}</div><div className="text-[10px] text-gray-500 mt-0.5 italic">{entry.faculty_name || ''}</div></div></td>);
                                });
                                return (<tr key={day}><td className="p-2 border border-gray-300 font-bold text-gray-700 bg-gray-50 sticky left-0 z-10 text-xs">{day.substring(0, 3).toUpperCase()}</td>{cells}</tr>);
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // ============================================
    // FILTER BAR (render function, NOT component)
    // ============================================
    const renderFilterBar = (showSem, filteredCount, totalCount) => (
        <div className="flex flex-wrap gap-3 items-center mb-4 bg-gray-50 p-3 rounded-lg border">
            <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-600">Filter:</span>
            </div>
            <select className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                <option value="">All Departments</option>
                {departments.map(d => <option key={d.department_code} value={d.department_code}>{d.department_code}</option>)}
            </select>
            {showSem && (
                <select className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500" value={filterSem} onChange={e => setFilterSem(e.target.value)}>
                    <option value="">All Semesters</option>
                    {semesters.map(s => <option key={s.semester_number} value={s.semester_number}>Semester {s.semester_number}</option>)}
                </select>
            )}
            <div className="flex-1 min-w-[200px]">
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search by name, code..." className="w-full pl-9 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500"
                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
            </div>
            <div className="text-xs text-gray-500 bg-white px-3 py-2 rounded border">
                Showing {filteredCount} of {totalCount}
            </div>
        </div>
    );

    // ============================================
    // SUBJECTS PAGE
    // ============================================
    const renderSubjectsPage = () => {
        const q = searchQuery.toLowerCase().trim();
        const filtered = allCourses.filter(c => {
            if (!q) return true;
            return (c.course_code || '').toLowerCase().includes(q) || (c.course_name || '').toLowerCase().includes(q) || (c.department_code || '').toLowerCase().includes(q);
        });

        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div className="flex-1">{renderFilterBar(true, filtered.length, allCourses.length)}</div>
                    <button onClick={() => setShowAddCourse(!showAddCourse)} className="ml-3 flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow transition-all whitespace-nowrap">
                        <Plus className="w-4 h-4" /> Add Course
                    </button>
                </div>

                {showAddCourse && (
                    <div className="bg-white rounded-xl border-2 border-yellow-300 shadow-lg p-5">
                        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Plus className="w-4 h-4 text-yellow-600" /> Add New Course</h4>
                        <form onSubmit={handleAddCourse} className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <input name="course_code" placeholder="Course Code *" required className="p-2 border rounded-lg text-sm" />
                            <input name="course_name" placeholder="Course Name *" required className="p-2 border rounded-lg text-sm col-span-2" />
                            <select name="department_code" required className="p-2 border rounded-lg text-sm">
                                <option value="">Department *</option>
                                {departments.map(d => <option key={d.department_code} value={d.department_code}>{d.department_code}</option>)}
                            </select>
                            <select name="semester" required className="p-2 border rounded-lg text-sm">
                                <option value="">Semester *</option>
                                {semesters.map(s => <option key={s.semester_number} value={s.semester_number}>Sem {s.semester_number}</option>)}
                            </select>
                            <input name="lecture_hours" type="number" placeholder="L hours" defaultValue="0" min="0" className="p-2 border rounded-lg text-sm" />
                            <input name="tutorial_hours" type="number" placeholder="T hours" defaultValue="0" min="0" className="p-2 border rounded-lg text-sm" />
                            <input name="practical_hours" type="number" placeholder="P hours" defaultValue="0" min="0" className="p-2 border rounded-lg text-sm" />
                            <input name="credits" type="number" placeholder="Credits" defaultValue="0" min="0" className="p-2 border rounded-lg text-sm" />
                            <input name="weekly_sessions" type="number" placeholder="Weekly Sessions *" defaultValue="1" min="1" required className="p-2 border rounded-lg text-sm" />
                            <div className="flex flex-wrap gap-3 items-center col-span-2">
                                <label className="flex items-center gap-1 text-xs"><input name="is_lab" type="checkbox" /> Lab</label>
                                <label className="flex items-center gap-1 text-xs"><input name="is_honours" type="checkbox" /> Honours</label>
                                <label className="flex items-center gap-1 text-xs"><input name="is_minor" type="checkbox" /> Minor</label>
                                <label className="flex items-center gap-1 text-xs"><input name="is_elective" type="checkbox" /> Elective</label>
                            </div>
                            <div className="flex gap-2">
                                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">Save</button>
                                <button type="button" onClick={() => setShowAddCourse(false)} className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm">Cancel</button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="overflow-x-auto bg-white rounded-lg border shadow-sm">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
                                <th className="p-3 text-left font-semibold">Code</th>
                                <th className="p-3 text-left font-semibold">Course Name</th>
                                <th className="p-3 text-center font-semibold">Dept</th>
                                <th className="p-3 text-center font-semibold">Sem</th>
                                <th className="p-3 text-center font-semibold">L</th>
                                <th className="p-3 text-center font-semibold">T</th>
                                <th className="p-3 text-center font-semibold">P</th>
                                <th className="p-3 text-center font-semibold">Cr</th>
                                <th className="p-3 text-center font-semibold">Weekly</th>
                                <th className="p-3 text-center font-semibold">Type</th>
                                <th className="p-3 text-center font-semibold w-16">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((c, i) => (
                                <tr key={c.course_code} className={`border-b hover:bg-yellow-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                    <td className="p-3 font-mono font-bold text-blue-800">{c.course_code}</td>
                                    <td className="p-3 text-gray-800 font-medium">{c.course_name}</td>
                                    <td className="p-3 text-center"><span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-medium">{c.department_code}</span></td>
                                    <td className="p-3 text-center font-medium">{c.semester}</td>
                                    <td className="p-3 text-center">{c.lecture_hours || 0}</td>
                                    <td className="p-3 text-center">{c.tutorial_hours || 0}</td>
                                    <td className="p-3 text-center">{c.practical_hours || 0}</td>
                                    <td className="p-3 text-center font-medium">{c.credits || '-'}</td>
                                    <td className="p-3 text-center"><span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-bold">{c.weekly_sessions}</span></td>
                                    <td className="p-3 text-center">
                                        <div className="flex flex-wrap gap-1 justify-center">
                                            {c.is_honours && <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[10px] font-medium">Honours</span>}
                                            {c.is_minor && <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-medium">Minor</span>}
                                            {c.is_lab && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-medium">Lab</span>}
                                            {c.is_elective && <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-medium">Elective</span>}
                                            {c.is_open_elective && <span className="bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded text-[10px] font-medium">Open Elec</span>}
                                            {!c.is_honours && !c.is_minor && !c.is_lab && !c.is_elective && !c.is_open_elective && <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px]">Regular</span>}
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <button onClick={() => handleDeleteCourse(c.course_code)} className="text-red-400 hover:text-red-600 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filtered.length === 0 && <div className="p-8 text-center text-gray-400">No courses found.</div>}
                </div>
            </div>
        );
    };

    // ============================================
    // FACULTY PAGE
    // ============================================
    const renderFacultyPage = () => {
        const q = searchQuery.toLowerCase().trim();
        const filtered = allFaculty.filter(f => {
            if (!q) return true;
            return (f.faculty_id || '').toLowerCase().includes(q) || (f.faculty_name || '').toLowerCase().includes(q) || (f.faculty_email || '').toLowerCase().includes(q) || (f.department_code || '').toLowerCase().includes(q);
        });

        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div className="flex-1">{renderFilterBar(false, filtered.length, allFaculty.length)}</div>
                    <button onClick={() => setShowAddFaculty(!showAddFaculty)} className="ml-3 flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow transition-all whitespace-nowrap">
                        <Plus className="w-4 h-4" /> Add Faculty
                    </button>
                </div>

                {showAddFaculty && (
                    <div className="bg-white rounded-xl border-2 border-yellow-300 shadow-lg p-5">
                        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Plus className="w-4 h-4 text-yellow-600" /> Add New Faculty</h4>
                        <form onSubmit={handleAddFaculty} className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <input name="faculty_id" placeholder="Faculty ID *" required className="p-2 border rounded-lg text-sm" />
                            <input name="faculty_name" placeholder="Faculty Name *" required className="p-2 border rounded-lg text-sm" />
                            <input name="faculty_email" placeholder="Email (optional)" type="email" className="p-2 border rounded-lg text-sm" />
                            <select name="department_code" required className="p-2 border rounded-lg text-sm">
                                <option value="">Department *</option>
                                {departments.map(d => <option key={d.department_code} value={d.department_code}>{d.department_code}</option>)}
                            </select>
                            <div className="flex gap-2">
                                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">Save</button>
                                <button type="button" onClick={() => setShowAddFaculty(false)} className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm">Cancel</button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(f => (
                        <div key={f.faculty_id} className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow p-4 group">
                            <div className="flex items-start gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-lg shadow flex-shrink-0">
                                    {(f.faculty_name || '?').charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold text-gray-900 text-sm truncate">{f.faculty_name || 'Unknown'}</h4>
                                        <button onClick={() => handleDeleteFaculty(f.faculty_id)} className="text-red-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all" title="Delete">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 font-mono mt-0.5">{f.faculty_id}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-medium">{f.department_code}</span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${(f.status || '') === 'Active' || (f.status || '') === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {f.status || 'Active'}
                                        </span>
                                    </div>
                                    {f.faculty_email && <p className="text-xs text-blue-600 mt-1.5 truncate">{f.faculty_email}</p>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {filtered.length === 0 && <div className="p-8 text-center text-gray-400 bg-white rounded-xl border">No faculty found.</div>}
            </div>
        );
    };

    // ============================================
    // COURSE-FACULTY MAPPINGS PAGE
    // ============================================
    // ============================================
    // COURSE-FACULTY MAPPINGS PAGE
    // ============================================
    const renderMappingsPage = () => {
        const q = searchQuery.toLowerCase().trim();
        const filtered = courseFacultyMappings.filter(m => {
            if (!q) return true;
            return (m.course_code || '').toLowerCase().includes(q) ||
                (m.course_name || '').toLowerCase().includes(q) ||
                (m.faculty_name || '').toLowerCase().includes(q) ||
                (m.course_dept || '').toLowerCase().includes(q) ||     // NEW
                (m.for_department || '').toLowerCase().includes(q) ||  // NEW
                (m.faculty_dept || '').toLowerCase().includes(q);      // NEW
        });

        const grouped = {};
        filtered.forEach(m => {
            if (!grouped[m.course_code]) {
                grouped[m.course_code] = {
                    course_name: m.course_name,
                    course_dept: m.course_dept,
                    target_depts: new Set(), // Track all target departments
                    faculty: []
                };
            }
            grouped[m.course_code].faculty.push(m);
            if (m.for_department) grouped[m.course_code].target_depts.add(m.for_department);
        });

        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div className="flex-1">{renderFilterBar(false, Object.keys(grouped).length, [...new Set(courseFacultyMappings.map(m => m.course_code))].length)}</div>
                    <button onClick={() => setShowAddMapping(!showAddMapping)} className="ml-3 flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow transition-all whitespace-nowrap">
                        <Plus className="w-4 h-4" /> Add Mapping
                    </button>
                </div>

                {showAddMapping && (
                    <div className="bg-white rounded-xl border-2 border-yellow-300 shadow-lg p-5">
                        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Plus className="w-4 h-4 text-yellow-600" /> Add Course-Faculty Mapping</h4>
                        <form onSubmit={handleAddMapping} className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <input name="course_code" placeholder="Course Code *" required className="p-2 border rounded-lg text-sm" />
                            <input name="faculty_id" placeholder="Faculty ID *" required className="p-2 border rounded-lg text-sm" />
                            <select name="department_code" required className="p-2 border rounded-lg text-sm">
                                <option value="">Taught To (Dept) *</option>
                                {departments.map(d => <option key={d.department_code} value={d.department_code}>{d.department_code}</option>)}
                            </select>
                            <select name="delivery_type" className="p-2 border rounded-lg text-sm">
                                <option value="Theory">Theory</option>
                                <option value="Lab">Lab</option>
                                <option value="Both">Both</option>
                            </select>
                            <div className="flex gap-2">
                                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">Save</button>
                                <button type="button" onClick={() => setShowAddMapping(false)} className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm">Cancel</button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="space-y-3">
                    {Object.entries(grouped).map(([code, data]) => (
                        <div key={code} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                            <div className="bg-gradient-to-r from-slate-50 to-white p-4 border-b flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-blue-800 text-sm">{code}</span>
                                        {/* Logic to determine offering department from faculty */}
                                        {(() => {
                                            const facDepts = new Set(data.faculty.map(f => f.faculty_dept).filter(d => d && d !== '?'));
                                            const offeringDept = facDepts.size === 1 ? Array.from(facDepts)[0] : (facDepts.size > 1 ? 'Mixed' : data.course_dept);
                                            return (
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${offeringDept === '?' ? 'bg-gray-100 text-gray-500' : 'bg-slate-100 text-slate-700'}`}>
                                                    {offeringDept}
                                                </span>
                                            );
                                        })()}
                                        {/* Show Target Depts */}
                                        {data.target_depts.size > 0 && (
                                            <span className="flex items-center gap-1 text-[10px] text-gray-500 font-medium ml-2 bg-yellow-50 px-2 py-0.5 rounded border border-yellow-100">
                                                For {Array.from(data.target_depts).join(', ')}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-700 mt-0.5 font-medium">{data.course_name}</p>
                                </div>
                                <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                                    {data.faculty.length} faculty
                                </div>
                            </div>
                            <div className="p-3">
                                <div className="flex flex-wrap gap-2">
                                    {data.faculty.map((f, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border group hover:border-blue-300 transition-colors">
                                            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                                {(f.faculty_name || '?').charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-gray-800">{f.faculty_name || 'Unknown'}</p>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] text-gray-500">{f.delivery_type || 'Theory'}</span>
                                                    {f.faculty_dept && f.faculty_dept !== '?' && f.faculty_dept !== data.course_dept && (
                                                        <span className="text-[9px] px-1 rounded bg-gray-200 text-gray-600">{f.faculty_dept}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <button onClick={() => handleDeleteMapping(f.id)} className="text-red-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all ml-1" title="Remove Mapping">
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                    {Object.keys(grouped).length === 0 && <div className="p-8 text-center text-gray-400 bg-white rounded-xl border">No mappings found.</div>}
                </div>
            </div>
        );
    };

    // ============================================
    // EDITOR PAGE
    // ============================================
    const renderEditorPage = () => (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Pencil className="w-5 h-5 text-yellow-600" />
                    <span>Edit Saved Timetable</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <select className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500" value={editorDept} onChange={e => setEditorDept(e.target.value)}>
                            <option value="">Select Dept</option>
                            {departments.map(d => <option key={d.department_code} value={d.department_code}>{d.department_code}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                        <select className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500" value={editorSem} onChange={e => setEditorSem(e.target.value)}>
                            <option value="">Select Sem</option>
                            {semesters.map(s => <option key={s.semester_number} value={s.semester_number}>Semester {s.semester_number}</option>)}
                        </select>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden min-h-[600px] flex flex-col">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-700">{editorDept && editorSem ? `${editorDept} - Semester ${editorSem}` : 'Timetable Editor'}</h3>
                </div>
                <div className="flex-1 relative">
                    {editorDept && editorSem ? (
                        <TimetableEditor
                            key={`${editorDept}-${editorSem}`}
                            department={editorDept}
                            semester={editorSem}
                            onSave={() => { }}
                            onExportPDF={handleDownloadPDF}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <Pencil className="w-16 h-16 mb-4 opacity-20" />
                            <p>Select Department and Semester to edit saved timetable</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    // ============================================
    // TIME SLOTS PAGE
    // ============================================
    const handleDeleteSlot = async (slotId) => {
        if (!confirm('Delete this time slot?')) return;
        try {
            await api.deleteSlot(slotId);
            const res = await api.getSlots();
            setSlots(res.data);
        } catch (err) {
            alert('Failed to delete slot: ' + (err.response?.data?.detail || err.message));
        }
    };

    const handleUpdateSlot = async (slotId) => {
        try {
            await api.updateSlot(slotId, editingSlotData);
            setEditingSlotId(null);
            setEditingSlotData({});
            const res = await api.getSlots();
            setSlots(res.data);
        } catch (err) {
            alert('Failed to update slot: ' + (err.response?.data?.detail || err.message));
        }
    };

    const handleAddSlot = async (e) => {
        e.preventDefault();
        const form = e.target;
        try {
            await api.createSlot({
                day_of_week: form.day_of_week.value,
                period_number: parseInt(form.period_number.value),
                start_time: form.start_time.value,
                end_time: form.end_time.value,
                slot_type: form.slot_type.value,
                is_active: true
            });
            form.reset();
            setShowAddSlot(false);
            const res = await api.getSlots();
            setSlots(res.data);
        } catch (err) {
            alert('Failed to add slot: ' + (err.response?.data?.detail || err.message));
        }
    };

    const startEditSlot = (slot) => {
        setEditingSlotId(slot.slot_id);
        setEditingSlotData({
            start_time: slot.start_time,
            end_time: slot.end_time,
            slot_type: slot.slot_type,
            is_active: slot.is_active
        });
    };

    const renderSlotsPage = () => {
        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const grouped = {};
        slots.forEach(s => {
            if (!grouped[s.day_of_week]) grouped[s.day_of_week] = [];
            grouped[s.day_of_week].push(s);
        });
        Object.values(grouped).forEach(arr => arr.sort((a, b) => a.period_number - b.period_number));
        const sortedDays = dayOrder.filter(d => grouped[d]);

        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-sm text-gray-500 mt-1">Manage period timings, types, and active status for each day of the week.</p>
                    </div>
                    <button onClick={() => setShowAddSlot(!showAddSlot)} className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold shadow-md transition-all">
                        <Plus className="w-4 h-4" /> Add Slot
                    </button>
                </div>

                {showAddSlot && (
                    <div className="bg-white rounded-xl border-2 border-yellow-300 shadow-lg p-5">
                        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Plus className="w-4 h-4 text-yellow-600" /> Add New Time Slot</h4>
                        <form onSubmit={handleAddSlot} className="grid grid-cols-2 md:grid-cols-6 gap-3">
                            <select name="day_of_week" required className="p-2 border rounded-lg text-sm">
                                <option value="">Day *</option>
                                {dayOrder.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <input name="period_number" type="number" placeholder="Period # *" required min="1" max="10" className="p-2 border rounded-lg text-sm" />
                            <input name="start_time" type="time" required className="p-2 border rounded-lg text-sm" />
                            <input name="end_time" type="time" required className="p-2 border rounded-lg text-sm" />
                            <select name="slot_type" className="p-2 border rounded-lg text-sm">
                                <option value="REGULAR">Regular</option>
                                <option value="BREAK">Break</option>
                                <option value="LUNCH">Lunch</option>
                                <option value="SPECIAL">Special</option>
                            </select>
                            <div className="flex gap-2">
                                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">Save</button>
                                <button type="button" onClick={() => setShowAddSlot(false)} className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm">Cancel</button>
                            </div>
                        </form>
                    </div>
                )}

                {sortedDays.map(day => (
                    <div key={day} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        <div className="bg-gradient-to-r from-slate-50 to-white p-4 border-b">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-yellow-600" />
                                {day}
                                <span className="ml-2 text-xs font-normal bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{grouped[day].length} periods</span>
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-600 text-xs uppercase">
                                        <th className="px-4 py-3 text-left">Period</th>
                                        <th className="px-4 py-3 text-left">Start Time</th>
                                        <th className="px-4 py-3 text-left">End Time</th>
                                        <th className="px-4 py-3 text-left">Type</th>
                                        <th className="px-4 py-3 text-left">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {grouped[day].map(slot => (
                                        <tr key={slot.slot_id} className="border-t hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center justify-center w-8 h-8 bg-yellow-100 text-yellow-800 rounded-full font-bold text-sm">
                                                    P{slot.period_number}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {editingSlotId === slot.slot_id ? (
                                                    <input type="time" value={editingSlotData.start_time || ''} onChange={e => setEditingSlotData(prev => ({ ...prev, start_time: e.target.value }))} className="p-1 border rounded text-sm w-28" />
                                                ) : (
                                                    <span className="font-mono text-gray-800">{slot.start_time}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {editingSlotId === slot.slot_id ? (
                                                    <input type="time" value={editingSlotData.end_time || ''} onChange={e => setEditingSlotData(prev => ({ ...prev, end_time: e.target.value }))} className="p-1 border rounded text-sm w-28" />
                                                ) : (
                                                    <span className="font-mono text-gray-800">{slot.end_time}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {editingSlotId === slot.slot_id ? (
                                                    <select value={editingSlotData.slot_type || 'REGULAR'} onChange={e => setEditingSlotData(prev => ({ ...prev, slot_type: e.target.value }))} className="p-1 border rounded text-sm">
                                                        <option value="REGULAR">Regular</option>
                                                        <option value="BREAK">Break</option>
                                                        <option value="LUNCH">Lunch</option>
                                                        <option value="SPECIAL">Special</option>
                                                    </select>
                                                ) : (
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${slot.slot_type === 'REGULAR' ? 'bg-green-100 text-green-700' : slot.slot_type === 'BREAK' ? 'bg-orange-100 text-orange-700' : slot.slot_type === 'LUNCH' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                        {slot.slot_type}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {editingSlotId === slot.slot_id ? (
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" checked={editingSlotData.is_active ?? true} onChange={e => setEditingSlotData(prev => ({ ...prev, is_active: e.target.checked }))} className="w-4 h-4 rounded" />
                                                        <span className="text-xs">{editingSlotData.is_active ? 'Active' : 'Inactive'}</span>
                                                    </label>
                                                ) : (
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${slot.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${slot.is_active ? 'bg-emerald-500' : 'bg-red-400'}`}></span>
                                                        {slot.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {editingSlotId === slot.slot_id ? (
                                                    <div className="flex gap-2 justify-end">
                                                        <button onClick={() => handleUpdateSlot(slot.slot_id)} className="text-green-600 hover:text-green-800 p-1" title="Save"><Check className="w-4 h-4" /></button>
                                                        <button onClick={() => { setEditingSlotId(null); setEditingSlotData({}); }} className="text-gray-400 hover:text-gray-600 p-1" title="Cancel"><X className="w-4 h-4" /></button>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2 justify-end">
                                                        <button onClick={() => startEditSlot(slot)} className="text-blue-500 hover:text-blue-700 p-1" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => handleDeleteSlot(slot.slot_id)} className="text-red-400 hover:text-red-600 p-1" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
                {sortedDays.length === 0 && <div className="p-8 text-center text-gray-400 bg-white rounded-xl border">No time slots configured. Click "Add Slot" to create one.</div>}
            </div>
        );
    };

    // ============================================
    // DASHBOARD
    // ============================================
    const renderDashboard = () => (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-yellow-600" />
                    <span>Generate Timetable</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <select className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500" value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
                            <option value="">Select Dept</option>
                            {departments.map(d => <option key={d.department_code} value={d.department_code}>{d.department_code}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                        <select className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500" value={selectedSem} onChange={e => setSelectedSem(e.target.value)}>
                            <option value="">Select Sem</option>
                            {semesters.map(s => <option key={s.semester_number} value={s.semester_number}>Semester {s.semester_number}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mentor Day</label>
                        <select className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500" value={mentorDay} onChange={e => setMentorDay(e.target.value)}>
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mentor Period</label>
                        <input type="number" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500" value={mentorPeriod} onChange={e => setMentorPeriod(e.target.value)} min="1" max="8" />
                    </div>
                    <button onClick={handleGenerate} disabled={loading} className={`w-full py-2 px-4 rounded-lg text-white font-semibold flex items-center justify-center space-x-2 transition-all ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-700 shadow-md'}`}>
                        {loading ? <RotateCw className="w-5 h-5 animate-spin" /> : <Monitor className="w-5 h-5" />}
                        <span>{loading ? 'Processing...' : 'Generate'}</span>
                    </button>
                </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-700">{selectedDept && selectedSem ? `${selectedDept} - Semester ${selectedSem}` : 'Timetable Preview'}</h3>
                    <button onClick={handleDownloadPDF} className="flex items-center space-x-2 text-sm text-gray-600 hover:text-blue-600 border px-3 py-1 rounded bg-white shadow-sm">
                        <Download className="w-4 h-4" /><span>Export PDF</span>
                    </button>
                </div>
                <div className="p-4">{renderTimetable()}</div>
            </div>
        </div>
    );

    const pageTitle = { dashboard: 'Timetable Generator', editor: 'Timetable Editor', timeslots: 'Time Slots', subjects: 'Course / Subject Details', faculty: 'Faculty Details', mappings: 'Course-Faculty Mappings' };

    const switchTab = (tab) => {
        setActiveTab(tab);
        setSearchQuery('');
        setFilterDept(''); // Clear filter to avoid confusion
        setFilterSem('');
        setShowAddCourse(false);
        setShowAddFaculty(false);
        setShowAddMapping(false);
    };

    return (
        <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 shadow-xl flex flex-col`}>
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center shadow-lg">
                            <Calendar className="w-6 h-6 text-slate-900" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-yellow-500">BIT Scheduler</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1 hover:bg-slate-800 rounded"><X className="w-5 h-5" /></button>
                </div>
                <nav className="mt-6 px-4 space-y-2 flex-grow">
                    <button onClick={() => switchTab('dashboard')} className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-yellow-500 text-slate-900 font-semibold shadow-md' : 'hover:bg-slate-800 text-slate-300'}`}>
                        <LayoutDashboard className="w-5 h-5" /><span>Dashboard</span>
                    </button>
                    <button onClick={() => switchTab('editor')} className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-all duration-200 ${activeTab === 'editor' ? 'bg-yellow-500 text-slate-900 font-semibold shadow-md' : 'hover:bg-slate-800 text-slate-300'}`}>
                        <Pencil className="w-5 h-5" /><span>Editor</span>
                    </button>
                    <div className="pt-4 pb-2"><p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data Explorer</p></div>
                    <button onClick={() => switchTab('subjects')} className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-all duration-200 ${activeTab === 'subjects' ? 'bg-yellow-500 text-slate-900 font-semibold shadow-md' : 'hover:bg-slate-800 text-slate-300'}`}>
                        <BookOpen className="w-5 h-5" /><span>Subjects</span>
                    </button>
                    <button onClick={() => switchTab('faculty')} className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-all duration-200 ${activeTab === 'faculty' ? 'bg-yellow-500 text-slate-900 font-semibold shadow-md' : 'hover:bg-slate-800 text-slate-300'}`}>
                        <Users className="w-5 h-5" /><span>Faculty</span>
                    </button>
                    <button onClick={() => switchTab('mappings')} className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-all duration-200 ${activeTab === 'mappings' ? 'bg-yellow-500 text-slate-900 font-semibold shadow-md' : 'hover:bg-slate-800 text-slate-300'}`}>
                        <GraduationCap className="w-5 h-5" /><span>Course-Faculty</span>
                    </button>
                    <button onClick={() => switchTab('timeslots')} className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-all duration-200 ${activeTab === 'timeslots' ? 'bg-yellow-500 text-slate-900 font-semibold shadow-md' : 'hover:bg-slate-800 text-slate-300'}`}>
                        <Clock className="w-5 h-5" /><span>Time Slots</span>
                    </button>
                </nav>
                <div className="p-4 border-t border-slate-800 bg-slate-900">
                    <div className="bg-slate-800 rounded-lg p-3">
                        <p className="text-xs text-slate-400 mb-1">System Status</p>
                        <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            <span className="text-sm font-medium text-emerald-400">Operational</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2">V2.2 - Full CRUD</p>
                    </div>
                </div>
            </aside>

            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <header className="bg-white border-b shadow-sm z-10 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-gray-100 lg:hidden text-gray-600"><Menu className="w-6 h-6" /></button>
                        <h2 className="text-2xl font-bold text-gray-800">{pageTitle[activeTab] || 'Dashboard'}</h2>
                    </div>
                    <div className="flex items-center space-x-6">
                        <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-700 font-bold border-2 border-yellow-200">AD</div>
                    </div>
                </header>

                <div className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
                    <div className="max-w-7xl mx-auto">
                        {activeTab === 'dashboard' && renderDashboard()}
                        {activeTab === 'editor' && renderEditorPage()}
                        {activeTab === 'subjects' && renderSubjectsPage()}
                        {activeTab === 'faculty' && renderFacultyPage()}
                        {activeTab === 'mappings' && renderMappingsPage()}
                        {activeTab === 'timeslots' && renderSlotsPage()}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;
