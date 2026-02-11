import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  withCredentials: true
});

// Request interceptor to add auth token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — auto-logout on 401 (stale/invalid token)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token is invalid or user no longer exists — clear everything and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('firstName');
      localStorage.removeItem('lastName');
      localStorage.removeItem('email');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('role');
      sessionStorage.removeItem('firstName');
      sessionStorage.removeItem('lastName');
      sessionStorage.removeItem('email');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Child API endpoints
export const childAPI = {
  getChildren: () => API.get('/child'),
  getChildById: (childId) => API.get(`/child/${childId}`),
  createChild: (childData) => API.post('/child', childData),
  updateChild: (childId, childData) => API.put(`/child/${childId}`, childData),
  deleteChild: (childId) => API.delete(`/child/${childId}`),
  getChildScreeningStatus: (childId) => API.get(`/screening/child/${childId}/screening-status`),
  getChildScreeningsCount: (childId) => API.get(`/screening/child/${childId}/count`),
  getChildScreenings: (childId) => API.get(`/screening/child/${childId}`)
};

export const screeningAPI = {
  calculateScreening: (screeningData) => API.post('/screening/calculate-screening', screeningData),
  getQuestionnaireByType: (type) => API.get(`/screening/questionnaires/${type}`),
  getAvailableQuestionnaires: () => API.get('/screening/available-questionnaires'),
  getScreeningHistory: () => API.get('/screening/screening-history'),
  getSubmissionById: (id) => API.get(`/screening/submission/${id}`),
  downloadSubmissionReport: (id) => API.get(`/screening/submission/${id}/download`, { responseType: 'blob' }),
  getChildScreeningStatus: (childId) => API.get(`/screening/child/${childId}/screening-status`),
  getScreeningStats: () => API.get('/screening/stats'),
  getAvailableCliniciansAndTherapists: () => API.get('/screening/available-clinicians-therapists')
};

// Lab API endpoints
export const labAPI = {
  getStats: () => API.get('/lab/stats'),
  getRequests: (params) => API.get('/lab/requests', { params }),
  getRequestById: (id) => API.get(`/lab/requests/${id}`),
  uploadReport: (formData, onUploadProgress) =>
    API.post('/lab/reports/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress
    }),
  updateStatus: (id, status) => API.patch(`/lab/requests/${id}/status`, { status }),
  getReportById: (id) => API.get(`/lab/reports/${id}`),
  getAllReports: () => API.get('/lab/reports')
};

// Appointment API endpoints
export const appointmentAPI = {
  // Parent endpoints
  create: (formData) => API.post('/appointments', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getMyAppointments: (params) => API.get('/appointments/my', { params }),
  cancel: (id) => API.put(`/appointments/${id}/cancel`),
  getAvailableProfessionals: (type) => API.get(`/appointments/professionals/${type}`),

  // Professional endpoints
  getProfessionalAppointments: (params) => API.get('/appointments/professional', { params }),
  approve: (id, data) => API.put(`/appointments/${id}/approve`, data),
  reject: (id, data) => API.put(`/appointments/${id}/reject`, data),
  reschedule: (id, data) => API.put(`/appointments/${id}/reschedule`, data),
  complete: (id, data) => API.put(`/appointments/${id}/complete`, data),

  // Admin endpoints
  getAll: (params) => API.get('/appointments/all', { params }),
  getStats: () => API.get('/appointments/stats')
};

export default API;
