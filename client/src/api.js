import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
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
  getChildScreeningStatus: (childId) => API.get(`/screening/child/${childId}/screening-status`)
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

export default API;
