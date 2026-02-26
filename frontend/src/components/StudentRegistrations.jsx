import React, { useState, useEffect } from 'react';
import { Search, Loader2, Trash2, Plus, Filter, Users, BookOpen } from 'lucide-react';
import { getStudents, getRegistrations, createStudent, deleteStudent, createRegistration, deleteRegistration, getCourses, getDepartments } from '../utils/api';

const StudentRegistrations = () => {
    const [activeTab, setActiveTab] = useState('students'); // 'students' or 'registrations'
    const [students, setStudents] = useState([]);
    const [registrations, setRegistrations] = useState([]);
    const [courses, setCourses] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedCourse, setSelectedCourse] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
    const [isAddRegModalOpen, setIsAddRegModalOpen] = useState(false);
    const [newStudent, setNewStudent] = useState({ student_id: '', name: '', email: '', department_code: '' });
    const [newReg, setNewReg] = useState({ student_id: '', course_code: '', semester: 4 });

    useEffect(() => {
        fetchDepartments();
        fetchCourses();
    }, []);

    useEffect(() => {
        if (activeTab === 'students') {
            fetchStudents();
        } else {
            fetchRegistrations();
        }
    }, [activeTab, selectedDept, selectedCourse]);

    const fetchDepartments = async () => {
        try {
            const res = await getDepartments();
            setDepartments(res.data);
        } catch (err) { }
    };

    const fetchCourses = async () => {
        try {
            const res = await getCourses();
            setCourses(res.data);
        } catch (err) { }
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await getStudents(selectedDept || null);
            setStudents(res.data);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const fetchRegistrations = async () => {
        setLoading(true);
        try {
            const res = await getRegistrations(selectedCourse || null, null);
            setRegistrations(res.data);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const handleCreateStudent = async (e) => {
        e.preventDefault();
        try {
            await createStudent(newStudent);
            setIsAddStudentModalOpen(false);
            setNewStudent({ student_id: '', name: '', email: '', department_code: '' });
            fetchStudents();
        } catch (err) {
            alert("Failed to create student. ID might already exist.");
        }
    };

    const handleDeleteStudent = async (id) => {
        if (!window.confirm("Are you sure? This will delete all course registrations for this student!")) return;
        try {
            await deleteStudent(id);
            fetchStudents();
        } catch (err) { }
    };

    const handleCreateRegistration = async (e) => {
        e.preventDefault();
        try {
            await createRegistration(newReg);
            setIsAddRegModalOpen(false);
            setNewReg({ student_id: '', course_code: '', semester: 4 });
            fetchRegistrations();
        } catch (err) {
            alert("Failed to add registration. Student might already be in this course, or course doesn't exist.");
        }
    };

    const handleDeleteRegistration = async (id) => {
        if (!window.confirm("Are you sure you want to remove this registration?")) return;
        try {
            await deleteRegistration(id);
            fetchRegistrations();
        } catch (err) { }
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.student_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredRegistrations = registrations.filter(r =>
        r.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.course_code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Students & Registrations</h2>
                    <p className="text-gray-500">Manage individuals and their course enrollments.</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('students')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${activeTab === 'students' ? 'bg-white shadow-sm text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <Users className="w-4 h-4" />
                        <span>Students</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('registrations')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${activeTab === 'registrations' ? 'bg-white shadow-sm text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <BookOpen className="w-4 h-4" />
                        <span>Registrations</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex flex-wrap gap-4 items-center justify-between bg-gray-50">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative max-w-sm flex-1">
                            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder={`Search ${activeTab}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        {activeTab === 'students' && (
                            <select
                                value={selectedDept}
                                onChange={(e) => setSelectedDept(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                <option value="">All Departments</option>
                                {departments.map(d => (
                                    <option key={d.department_code} value={d.department_code}>{d.department_code}</option>
                                ))}
                            </select>
                        )}
                        {activeTab === 'registrations' && (
                            <select
                                value={selectedCourse}
                                onChange={(e) => setSelectedCourse(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                <option value="">All Courses</option>
                                {courses.map(c => (
                                    <option key={c.course_code} value={c.course_code}>{c.course_code} - {c.course_name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                    <button
                        onClick={() => activeTab === 'students' ? setIsAddStudentModalOpen(true) : setIsAddRegModalOpen(true)}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span>{activeTab === 'students' ? 'Add Student' : 'Add Registration'}</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    {activeTab === 'students' ? (
                                        <>
                                            <th className="py-3 px-4 font-medium text-gray-600">Student ID</th>
                                            <th className="py-3 px-4 font-medium text-gray-600">Name</th>
                                            <th className="py-3 px-4 font-medium text-gray-600">Email</th>
                                            <th className="py-3 px-4 font-medium text-gray-600">Department</th>
                                            <th className="py-3 px-4 font-medium text-gray-600 w-20 text-center">Actions</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="py-3 px-4 font-medium text-gray-600">ID</th>
                                            <th className="py-3 px-4 font-medium text-gray-600">Student ID</th>
                                            <th className="py-3 px-4 font-medium text-gray-600">Course Code</th>
                                            <th className="py-3 px-4 font-medium text-gray-600">Semester</th>
                                            <th className="py-3 px-4 font-medium text-gray-600 w-20 text-center">Actions</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {activeTab === 'students' ? (
                                    filteredStudents.length > 0 ? (
                                        filteredStudents.map(s => (
                                            <tr key={s.student_id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="py-3 px-4 text-gray-800 font-medium">{s.student_id}</td>
                                                <td className="py-3 px-4 text-gray-600">{s.name}</td>
                                                <td className="py-3 px-4 text-gray-500">{s.email || '-'}</td>
                                                <td className="py-3 px-4">
                                                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                        {s.department_code}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <button onClick={() => handleDeleteStudent(s.student_id)} className="text-red-400 hover:text-red-600">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="5" className="py-8 text-center text-gray-500">No students found.</td></tr>
                                    )
                                ) : (
                                    filteredRegistrations.length > 0 ? (
                                        filteredRegistrations.map(r => (
                                            <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="py-3 px-4 text-gray-500 text-sm">#{r.id}</td>
                                                <td className="py-3 px-4 text-gray-800 font-medium">{r.student_id}</td>
                                                <td className="py-3 px-4 text-blue-600 font-medium">{r.course_code}</td>
                                                <td className="py-3 px-4 text-gray-600">{r.semester}</td>
                                                <td className="py-3 px-4 text-center">
                                                    <button onClick={() => handleDeleteRegistration(r.id)} className="text-red-400 hover:text-red-600">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="5" className="py-8 text-center text-gray-500">No registrations found.</td></tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Add Student Modal */}
            {isAddStudentModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Student</h3>
                        <form onSubmit={handleCreateStudent} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Student ID (Reg No)</label>
                                <input required type="text" value={newStudent.student_id} onChange={e => setNewStudent({ ...newStudent, student_id: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input required type="text" value={newStudent.name} onChange={e => setNewStudent({ ...newStudent, name: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input type="email" value={newStudent.email} onChange={e => setNewStudent({ ...newStudent, email: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                <select required value={newStudent.department_code} onChange={e => setNewStudent({ ...newStudent, department_code: e.target.value })} className="w-full px-3 py-2 border rounded-md">
                                    <option value="">Select Department</option>
                                    {departments.map(d => <option key={d.department_code} value={d.department_code}>{d.department_code}</option>)}
                                </select>
                            </div>
                            <div className="mt-6 flex justify-end space-x-3">
                                <button type="button" onClick={() => setIsAddStudentModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg">Save Student</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Registration Modal */}
            {isAddRegModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Register Student to Course</h3>
                        <form onSubmit={handleCreateRegistration} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                                <input required type="text" value={newReg.student_id} onChange={e => setNewReg({ ...newReg, student_id: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Course Code</label>
                                <input required type="text" value={newReg.course_code} onChange={e => setNewReg({ ...newReg, course_code: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border rounded-md" placeholder="e.g. 22AG040" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                                <input required type="number" min="1" max="8" value={newReg.semester} onChange={e => setNewReg({ ...newReg, semester: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-md" />
                            </div>
                            <div className="mt-6 flex justify-end space-x-3">
                                <button type="button" onClick={() => setIsAddRegModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg">Add Registration</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default StudentRegistrations;
