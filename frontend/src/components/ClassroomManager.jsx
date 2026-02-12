import React, { useState, useEffect } from 'react';
import { getClassrooms, createClassroom } from '../utils/api';
import { Plus, Layout } from 'lucide-react';

const ClassroomManager = () => {
    const [rooms, setRooms] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newRoom, setNewRoom] = useState({
        room_name: '', capacity: 40, is_lab: 0
    });

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
            const res = await getClassrooms();
            setRooms(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createClassroom(newRoom);
            setIsAdding(false);
            fetchRooms();
        } catch (err) {
            console.error(err);
            alert("Error saving room: " + (err.response?.data?.detail || err.message));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Classrooms & Labs</h3>
                <button
                    onClick={() => setIsAdding(true)}
                    className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
                >
                    <Plus size={16} /> Add Room
                </button>
            </div>

            {rooms.length === 0 ? (
                <div className="text-center py-20 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Layout size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-600 mb-1">No Classrooms Found</h3>
                    <p className="text-slate-500 mb-6 max-w-xs mx-auto">Add rooms to define where classes will be held.</p>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="btn-primary py-2 px-6"
                    >
                        Add First Room
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {rooms.map(room => (
                        <div key={room.id} className="glass-card p-6 border-t-4 border-primary-500">
                            <div className="flex items-center gap-3 mb-4">
                                <Layout className="text-primary-600" size={20} />
                                <h4 className="font-bold text-slate-800">{room.room_name}</h4>
                            </div>
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Capacity</p>
                                    <p className="text-lg font-bold">{room.capacity}</p>
                                </div>
                                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${room.is_lab ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {room.is_lab ? 'Laboratory' : 'Classroom'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isAdding && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
                        <h4 className="text-xl font-bold mb-6">Add New Room</h4>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input
                                placeholder="Room Name / Number"
                                className="input-field"
                                value={newRoom.room_name}
                                onChange={e => setNewRoom({ ...newRoom, room_name: e.target.value })}
                                required
                            />
                            <input
                                type="number"
                                placeholder="Capacity"
                                className="input-field"
                                value={newRoom.capacity}
                                onChange={e => setNewRoom({ ...newRoom, capacity: parseInt(e.target.value) })}
                                required
                            />
                            <div className="flex items-center gap-2 py-2">
                                <input
                                    type="checkbox"
                                    id="isLab"
                                    checked={newRoom.is_lab === 1}
                                    onChange={e => setNewRoom({ ...newRoom, is_lab: e.target.checked ? 1 : 0 })}
                                />
                                <label htmlFor="isLab" className="text-sm font-medium text-slate-700">This is a Laboratory</label>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 text-slate-500 font-medium">Cancel</button>
                                <button type="submit" className="flex-1 btn-primary">Save Room</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassroomManager;
