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
  getTestOrders: (params) => API.get('/lab/orders', { params }),
  getTestOrderById: (id) => API.get(`/lab/orders/${id}`),
  createTestOrder: (data) => API.post('/lab/orders', data),
  assignTestOrder: (id) => API.post(`/lab/orders/${id}/assign`),
  updateTestOrder: (id, data) => API.put(`/lab/orders/${id}`, data),
  uploadReport: (id, formData) => API.post(`/lab/orders/${id}/report`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  completeTestOrder: (id, data) => API.post(`/lab/orders/${id}/complete`, data)
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
