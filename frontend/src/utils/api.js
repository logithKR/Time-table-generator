import axios from 'axios';

const API_URL = '/api';

// Global Axios configuration for Secure Cookies
axios.defaults.withCredentials = true;

// Utility to get CSRF token
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// Request Interceptor to attach CSRF safely
axios.interceptors.request.use((config) => {
    if (['post', 'put', 'delete', 'patch'].includes(config.method)) {
        const csrfToken = getCookie("csrf_token");
        if (csrfToken) {
            config.headers['X-CSRF-Token'] = csrfToken;
        }
    }
    return config;
}, (error) => Promise.reject(error));

// Response Interceptor for Token Rotation
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // 401 Unauthorized interceptor
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/')) {
            if (isRefreshing) {
                return new Promise(function(resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(() => axios(originalRequest)).catch(err => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                await axios.post(`${API_URL}/auth/refresh`); // Refresh using cookie token
                isRefreshing = false;
                processQueue(null);
                
                // Try again after refresh
                return axios(originalRequest);
            } catch (err) {
                isRefreshing = false;
                processQueue(err, null);
                // Silent force reload/logout if token completely gone
                window.location.reload(); 
                return Promise.reject(err);
            }
        }
        return Promise.reject(error);
    }
);


// --- GET ---
export const getDepartments = () => axios.get(`${API_URL}/departments`);
export const getSemesters = () => axios.get(`${API_URL}/semesters`);
export const getSlots = () => axios.get(`${API_URL}/slots`);
export const getBreaks = () => axios.get(`${API_URL}/breaks`);
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
export const updateCourse = (code, data) => axios.put(`${API_URL}/courses/${code}`, data);
export const createCourseFaculty = (data) => axios.post(`${API_URL}/course-faculty`, data);
export const createSlot = (data) => axios.post(`${API_URL}/slots`, data);
export const createBreak = (data) => axios.post(`${API_URL}/breaks`, data);
export const syncCmsData = () => axios.post(`${API_URL}/api/sync-cms`);
export const getSyncStatus = () => axios.get(`${API_URL}/api/sync-cms/status`);

// --- PUT (Update) ---
export const updateDepartment = (code, data) => axios.put(`${API_URL}/departments/${code}`, data);
export const updateSlot = (slotId, data) => axios.put(`${API_URL}/slots/${slotId}`, data);
export const updateBreak = (breakId, data) => axios.put(`${API_URL}/breaks/${breakId}`, data);

// --- DELETE ---
export const deleteDepartment = (code) => axios.delete(`${API_URL}/departments/${code}`);
export const deleteFaculty = (fid) => axios.delete(`${API_URL}/faculty/${fid}`);
export const deleteCourse = (code) => axios.delete(`${API_URL}/courses/${code}`);
export const deleteCourseFaculty = (mid) => axios.delete(`${API_URL}/course-faculty/${mid}`);
export const deleteSlot = (slotId) => axios.delete(`${API_URL}/slots/${slotId}`);
export const deleteBreak = (breakId) => axios.delete(`${API_URL}/breaks/${breakId}`);

// --- Timetable ---
export const generateTimetable = (data) => axios.post(`${API_URL}/generate`, data);
export const getTimetable = (deptCode, sem) => axios.get(`${API_URL}/timetable?department_code=${deptCode}&semester=${sem}`);
export const getTimetableEntries = getTimetable;
export const getConflicts = (deptCode, sem) => {
    let url = `${API_URL}/api/conflicts`;
    const params = [];
    if (deptCode) params.push(`department_code=${deptCode}`);
    if (sem) params.push(`semester=${sem}`);
    if (params.length) url += `?${params.join('&')}`;
    return axios.get(url);
};
export const saveTimetable = (data) => axios.post(`${API_URL}/timetable/save`, data);
export const exportTimetableExcel = (deptCode, sem) => {
    let url = `${API_URL}/export/timetable/excel`;
    const params = [];
    if (deptCode) params.push(`department_code=${deptCode}`);
    if (sem) params.push(`semester=${sem}`);
    if (params.length) url += `?${params.join('&')}`;
    return axios.get(url, { responseType: 'blob' });
};

// --- Venues ---
export const getVenues = () => axios.get(`${API_URL}/venues`);
export const createVenue = (data) => axios.post(`${API_URL}/venues`, data);
export const deleteVenue = (id) => axios.delete(`${API_URL}/venues/${id}`);

