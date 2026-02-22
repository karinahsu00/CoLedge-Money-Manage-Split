import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器 - 添加 token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// 响应拦截器 - 处理错误
apiClient.interceptors.response.use((response) => {
  return response;
}, (error) => {
  if (error.response?.status === 401) {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }
  return Promise.reject(error);
});

// ======== Accounts API ========
export const accountsAPI = {
  getAll: () => apiClient.get('/accounts'),
  create: (data) => apiClient.post('/accounts', data),
  getById: (id) => apiClient.get(`/accounts/${id}`),
  update: (id, data) => apiClient.put(`/accounts/${id}`, data),
  delete: (id) => apiClient.delete(`/accounts/${id}`)
};

// ======== Transactions API ========
export const transactionsAPI = {
  getAll: () => apiClient.get('/transactions'),
  create: (data) => apiClient.post('/transactions', data),
  getByCategory: (category) => apiClient.get(`/transactions/category/${category}`),
  getByDateRange: (startDate, endDate) => apiClient.get('/transactions/date-range', {
    params: { startDate, endDate }
  }),
  getById: (id) => apiClient.get(`/transactions/${id}`),
  update: (id, data) => apiClient.put(`/transactions/${id}`, data),
  delete: (id) => apiClient.delete(`/transactions/${id}`)
};

// ======== Groups API ========
export const groupsAPI = {
  getAll: () => apiClient.get('/groups'),
  create: (data) => apiClient.post('/groups', data),
  getById: (id) => apiClient.get(`/groups/${id}`),
  update: (id, data) => apiClient.put(`/groups/${id}`, data),
  addMember: (id, memberId) => apiClient.post(`/groups/${id}/members`, { memberId }),
  getBalance: (id) => apiClient.get(`/groups/${id}/balance`),
  delete: (id) => apiClient.delete(`/groups/${id}`)
};

// ======== Splits API ========
export const splitsAPI = {
  getAll: () => apiClient.get('/splits'),
  create: (data) => apiClient.post('/splits', data),
  getById: (id) => apiClient.get(`/splits/${id}`),
  update: (id, data) => apiClient.put(`/splits/${id}`, data),
  delete: (id) => apiClient.delete(`/splits/${id}`)
};

// ======== Ledgers API ========
export const ledgersAPI = {
  getByGroup: (groupId) => apiClient.get(`/ledgers/group/${groupId}`)
};

export default apiClient;
