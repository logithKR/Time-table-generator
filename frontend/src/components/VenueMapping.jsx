import React, { useState, useEffect, useRef } from 'react';
import { getDepartments, getVenues, getDepartmentVenues, mapVenueToDepartment, removeVenueMapping, getCourses, getCourseVenues, mapVenueToCourse, removeCourseVenueMapping, getCommonCourses, setCommonCourseVenue, clearCommonCourseVenue } from '../utils/api';
import { MapPin, Plus, Trash2, Building2, BookOpen, Search, ChevronDown, Lock, Users, Globe } from 'lucide-react';

const SearchableSelect = ({ options, value, onChange, placeholder, icon: Icon, required, accentColor = "purple" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const wrapperRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const filteredOptions = options.filter(opt => 
        (opt.label || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
        (opt.value?.toString() || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div 
                className={`w-full p-2.5 border rounded-xl flex items-center justify-between cursor-pointer bg-slate-50 transition-all ${isOpen ? `ring-2 ring-purple-500 border-purple-500` : 'border-slate-200 hover:border-purple-300'}`}
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) setSearchQuery('');
                }}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {Icon && <Icon size={16} className="text-purple-400 flex-shrink-0" />}
                    <span className={`truncate ${!selectedOption ? 'text-slate-400' : 'text-slate-800 font-medium'}`}>
                        {selectedOption ? selectedOption.label : placeholder} 
                        {required && !selectedOption && <span className="text-purple-500 ml-1">*</span>}
                    </span>
                </div>
                <ChevronDown size={16} className={`text-purple-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-[60] min-w-full w-[max-content] max-w-[90vw] mt-2 bg-white border border-purple-100 rounded-xl shadow-xl shadow-purple-200/50 max-h-64 overflow-hidden flex flex-col transform opacity-100 scale-100 transition-all origin-top">
                    <div className="p-2 border-b border-purple-100 flex-shrink-0 bg-purple-50/50">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                            <input 
                                type="text"
                                className="w-full pl-8 pr-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                placeholder="Search by name, code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto p-1.5 flex-1 select-none">
                        {filteredOptions.length === 0 ? (
                            <div className="p-3 text-sm text-slate-500 text-center font-medium">No results found</div>
                        ) : (
                            filteredOptions.map(opt => (
                                <div 
                                    key={opt.value}
                                    className={`p-2.5 text-sm rounded-lg cursor-pointer transition-colors break-words whitespace-normal ${value === opt.value ? `bg-purple-50 text-purple-700 font-semibold` : `text-slate-700 hover:bg-purple-50`}`}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                    }}
                                >
                                    {opt.label}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const VenueMapping = () => {
    const [departments, setDepartments] = useState([]);
    const [venues, setVenues] = useState([]);
    const [courses, setCourses] = useState([]);
    const [departmentVenues, setDepartmentVenues] = useState([]);
    const [courseVenues, setCourseVenues] = useState([]);

    const [selectedDept, setSelectedDept] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('6');
    const [selectedVenue, setSelectedVenue] = useState('');
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedCourseVenue, setSelectedCourseVenue] = useState('');
    const [selectedVenueType, setSelectedVenueType] = useState('BOTH');

    // Common course venue state
    const [commonCourses, setCommonCourses] = useState([]);
    const [commonVenueAssigning, setCommonVenueAssigning] = useState(null);
    const [commonVenueSelected, setCommonVenueSelected] = useState('');
    const [commonVenueType, setCommonVenueType] = useState('BOTH');
    const [showCommonSection, setShowCommonSection] = useState(true);

    const [isMapping, setIsMapping] = useState(false);
    const [isMappingCourse, setIsMappingCourse] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedDept) {
            fetchDepartmentData(selectedDept, selectedSemester);
        } else {
            setDepartmentVenues([]);
            setCourses([]);
            setCourseVenues([]);
        }
    }, [selectedDept, selectedSemester]);

    const fetchInitialData = async () => {
        try {
            const [deptRes, venueRes, ccRes] = await Promise.all([
                getDepartments(),
                getVenues(),
                getCommonCourses()
            ]);
            setDepartments(deptRes.data);
            setVenues(venueRes.data);
            setCommonCourses(ccRes.data);
            if (deptRes.data.length > 0 && !selectedDept) {
                setSelectedDept(deptRes.data[0].department_code);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchDepartmentData = async (deptCode, semester) => {
        try {
            const [dvRes, cRes, cvRes] = await Promise.all([
                getDepartmentVenues(deptCode, semester),
                getCourses(deptCode),
                getCourseVenues(deptCode)
            ]);
            setDepartmentVenues(dvRes.data);
            setCourses(cRes.data);
            setCourseVenues(cvRes.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleMapVenue = async (e) => {
        e.preventDefault();
        if (!selectedDept || !selectedVenue) return;

        try {
            setIsMapping(true);
            await mapVenueToDepartment({
                department_code: selectedDept,
                venue_id: parseInt(selectedVenue),
                semester: parseInt(selectedSemester)
            });
            await fetchDepartmentData(selectedDept, selectedSemester);
            setSelectedVenue('');
        } catch (err) {
            console.error(err);
            alert("Error mapping venue: " + (api.getErrorMessage(err)));
        } finally {
            setIsMapping(false);
        }
    };

    const handleMapCourseVenue = async (e) => {
        e.preventDefault();
        if (!selectedDept || !selectedCourse || !selectedCourseVenue) return;

        try {
            setIsMappingCourse(true);
            await mapVenueToCourse({
                department_code: selectedDept,
                course_code: selectedCourse,
                venue_id: parseInt(selectedCourseVenue),
                venue_type: selectedVenueType
            });
            await fetchDepartmentData(selectedDept, selectedSemester);
            setSelectedCourse('');
            setSelectedCourseVenue('');
            setSelectedVenueType('BOTH');
        } catch (err) {
            console.error(err);
            alert("Error mapping course venue: " + (api.getErrorMessage(err)));
        } finally {
            setIsMappingCourse(false);
        }
    };

    const handleRemoveMapping = async (id) => {
        if (!window.confirm("Are you sure you want to remove this venue mapping?")) return;

        try {
            await removeVenueMapping(id);
            await fetchDepartmentData(selectedDept, selectedSemester);
        } catch (err) {
            console.error(err);
            alert("Error removing mapping: " + (api.getErrorMessage(err)));
        }
    };

    const handleRemoveCourseMapping = async (id) => {
        if (!window.confirm("Are you sure you want to remove this course venue mapping?")) return;

        try {
            await removeCourseVenueMapping(id);
            await fetchDepartmentData(selectedDept, selectedSemester);
        } catch (err) {
            console.error(err);
            alert("Error removing mapping: " + (api.getErrorMessage(err)));
        }
    };

    const availableDeptVenues = venues.filter(v => !departmentVenues.find(dv => dv.venue_id === v.venue_id));
    const availableCourseVenues = venues.filter(v => !courseVenues.find(cv => cv.venue_id === v.venue_id && cv.course_code === selectedCourse));

    const mappedLabs = departmentVenues.filter(v => v.is_lab);
    const mappedClassrooms = departmentVenues.filter(v => !v.is_lab);

    const handleRemoveAllLabs = async () => {
        if (!window.confirm(`Are you sure you want to remove all ${mappedLabs.length} laboratory mappings for ${selectedDept}?`)) return;
        try {
            await Promise.all(mappedLabs.map(map => removeVenueMapping(map.id)));
            await fetchDepartmentData(selectedDept, selectedSemester);
        } catch (err) {
            console.error(err);
            alert("Error removing laboratory mappings.");
        }
    };

    const handleRemoveAllClassrooms = async () => {
        if (!window.confirm(`Are you sure you want to remove all ${mappedClassrooms.length} classroom mappings for ${selectedDept}?`)) return;
        try {
            await Promise.all(mappedClassrooms.map(map => removeVenueMapping(map.id)));
            await fetchDepartmentData(selectedDept, selectedSemester);
        } catch (err) {
            console.error(err);
            alert("Error removing classroom mappings.");
        }
    };

    const handleRemoveAllCourseVenues = async () => {
        if (!window.confirm(`Are you sure you want to remove all ${courseVenues.length} course-specific venue mappings?`)) return;
        try {
            await Promise.all(courseVenues.map(map => removeCourseVenueMapping(map.id)));
            await fetchDepartmentData(selectedDept, selectedSemester);
        } catch (err) {
            console.error(err);
            alert("Error removing course-specific mappings.");
        }
    };

    // --- Common Course Venue Handlers ---
    const handleAssignCommonVenue = async (courseCode, semester) => {
        if (!commonVenueSelected) return;
        try {
            const venueObj = venues.find(v => v.venue_id === parseInt(commonVenueSelected));
            if (!venueObj) return;
            await setCommonCourseVenue({
                course_code: courseCode,
                semester: semester,
                venue_name: venueObj.venue_name,
                venue_type: commonVenueType
            });
            const ccRes = await getCommonCourses();
            setCommonCourses(ccRes.data);
            setCommonVenueAssigning(null);
            setCommonVenueSelected('');
            setCommonVenueType('BOTH');
        } catch (err) {
            console.error(err);
            alert("Error assigning venue: " + (api.getErrorMessage(err)));
        }
    };

    const handleClearCommonVenue = async (courseCode, semester) => {
        if (!window.confirm(`Clear the global venue for ${courseCode}? This will unlink it from all departments.`)) return;
        try {
            await clearCommonCourseVenue(courseCode, semester);
            const ccRes = await getCommonCourses();
            setCommonCourses(ccRes.data);
        } catch (err) {
            console.error(err);
            alert("Error clearing venue: " + (api.getErrorMessage(err)));
        }
    };

    const commonCourseCodes = new Set(commonCourses.map(cc => cc.course_code));
    const nonCommonCourses = courses.filter(c => !commonCourseCodes.has(c.course_code));

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-800">Venue Mapping</h3>
                    <p className="text-slate-500 text-sm">Map laboratories and classrooms to departments</p>
                </div>

                <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
                    <select
                        className="w-full sm:w-48 p-2.5 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white font-medium text-slate-700"
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value)}
                    >
                        <option value="1">Semester 1</option>
                        <option value="2">Semester 2</option>
                        <option value="3">Semester 3</option>
                        <option value="4">Semester 4</option>
                        <option value="5">Semester 5</option>
                        <option value="6">Semester 6</option>
                        <option value="7">Semester 7</option>
                        <option value="8">Semester 8</option>
                    </select>
                    <div className="w-full sm:w-64">
                        <SearchableSelect 
                            options={departments.map(d => ({ value: d.department_code, label: d.department_code }))}
                            value={selectedDept}
                            onChange={(val) => setSelectedDept(val)}
                            placeholder="Select Department"
                            accentColor="purple"
                        />
                    </div>
                </div>
            </div>

            {/* ===== COMMON COURSE VENUES (Global) ===== */}
            {commonCourses.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border-2 border-purple-200 overflow-hidden mb-2">
                    <div
                        className="bg-purple-50 px-5 py-3 border-b border-purple-200 flex justify-between items-center cursor-pointer"
                        onClick={() => setShowCommonSection(!showCommonSection)}
                    >
                        <h4 className="font-bold text-purple-800 flex items-center gap-2">
                            <Globe size={18} className="text-purple-500" />
                            Common Course Venues
                            <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold uppercase">Global Lock</span>
                        </h4>
                        <div className="flex items-center gap-3">
                            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full">{commonCourses.length}</span>
                            <ChevronDown size={16} className={`text-purple-500 transition-transform ${showCommonSection ? 'rotate-180' : ''}`} />
                        </div>
                    </div>
                    {showCommonSection && (
                        <div className="p-5 space-y-3">
                            <p className="text-xs text-purple-600 font-medium bg-purple-50 px-3 py-2 rounded-lg border border-purple-100">
                                <Lock size={12} className="inline mr-1" />
                                Venues set here apply <strong>globally</strong> to all departments sharing the course. Individual departments cannot override this.
                            </p>
                            {commonCourses.map(cc => (
                                <div key={`${cc.course_code}-${cc.semester}`} className="p-4 rounded-xl border border-purple-100 bg-purple-50/30 hover:border-purple-300 transition-colors w-full">
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3 w-full">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-slate-800">{cc.course_code}</span>
                                                <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-bold">Sem {cc.semester}</span>
                                                {cc.venue_name ? (
                                                    <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                        <Lock size={10} /> {cc.venue_name}
                                                        <span className="text-purple-500">({cc.venue_type})</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">No Venue</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                <Users size={12} className="text-purple-400" />
                                                <span className="text-xs text-purple-500 font-medium">Depts:</span>
                                                {cc.departments.map(d => (
                                                    <span key={d} className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded font-bold">{d}</span>
                                                ))}
                                            </div>
                                            {cc.dept_student_counts && cc.dept_student_counts.length > 0 && (
                                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                    {cc.dept_student_counts.map(d => (
                                                        <span key={d.dept} className="text-[9px] bg-white text-purple-800 border border-purple-200 px-1.5 py-0.5 rounded shadow-sm font-bold">
                                                            {d.dept}: {d.count}
                                                        </span>
                                                    ))}
                                                    <span className="text-[9px] bg-purple-100 text-purple-800 border border-purple-200 px-1.5 py-0.5 rounded shadow-sm font-extrabold">
                                                        Total: {cc.dept_student_counts.reduce((s, d) => s + d.count, 0)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 flex-shrink-0 w-full sm:w-auto mt-3 sm:mt-0">
                                            {commonVenueAssigning === `${cc.course_code}-${cc.semester}` ? (
                                                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                                    <select
                                                        value={commonVenueSelected}
                                                        onChange={e => setCommonVenueSelected(e.target.value)}
                                                        className="p-1.5 border border-purple-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-purple-400 outline-none flex-1 sm:flex-none min-w-[120px]"
                                                    >
                                                        <option value="">Choose venue</option>
                                                        {venues.map(v => (
                                                            <option key={v.venue_id} value={v.venue_id}>
                                                                {v.venue_name} {v.is_lab ? '(Lab)' : ''} - Cap: {v.capacity}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <select
                                                        value={commonVenueType}
                                                        onChange={e => setCommonVenueType(e.target.value)}
                                                        className="p-1.5 border border-purple-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-purple-400 outline-none flex-1 sm:flex-none"
                                                    >
                                                        <option value="BOTH">Both</option>
                                                        <option value="THEORY">Theory</option>
                                                        <option value="LAB">Lab</option>
                                                    </select>
                                                    <button
                                                        onClick={() => handleAssignCommonVenue(cc.course_code, cc.semester)}
                                                        disabled={!commonVenueSelected}
                                                        className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-all"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => { setCommonVenueAssigning(null); setCommonVenueSelected(''); }}
                                                        className="px-2 py-1.5 bg-purple-100 text-purple-600 text-xs font-bold rounded-lg hover:bg-purple-200 transition-all"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => setCommonVenueAssigning(`${cc.course_code}-${cc.semester}`)}
                                                        className="w-full sm:w-auto justify-center px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-lg hover:bg-purple-200 transition-all flex items-center gap-1"
                                                    >
                                                        <MapPin size={12} /> {cc.venue_name ? 'Change' : 'Assign'}
                                                    </button>
                                                    {cc.venue_name && (
                                                        <button
                                                            onClick={() => handleClearCommonVenue(cc.course_code, cc.semester)}
                                                            className="p-1.5 text-purple-400 hover:text-purple-700 hover:bg-purple-100 rounded-lg transition-colors"
                                                            title="Clear Venue"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {selectedDept && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Map New Venue Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-sm border border-purple-200 p-5 lg:sticky lg:top-6 space-y-8">
                            <div>
                                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                                    <Plus size={18} className="text-purple-500" /> Map New Venue
                                </h4>
                                <form onSubmit={handleMapVenue} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">Select Venue</label>
                                        <SearchableSelect 
                                            options={availableDeptVenues.map(v => ({
                                                value: v.venue_id,
                                                label: `${v.venue_name} ${v.is_lab ? '(Lab)' : '(Classroom)'} - Cap: ${v.capacity}`
                                            }))}
                                            value={selectedVenue}
                                            onChange={(val) => setSelectedVenue(val)}
                                            placeholder="Choose a venue..."
                                            required={true}
                                            accentColor="purple"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!selectedVenue || isMapping}
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl py-3 flex justify-center items-center gap-2 disabled:opacity-50 transition-all shadow-md shadow-purple-200"
                                    >
                                        {isMapping ? 'Mapping...' : 'Assign to Department'}
                                    </button>
                                </form>
                            </div>

                            <hr className="border-purple-100" />

                            <div>
                                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                                    <BookOpen size={18} className="text-purple-500" /> Map Venue to Course
                                </h4>
                                <form onSubmit={handleMapCourseVenue} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">Select Course</label>
                                        <SearchableSelect 
                                            options={nonCommonCourses.map(c => ({
                                                value: c.course_code,
                                                label: `${c.course_code} - ${c.course_name}`
                                            }))}
                                            value={selectedCourse}
                                            onChange={(val) => setSelectedCourse(val)}
                                            placeholder="Choose a course..."
                                            required={true}
                                            accentColor="purple"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">Select Venue</label>
                                        <SearchableSelect 
                                            options={availableCourseVenues.map(v => ({
                                                value: v.venue_id,
                                                label: `${v.venue_name} ${v.is_lab ? '(Lab)' : '(Classroom)'} - Cap: ${v.capacity}`
                                            }))}
                                            value={selectedCourseVenue}
                                            onChange={(val) => setSelectedCourseVenue(val)}
                                            placeholder="Choose a venue..."
                                            required={true}
                                            accentColor="purple"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">Venue Used For</label>
                                        <select
                                            className="w-full p-2.5 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-slate-50 text-sm font-medium text-slate-700"
                                            value={selectedVenueType}
                                            onChange={(e) => setSelectedVenueType(e.target.value)}
                                        >
                                            <option value="BOTH">Both (Theory & Lab)</option>
                                            <option value="THEORY">Theory Only</option>
                                            <option value="LAB">Lab Only</option>
                                        </select>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!selectedCourse || !selectedCourseVenue || isMappingCourse}
                                        className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl py-3 flex justify-center items-center gap-2 disabled:opacity-50 transition-all shadow-md shadow-purple-200/50"
                                    >
                                        {isMappingCourse ? 'Mapping...' : 'Assign to Course'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* Mapped Venues Display */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Laboratories */}
                        <div className="bg-white rounded-2xl shadow-sm border border-purple-200 overflow-hidden">
                            <div className="bg-purple-50 px-5 py-3 border-b border-purple-200 flex justify-between items-center">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Building2 size={18} className="text-purple-500" />
                                    Mapped Laboratories
                                </h4>
                                <div className="flex items-center gap-3">
                                    <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full">{mappedLabs.length}</span>
                                    {mappedLabs.length > 0 && (
                                        <button onClick={handleRemoveAllLabs} className="text-[10px] font-bold bg-white text-purple-500 border border-purple-200 hover:bg-purple-50 hover:text-purple-700 px-2.5 py-1 uppercase rounded-lg shadow-sm transition-colors flex items-center gap-1">
                                            <Trash2 size={12} /> Clear All
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="p-5">
                                {mappedLabs.length === 0 ? (
                                    <p className="text-center text-slate-500 text-sm py-4">No laboratories mapped to {selectedDept} yet.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {mappedLabs.map(map => (
                                            <div key={map.id} className="flex justify-between items-center p-3 rounded-xl border border-purple-100 bg-purple-50/30 hover:border-purple-300 transition-colors group">
                                                <div>
                                                    <p className="font-semibold text-slate-800 text-sm">{map.venue_name}</p>
                                                    <p className="text-xs text-slate-500">Capacity: {map.capacity}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveMapping(map.id)}
                                                    className="p-2 text-purple-300 hover:text-purple-600 hover:bg-purple-100 rounded-lg transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                                                    title="Remove Mapping"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Classrooms */}
                        <div className="bg-white rounded-2xl shadow-sm border border-purple-200 overflow-hidden">
                            <div className="bg-purple-50 px-5 py-3 border-b border-purple-200 flex justify-between items-center">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                    <MapPin size={18} className="text-purple-600" />
                                    Mapped Classrooms
                                </h4>
                                <div className="flex items-center gap-3">
                                    <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full">{mappedClassrooms.length}</span>
                                    {mappedClassrooms.length > 0 && (
                                        <button onClick={handleRemoveAllClassrooms} className="text-[10px] font-bold bg-white text-purple-500 border border-purple-200 hover:bg-purple-50 hover:text-purple-700 px-2.5 py-1 uppercase rounded-lg shadow-sm transition-colors flex items-center gap-1">
                                            <Trash2 size={12} /> Clear All
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="p-5">
                                {mappedClassrooms.length === 0 ? (
                                    <p className="text-center text-slate-500 text-sm py-4">No classrooms mapped to {selectedDept} yet.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {mappedClassrooms.map(map => (
                                            <div key={map.id} className="flex justify-between items-center p-3 rounded-xl border border-purple-100 bg-purple-50/30 hover:border-purple-300 transition-colors group">
                                                <div>
                                                    <p className="font-semibold text-slate-800 text-sm">{map.venue_name}</p>
                                                    <p className="text-xs text-slate-500">Capacity: {map.capacity}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveMapping(map.id)}
                                                    className="p-2 text-purple-300 hover:text-purple-600 hover:bg-purple-100 rounded-lg transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                                                    title="Remove Mapping"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Course Venues */}
                        <div className="bg-white rounded-2xl shadow-sm border border-purple-200 overflow-hidden">
                            <div className="bg-purple-50/30 px-5 py-3 border-b border-purple-100 flex justify-between items-center">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                    <BookOpen size={18} className="text-purple-500" />
                                    Mapped Course-Specific Venues
                                </h4>
                                <div className="flex items-center gap-3">
                                    <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full">{courseVenues.length}</span>
                                    {courseVenues.length > 0 && (
                                        <button onClick={handleRemoveAllCourseVenues} className="text-[10px] font-bold bg-white text-purple-500 border border-purple-200 hover:bg-purple-50 hover:text-purple-700 px-2.5 py-1 uppercase rounded-lg shadow-sm transition-colors flex items-center gap-1">
                                            <Trash2 size={12} /> Clear All
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="p-5">
                                {courseVenues.length === 0 ? (
                                    <p className="text-center text-slate-500 text-sm py-4">No exclusive venues mapped to specific courses yet.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {courseVenues.map(map => (
                                            <div key={map.id} className="flex justify-between items-center p-3 rounded-xl border border-purple-100 bg-purple-50/30 hover:border-purple-300 transition-colors group">
                                                <div>
                                                    <p className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                                                        {map.venue_name} {map.is_lab ? '(Lab)' : ''}
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide bg-purple-100 text-purple-700`}>
                                                            {map.venue_type === 'BOTH' ? 'Theory & Lab' : map.venue_type || 'Both'}
                                                        </span>
                                                    </p>
                                                    <p className="text-xs text-purple-600 font-medium mt-0.5">Course: {map.course_code}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveCourseMapping(map.id)}
                                                    className="p-2 text-purple-300 hover:text-purple-600 hover:bg-purple-100 rounded-lg transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                                                    title="Remove Course Mapping"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VenueMapping;