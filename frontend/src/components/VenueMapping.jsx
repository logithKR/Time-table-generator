import React, { useState, useEffect } from 'react';
import { getDepartments, getVenues, getDepartmentVenues, mapVenueToDepartment, removeVenueMapping, getCourses, getCourseVenues, mapVenueToCourse, removeCourseVenueMapping } from '../utils/api';
import { MapPin, Plus, Trash2, Building2, BookOpen } from 'lucide-react';

const VenueMapping = () => {
    const [departments, setDepartments] = useState([]);
    const [venues, setVenues] = useState([]);
    const [courses, setCourses] = useState([]);
    const [departmentVenues, setDepartmentVenues] = useState([]);
    const [courseVenues, setCourseVenues] = useState([]);

    const [selectedDept, setSelectedDept] = useState('');
    const [selectedVenue, setSelectedVenue] = useState('');
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedCourseVenue, setSelectedCourseVenue] = useState('');

    const [isMapping, setIsMapping] = useState(false);
    const [isMappingCourse, setIsMappingCourse] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedDept) {
            fetchDepartmentData(selectedDept);
        } else {
            setDepartmentVenues([]);
            setCourses([]);
            setCourseVenues([]);
        }
    }, [selectedDept]);

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

    const fetchDepartmentData = async (deptCode) => {
        try {
            const [dvRes, cRes, cvRes] = await Promise.all([
                getDepartmentVenues(deptCode),
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
                venue_id: parseInt(selectedVenue)
            });
            await fetchDepartmentData(selectedDept);
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
                venue_id: parseInt(selectedCourseVenue)
            });
            await fetchDepartmentData(selectedDept);
            setSelectedCourse('');
            setSelectedCourseVenue('');
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
            await fetchDepartmentData(selectedDept);
        } catch (err) {
            console.error(err);
            alert("Error removing mapping: " + (err.response?.data?.detail || err.message));
        }
    };

    const handleRemoveCourseMapping = async (id) => {
        if (!window.confirm("Are you sure you want to remove this course venue mapping?")) return;

        try {
            await removeCourseVenueMapping(id);
            await fetchDepartmentData(selectedDept);
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

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-800">Venue Mapping</h3>
                    <p className="text-slate-500 text-sm">Map laboratories and classrooms to departments</p>
                </div>

                <div className="w-full md:w-64">
                    <select
                        className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white font-medium"
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                    >
                        <option value="" disabled>Select Department</option>
                        {departments.map(d => (
                            <option key={d.department_code} value={d.department_code}>{d.department_code}</option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedDept && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Map New Venue Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sticky top-6 space-y-8">
                            <div>
                                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                                    <Plus size={18} className="text-primary-500" /> Map New Venue
                                </h4>
                                <form onSubmit={handleMapVenue} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Select Venue</label>
                                        <select
                                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-slate-50"
                                            value={selectedVenue}
                                            onChange={(e) => setSelectedVenue(e.target.value)}
                                            required
                                        >
                                            <option value="" disabled>Choose a venue...</option>
                                            {availableDeptVenues.map(v => (
                                                <option key={v.venue_id} value={v.venue_id}>
                                                    {v.venue_name} {v.is_lab ? '(Lab)' : '(Classroom)'} - Cap: {v.capacity}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!selectedVenue || isMapping}
                                        className="w-full btn-primary py-2.5 flex justify-center items-center gap-2 disabled:opacity-50"
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
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Select Course</label>
                                        <select
                                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-slate-50"
                                            value={selectedCourse}
                                            onChange={(e) => setSelectedCourse(e.target.value)}
                                            required
                                        >
                                            <option value="" disabled>Choose a course...</option>
                                            {courses.map(c => (
                                                <option key={c.course_code} value={c.course_code}>
                                                    {c.course_code} - {c.course_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Select Venue</label>
                                        <select
                                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-slate-50"
                                            value={selectedCourseVenue}
                                            onChange={(e) => setSelectedCourseVenue(e.target.value)}
                                            required
                                        >
                                            <option value="" disabled>Choose a venue...</option>
                                            {availableCourseVenues.map(v => (
                                                <option key={v.venue_id} value={v.venue_id}>
                                                    {v.venue_name} {v.is_lab ? '(Lab)' : '(Classroom)'} - Cap: {v.capacity}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!selectedCourse || !selectedCourseVenue || isMappingCourse}
                                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl py-2.5 flex justify-center items-center gap-2 disabled:opacity-50 transition-colors"
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
                                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">{mappedLabs.length}</span>
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
                                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">{mappedClassrooms.length}</span>
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
                                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">{courseVenues.length}</span>
                            </div>
                            <div className="p-5">
                                {courseVenues.length === 0 ? (
                                    <p className="text-center text-slate-500 text-sm py-4">No exclusive venues mapped to specific courses yet.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {courseVenues.map(map => (
                                            <div key={map.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-amber-300 transition-colors group">
                                                <div>
                                                    <p className="font-semibold text-slate-800 text-sm">{map.venue_name} {map.is_lab ? '(Lab)' : ''}</p>
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
