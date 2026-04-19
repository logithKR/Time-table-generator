import React from 'react';
import { Download, RotateCw } from 'lucide-react';
import BITTimetable from './BITTimetable';

const PrintView = ({
    editorDept,
    setEditorDept,
    editorSem,
    setEditorSem,
    departments,
    semesters,
    loading,
    fetchPrintData,
    timetableEntries,
    slots,
    allCourses,
    allFaculty,
    breakConfigs,
    semesterConfigs,
    detectedConflicts
}) => {
    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Download className="w-5 h-5 text-blue-600" />
                    <span>Print View Manager</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <select
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            value={editorDept}
                            onChange={e => setEditorDept(e.target.value)}
                        >
                            <option value="">-- All Departments (Master View) --</option>
                            {departments.map(d => <option key={d.department_code} value={d.department_code}>{d.department_code}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                        <select
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            value={editorSem}
                            onChange={e => setEditorSem(e.target.value)}
                        >
                            <option value="">-- All Semesters --</option>
                            {semesters.map(s => <option key={s.semester_number} value={s.semester_number}>Semester {s.semester_number}</option>)}
                        </select>
                    </div>
                    <div className="pb-0.5">
                        <button
                            onClick={() => fetchPrintData(editorDept, editorSem)}
                            disabled={loading}
                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow hover:bg-blue-700 transition-all disabled:bg-gray-400"
                        >
                            {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                            Load / Refresh Data
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden min-h-[600px] flex flex-col">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-700">
                        {!editorDept && !editorSem ? 'MASTER TIMETABLE (All Data)' :
                            `${editorDept || 'All Depts'} - ${editorSem ? 'Sem ' + editorSem : 'All Sems'}`}
                    </h3>
                </div>
                <div className="flex-1 relative">
                    <BITTimetable
                        timetableData={timetableEntries}
                        department={departments.find(d => d.department_code === editorDept)?.department_code}
                        semester={semesters.find(s => s.semester_number === parseInt(editorSem))?.semester_number}
                        slots={slots}
                        courses={allCourses}
                        faculty={allFaculty}
                        breakConfigs={breakConfigs}
                        departments={departments}
                        semesterConfigs={semesterConfigs}
                        conflicts={detectedConflicts}
                        onRefresh={() => fetchPrintData(editorDept, editorSem)}
                    />
                </div>
            </div>
        </div>
    );
};

export default PrintView;
