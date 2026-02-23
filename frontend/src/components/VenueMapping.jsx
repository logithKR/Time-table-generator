import React, { useState, useEffect } from 'react';
import { getDepartments, getVenues, getDepartmentVenues, mapVenueToDepartment, removeVenueMapping } from '../utils/api';
import { MapPin, Plus, Trash2, Building2 } from 'lucide-react';

const VenueMapping = () => {
    const [departments, setDepartments] = useState([]);
    const [venues, setVenues] = useState([]);
    const [departmentVenues, setDepartmentVenues] = useState([]);

    const [selectedDept, setSelectedDept] = useState('');
    const [selectedVenue, setSelectedVenue] = useState('');
    const [isMapping, setIsMapping] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedDept) {
            fetchDepartmentVenues(selectedDept);
        } else {
            setDepartmentVenues([]);
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

    const fetchDepartmentVenues = async (deptCode) => {
        try {
            const res = await getDepartmentVenues(deptCode);
            setDepartmentVenues(res.data);
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
            await fetchDepartmentVenues(selectedDept);
            setSelectedVenue('');
        } catch (err) {
            console.error(err);
            alert("Error mapping venue: " + (err.response?.data?.detail || err.message));
        } finally {
            setIsMapping(false);
        }
    };

    const handleRemoveMapping = async (id) => {
        if (!window.confirm("Are you sure you want to remove this venue mapping?")) return;

        try {
            await removeVenueMapping(id);
            await fetchDepartmentVenues(selectedDept);
        } catch (err) {
            console.error(err);
            alert("Error removing mapping: " + (err.response?.data?.detail || err.message));
        }
    };

    // Filter out venues that are already mapped to the *current* department
    // (A venue could technically be shared, but usually we just want to avoid double-mapping to the same dept)
    const availableVenues = venues.filter(v => !departmentVenues.find(dv => dv.venue_id === v.venue_id));

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
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sticky top-6">
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
                                        {availableVenues.map(v => (
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
                    </div>
                </div>
            )}
        </div>
    );
};

export default VenueMapping;