// --- Department Venues ---
export const getDepartmentVenues = (deptCode, semester) => {
    let url = `${API_URL}/department-venues`;
    const params = [];
    if (deptCode) params.push(`department_code=${deptCode}`);
    if (semester) params.push(`semester=${semester}`);
    if (params.length) url += `?${params.join('&')}`;
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

// --- Students & Registrations ---
export const getStudents = (deptCode) => {
    let url = `${API_URL}/students`;
    if (deptCode) url += `?department_code=${deptCode}`;
    return axios.get(url);
};
export const createStudent = (data) => axios.post(`${API_URL}/students`, data);
export const deleteStudent = (id) => axios.delete(`${API_URL}/students/${id}`);

export const getRegistrations = (courseCode, semester) => {
    let url = `${API_URL}/registrations`;
    const params = [];
    if (courseCode) params.push(`course_code=${courseCode}`);
    if (semester) params.push(`semester=${semester}`);
    if (params.length) url += `?${params.join('&')}`;
    return axios.get(url);
};

export const createRegistration = (data) => axios.post(`${API_URL}/registrations`, data);
export const deleteRegistration = (id) => axios.delete(`${API_URL}/registrations/${id}`);

// --- Personalized Timetables ---
export const getFacultyTimetable = (facultyId) => axios.get(`${API_URL}/timetable/faculty/${facultyId}`);
export const getStudentTimetable = (studentId) => axios.get(`${API_URL}/timetable/student/${studentId}`);
export const getVenueTimetable = (venueName) => axios.get(`${API_URL}/timetable/venue/${venueName}`);

// --- Availability Queries (Smart Editor) ---
export const getAvailableFaculty = (deptCode, day, period, courseCode = '', showAll = false) => {
    let url = `${API_URL}/available-faculty?department_code=${deptCode}&day=${day}&period=${period}`;
    if (courseCode) url += `&course_code=${courseCode}`;
    if (showAll) url += `&show_all=true`;
    return axios.get(url);
};
export const getAvailableVenues = (deptCode, semester, day, period, courseCode = '', showAll = false) => {
    let url = `${API_URL}/available-venues?department_code=${deptCode}&semester=${semester}&day=${day}&period=${period}`;
    if (courseCode) url += `&course_code=${courseCode}`;
    if (showAll) url += `&show_all=true`;
    return axios.get(url);
};

// --- Conflict Check (Cross-Department) ---
export const checkConflicts = (data) => axios.post(`${API_URL}/check-conflicts`, data);

// --- Scheduler Config ---
export const getConfig = () => axios.get(`${API_URL}/api/config`);
export const saveConfig = (data) => axios.put(`${API_URL}/api/config`, data);
export const resetConfig = () => axios.post(`${API_URL}/api/config/reset`);

// --- Common Courses ---
export const getCommonCourses = () => axios.get(`${API_URL}/common-courses`);
export const saveCommonCourse = (data) => axios.post(`${API_URL}/common-courses`, data);
export const deleteCommonCourse = (courseCode, semester) =>
    axios.delete(`${API_URL}/common-courses/${courseCode}/${semester}`);
export const setCommonCourseVenue = (data) => axios.post(`${API_URL}/common-courses/venue`, data);
export const clearCommonCourseVenue = (courseCode, semester) =>
    axios.delete(`${API_URL}/common-courses/venue/${courseCode}/${semester}`);
export const getCommonCourseStudentDist = (courseCode, semester) =>
    axios.get(`${API_URL}/common-courses/student-distribution/${courseCode}/${semester}`);

// --- Semester Configs (Academic Year) ---
export const getSemesterConfigs = () => axios.get(`${API_URL}/api/semester-config`);
export const updateSemesterConfig = (semester, data) => axios.post(`${API_URL}/api/semester-config/${semester}`, data);

// --- User Constraints ---
export const getUserConstraints = (dept, sem) => {
    let url = `${API_URL}/api/user-constraints`;
    const params = [];
    if (dept) params.push(`dept=${dept}`);
    if (sem) params.push(`sem=${sem}`);
    if (params.length) url += `?${params.join('&')}`;
    return axios.get(url);
};
export const createUserConstraint = (data) => axios.post(`${API_URL}/api/user-constraints`, data);
export const updateUserConstraint = (uuid, data) => axios.put(`${API_URL}/api/user-constraints/${uuid}`, data);
export const deleteUserConstraint = (uuid) => axios.delete(`${API_URL}/api/user-constraints/${uuid}`);
export const toggleUserConstraint = (uuid) => axios.patch(`${API_URL}/api/user-constraints/${uuid}/toggle`);
export const reorderUserConstraints = (order) => axios.post(`${API_URL}/api/user-constraints/reorder`, { order });
export const validateUserConstraint = (data) => axios.post(`${API_URL}/api/user-constraints/validate`, data);

// --- Auth Endpoints ---
export const loginGoogle = (credential) => axios.post(`${API_URL}/auth/login`, { credential });
export const logout = () => axios.post(`${API_URL}/auth/logout`);
export const fetchSession = () => axios.get(`${API_URL}/auth/me`);
