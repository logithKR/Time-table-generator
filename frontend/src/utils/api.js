import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000';

// --- GET ---
export const getDepartments = () => axios.get(`${API_URL}/departments`);
export const getSemesters = () => axios.get(`${API_URL}/semesters`);
export const getSlots = () => axios.get(`${API_URL}/slots`);
export const getCourses = (deptCode, sem) => {
    let url = `${API_URL}/courses`;
    const params = [];
    if (deptCode) params.push(`department_code=${deptCode}`);
    if (sem) params.push(`semester=${sem}`);
    if (params.length) url += `?${params.join('&')}`;
    return axios.get(url);
};
export const getFaculty = (deptCode) => {
    let url = `${API_URL}/faculty`;
    if (deptCode) url += `?department_code=${deptCode}`;
    return axios.get(url);
};
export const getCourseFaculty = (deptCode) => {
    let url = `${API_URL}/course-faculty`;
    if (deptCode) url += `?department_code=${deptCode}`;
    return axios.get(url);
};

// --- POST (Create) ---
export const createDepartment = (data) => axios.post(`${API_URL}/departments`, data);
export const createFaculty = (data) => axios.post(`${API_URL}/faculty`, data);
export const createCourse = (data) => axios.post(`${API_URL}/courses`, data);
export const createCourseFaculty = (data) => axios.post(`${API_URL}/course-faculty`, data);
export const createSlot = (data) => axios.post(`${API_URL}/slots`, data);

// --- PUT (Update) ---
export const updateDepartment = (code, data) => axios.put(`${API_URL}/departments/${code}`, data);
export const updateSlot = (slotId, data) => axios.put(`${API_URL}/slots/${slotId}`, data);

// --- DELETE ---
export const deleteDepartment = (code) => axios.delete(`${API_URL}/departments/${code}`);
export const deleteFaculty = (fid) => axios.delete(`${API_URL}/faculty/${fid}`);
export const deleteCourse = (code) => axios.delete(`${API_URL}/courses/${code}`);
export const deleteCourseFaculty = (mid) => axios.delete(`${API_URL}/course-faculty/${mid}`);
export const deleteSlot = (slotId) => axios.delete(`${API_URL}/slots/${slotId}`);

// --- Timetable ---
export const generateTimetable = (data) => axios.post(`${API_URL}/generate`, data);
export const getTimetable = (deptCode, sem) => axios.get(`${API_URL}/timetable?department_code=${deptCode}&semester=${sem}`);
export const getTimetableEntries = getTimetable;
export const saveTimetable = (data) => axios.post(`${API_URL}/timetable/save`, data);

// --- Venues ---
export const getVenues = () => axios.get(`${API_URL}/venues`);
export const createVenue = (data) => axios.post(`${API_URL}/venues`, data);
export const deleteVenue = (id) => axios.delete(`${API_URL}/venues/${id}`);
export const importVenues = () => axios.post(`${API_URL}/venues/import`);

// --- Department Venues ---
export const getDepartmentVenues = (deptCode) => {
    let url = `${API_URL}/department-venues`;
    if (deptCode) url += `?department_code=${deptCode}`;
    return axios.get(url);
};
export const mapVenueToDepartment = (data) => axios.post(`${API_URL}/department-venues`, data);
export const removeVenueMapping = (id) => axios.delete(`${API_URL}/department-venues/${id}`);

// --- Course Venue Mapping ---
export const getCourseVenues = (deptCode) => {
    let url = `${API_URL}/course-venues`;
    if (deptCode) url += `?department_code=${deptCode}`;
    return axios.get(url);
};
export const mapVenueToCourse = (data) => axios.post(`${API_URL}/course-venues`, data);
export const removeCourseVenueMapping = (id) => axios.delete(`${API_URL}/course-venues/${id}`);

// --- Department Semester Capacities ---
export const getDepartmentCapacities = (deptCode) => axios.get(`${API_URL}/departments/${deptCode}/capacities`);
export const upsertDepartmentCapacity = (deptCode, semester, data) =>
    axios.post(`${API_URL}/departments/${deptCode}/capacities?semester=${semester}`, data);
