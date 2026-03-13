import React, { useState, useEffect, useRef } from 'react';
import { getDepartments, getVenues, getDepartmentVenues, mapVenueToDepartment, removeVenueMapping, getCourses, getCourseVenues, mapVenueToCourse, removeCourseVenueMapping } from '../utils/api';
import { MapPin, Plus, Trash2, Building2, BookOpen, Search, ChevronDown } from 'lucide-react';

const SearchableSelect = ({ options, value, onChange, placeholder, icon: Icon, required, accentColor = "violet" }) => {
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

    const ringClass = `ring-${accentColor}-500`;
    const borderClass = `border-${accentColor}-500`;
    const bgHoverClass = `hover:bg-${accentColor}-50`;
    const bgSelectedClass = `bg-${accentColor}-50 text-${accentColor}-700`;

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div 
                className={`w-full p-2.5 border rounded-xl flex items-center justify-between cursor-pointer bg-slate-50 transition-all ${isOpen ? `ring-2 ${ringClass} ${borderClass}` : 'border-slate-200 hover:border-slate-300'}`}
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) setSearchQuery('');
                }}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {Icon && <Icon size={16} className="text-slate-400 flex-shrink-0" />}
                    <span className={`truncate ${!selectedOption ? 'text-slate-400' : 'text-slate-800 font-medium'}`}>
                        {selectedOption ? selectedOption.label : placeholder} 
                        {required && !selectedOption && <span className="text-red-500 ml-1">*</span>}
                    </span>
                </div>
                <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-[60] min-w-full w-[max-content] max-w-[90vw] mt-2 bg-white border border-slate-100 rounded-xl shadow-xl shadow-slate-200/50 max-h-64 overflow-hidden flex flex-col transform opacity-100 scale-100 transition-all origin-top">
                    <div className="p-2 border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text"
                                className={`w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 ${ringClass} transition-all`}
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
                                    className={`p-2.5 text-sm rounded-lg cursor-pointer transition-colors break-words whitespace-normal ${value === opt.value ? `${bgSelectedClass} font-semibold` : `text-slate-700 ${bgHoverClass}`}`}
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
            const [deptRes, venueRes] = await Promise.all([
                getDepartments(),
                getVenues()
            ]);
            setDepartments(deptRes.data);
            setVenues(venueRes.data);
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
            alert("Error mapping venue: " + (err.response?.data?.detail || err.message));
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
            alert("Error mapping course venue: " + (err.response?.data?.detail || err.message));
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
            alert("Error removing mapping: " + (err.response?.data?.detail || err.message));
        }
    };

    const handleRemoveCourseMapping = async (id) => {
        if (!window.confirm("Are you sure you want to remove this course venue mapping?")) return;

        try {
            await removeCourseVenueMapping(id);
            await fetchDepartmentData(selectedDept, selectedSemester);
        } catch (err) {
            console.error(err);
            alert("Error removing mapping: " + (err.response?.data?.detail || err.message));
        }
    };

    // Filter out venues that are already mapped to the *current* department/course
    const availableDeptVenues = venues.filter(v => !departmentVenues.find(dv => dv.venue_id === v.venue_id));
    const availableCourseVenues = venues.filter(v => !courseVenues.find(cv => cv.venue_id === v.venue_id && cv.course_code === selectedCourse));

    // Split mapped venues by type for display
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

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-800">Venue Mapping</h3>
                    <p className="text-slate-500 text-sm">Map laboratories and classrooms to departments</p>
                </div>

                <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
                    <select
                        className="w-full sm:w-48 p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none bg-white font-medium"
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
                            accentColor="violet"
                        />
                    </div>
                </div>
            </div>

            {selectedDept && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Map New Venue Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sticky top-6 space-y-8">
                            <div>
                                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                                    <Plus size={18} className="text-violet-500" /> Map New Venue
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
                                            accentColor="violet"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!selectedVenue || isMapping}
                                        className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl py-3 flex justify-center items-center gap-2 disabled:opacity-50 transition-all shadow-md shadow-violet-200"
                                    >
                                        {isMapping ? 'Mapping...' : 'Assign to Department'}
                                    </button>
                                </form>
                            </div>

                            <hr className="border-slate-100" />

                            <div>
                                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                                    <BookOpen size={18} className="text-amber-500" /> Map Venue to Course
                                </h4>
                                <form onSubmit={handleMapCourseVenue} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">Select Course</label>
                                        <SearchableSelect 
                                            options={courses.map(c => ({
                                                value: c.course_code,
                                                label: `${c.course_code} - ${c.course_name}`
                                            }))}
                                            value={selectedCourse}
                                            onChange={(val) => setSelectedCourse(val)}
                                            placeholder="Choose a course..."
                                            required={true}
                                            accentColor="amber"
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
                                            accentColor="amber"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">Venue Used For</label>
                                        <select
                                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-slate-50 text-sm font-medium text-slate-700"
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
                                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl py-3 flex justify-center items-center gap-2 disabled:opacity-50 transition-all shadow-md shadow-amber-200/50"
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
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Building2 size={18} className="text-emerald-500" />
                                    Mapped Laboratories
                                </h4>
                                <div className="flex items-center gap-3">
                                    <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">{mappedLabs.length}</span>
                                    {mappedLabs.length > 0 && (
                                        <button onClick={handleRemoveAllLabs} className="text-[10px] font-bold bg-white text-red-500 border border-red-200 hover:bg-red-50 hover:text-red-700 px-2.5 py-1 uppercase rounded-lg shadow-sm transition-colors flex items-center gap-1">
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
                                            <div key={map.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-emerald-200 transition-colors group">
                                                <div>
                                                    <p className="font-semibold text-slate-800 text-sm">{map.venue_name}</p>
                                                    <p className="text-xs text-slate-500">Capacity: {map.capacity}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveMapping(map.id)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
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
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                    <MapPin size={18} className="text-blue-500" />
                                    Mapped Classrooms
                                </h4>
                                <div className="flex items-center gap-3">
                                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">{mappedClassrooms.length}</span>
                                    {mappedClassrooms.length > 0 && (
                                        <button onClick={handleRemoveAllClassrooms} className="text-[10px] font-bold bg-white text-red-500 border border-red-200 hover:bg-red-50 hover:text-red-700 px-2.5 py-1 uppercase rounded-lg shadow-sm transition-colors flex items-center gap-1">
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
                                            <div key={map.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-blue-200 transition-colors group">
                                                <div>
                                                    <p className="font-semibold text-slate-800 text-sm">{map.venue_name}</p>
                                                    <p className="text-xs text-slate-500">Capacity: {map.capacity}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveMapping(map.id)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
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
                        <div className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
                            <div className="bg-amber-50/30 px-5 py-3 border-b border-amber-100 flex justify-between items-center">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                    <BookOpen size={18} className="text-amber-500" />
                                    Mapped Course-Specific Venues
                                </h4>
                                <div className="flex items-center gap-3">
                                    <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">{courseVenues.length}</span>
                                    {courseVenues.length > 0 && (
                                        <button onClick={handleRemoveAllCourseVenues} className="text-[10px] font-bold bg-white text-red-500 border border-red-200 hover:bg-red-50 hover:text-red-700 px-2.5 py-1 uppercase rounded-lg shadow-sm transition-colors flex items-center gap-1">
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
                                            <div key={map.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-amber-300 transition-colors group">
                                                <div>
                                                    <p className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                                                        {map.venue_name} {map.is_lab ? '(Lab)' : ''}
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                                                            map.venue_type === 'LAB' ? 'bg-emerald-100 text-emerald-700' :
                                                            map.venue_type === 'THEORY' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-purple-100 text-purple-700'
                                                        }`}>
                                                            {map.venue_type === 'BOTH' ? 'Theory & Lab' : map.venue_type || 'Both'}
                                                        </span>
                                                    </p>
                                                    <p className="text-xs text-slate-500 font-medium text-amber-600 mt-0.5">Course: {map.course_code}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveCourseMapping(map.id)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
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
