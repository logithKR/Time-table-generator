import React, { useState, useEffect } from 'react';
import * as api from '../utils/api';
import { Plus, Trash2, Upload, MapPin, Box, Users, Search } from 'lucide-react';

const Venues = () => {
    const [venues, setVenues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [importing, setImporting] = useState(false);
    const [selectedBlock, setSelectedBlock] = useState('All');
    const [selectedType, setSelectedType] = useState('All'); // 'All', 'Class', 'Lab'

    useEffect(() => {
        fetchVenues();
    }, []);

    const fetchVenues = async () => {
        setLoading(true);
        try {
            const res = await api.getVenues();
            setVenues(res.data);
        } catch (err) {
            console.error("Failed to load venues", err);
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        if (!confirm("This will import venues from 'campus_classrooms_labs_simplified.xlsx' in the data folder. Continue?")) return;
        setImporting(true);
        try {
            const res = await api.importVenues();
            alert(`Successfully imported ${res.data.imported_count} venues!`);
            fetchVenues();
        } catch (err) {
            alert("Import failed: " + (err.response?.data?.detail || err.message));
        } finally {
            setImporting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this venue?")) return;
        try {
            await api.deleteVenue(id);
            setVenues(venues.filter(v => v.venue_id !== id));
        } catch (err) {
            alert("Delete failed: " + (err.response?.data?.detail || err.message));
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = {
            venue_name: fd.get('venue_name'),
            block: fd.get('block'),
            is_lab: fd.get('is_lab') === 'on',
            capacity: parseInt(fd.get('capacity') || '60')
        };
        try {
            await api.createVenue(data);
            setShowAdd(false);
            fetchVenues();
            e.target.reset();
        } catch (err) {
            alert("Create failed: " + (err.response?.data?.detail || err.message));
        }
    };

    // Extract unique blocks
    const uniqueBlocks = ['All', 'AS', 'IB', 'MECH', 'SF'];
    // const uniqueBlocks = ['All', ...new Set(venues.map(v => v.block || 'Other').filter(b => b))].sort();

    const filteredVenues = venues.filter(v => {
        const matchesSearch = v.venue_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (v.block && v.block.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesBlock = selectedBlock === 'All' || (v.block || 'Other') === selectedBlock;

        const matchesType = selectedType === 'All'
            ? true
            : selectedType === 'Lab' ? v.is_lab
                : !v.is_lab;

        return matchesSearch && matchesBlock && matchesType;
    });

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <MapPin className="w-6 h-6 text-violet-600" />
                        Venue Management
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Manage classrooms, labs, and seminar halls.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleImport}
                        disabled={importing}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 hover:text-emerald-700 font-semibold transition-colors disabled:opacity-50 border border-emerald-100"
                    >
                        <Upload className={`w-4 h-4 ${importing ? 'animate-bounce' : ''}`} />
                        {importing ? 'Importing...' : 'Import from Excel'}
                    </button>
                    <button
                        onClick={() => setShowAdd(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 font-semibold shadow-lg shadow-violet-200 transition-all hover:-translate-y-0.5"
                    >
                        <Plus className="w-4 h-4" /> Add Venue
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Venues</p>
                        <p className="text-2xl font-bold text-gray-800">{venues.length}</p>
                    </div>
                    <div className="p-3 bg-violet-50 rounded-lg text-violet-600"><MapPin className="w-5 h-5" /></div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Classrooms</p>
                        <p className="text-2xl font-bold text-gray-800">{venues.filter(v => !v.is_lab).length}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg text-blue-600"><Box className="w-5 h-5" /></div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Labs</p>
                        <p className="text-2xl font-bold text-gray-800">{venues.filter(v => v.is_lab).length}</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg text-amber-600"><Box className="w-5 h-5" /></div>
                </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
                {/* Block FilterTabs */}
                <div className="flex overflow-x-auto gap-1 scrollbar-hide w-full md:w-auto">
                    {uniqueBlocks.map(block => (
                        <button
                            key={block}
                            onClick={() => setSelectedBlock(block)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all border ${selectedBlock === block
                                    ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-200'
                                    : 'bg-transparent text-gray-600 border-transparent hover:bg-gray-50'
                                }`}
                        >
                            {block}
                        </button>
                    ))}
                </div>

                <div className="flex gap-4 w-full md:w-auto">
                    {/* Type Filter */}
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        {['All', 'Class', 'Lab'].map(type => (
                            <button
                                key={type}
                                onClick={() => setSelectedType(type)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedType === type
                                        ? 'bg-white text-gray-800 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search venues..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full h-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-50 outline-none transition-all text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                <th className="p-4">Venue Name</th>
                                <th className="p-4">Block</th>
                                <th className="p-4 text-center">Type</th>
                                <th className="p-4 text-center">Capacity</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="5" className="p-8 text-center text-gray-500">Loading venues...</td></tr>
                            ) : filteredVenues.length === 0 ? (
                                <tr><td colSpan="5" className="p-8 text-center text-gray-500">No venues found.</td></tr>
                            ) : (
                                filteredVenues.map(venue => (
                                    <tr key={venue.venue_id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="p-4 font-semibold text-gray-800">{venue.venue_name}</td>
                                        <td className="p-4 text-gray-600">{venue.block || '-'}</td>
                                        <td className="p-4 text-center">
                                            {venue.is_lab ? (
                                                <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">LAB</span>
                                            ) : (
                                                <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">CLASS</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center text-gray-600 font-mono text-sm">{venue.capacity}</td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => handleDelete(venue.venue_id)}
                                                className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                title="Delete Venue"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Modal */}
            {showAdd && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800">Add New Venue</h3>
                            <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <form onSubmit={handleAdd} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Venue Name</label>
                                <input name="venue_name" required className="w-full p-2.5 rounded-xl border border-gray-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-50 outline-none transition-all" placeholder="e.g. LH-101" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Block / Loading</label>
                                <select name="block" className="w-full p-2.5 rounded-xl border border-gray-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-50 outline-none transition-all bg-white">
                                    <option value="AS">AS</option>
                                    <option value="IB">IB</option>
                                    <option value="MECH">MECH</option>
                                    <option value="SF">SF</option>
                                </select>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Capacity</label>
                                    <input name="capacity" type="number" defaultValue="60" className="w-full p-2.5 rounded-xl border border-gray-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-50 outline-none transition-all" />
                                </div>
                                <div className="flex items-end pb-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input name="is_lab" type="checkbox" className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500 border-gray-300" />
                                        <span className="text-sm font-medium text-gray-700">Is Lab?</span>
                                    </label>
                                </div>
                            </div>
                            <div className="pt-2 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-gray-600 font-semibold hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                                <button type="submit" className="px-6 py-2 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200">Add Venue</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Venues;
