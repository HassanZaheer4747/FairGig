import axios from 'axios';

const AUTH_URL = 'http://localhost:5000';
const EARNINGS_URL = 'http://localhost:8001';
const GRIEVANCE_URL = 'http://localhost:5001';
const ANALYTICS_URL = 'http://localhost:8003';
const CERTIFICATE_URL = 'http://localhost:8004';

const createClient = (baseURL) => {
  const client = axios.create({ baseURL });
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('fg_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  client.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err.response?.status === 401) {
        localStorage.removeItem('fg_token');
        localStorage.removeItem('fg_user');
        window.location.href = '/login';
      }
      return Promise.reject(err);
    }
  );
  return client;
};

export const authApi = createClient(AUTH_URL);
export const earningsApi = createClient(EARNINGS_URL);
export const grievanceApi = createClient(GRIEVANCE_URL);
export const analyticsApi = createClient(ANALYTICS_URL);
export const certificateApi = createClient(CERTIFICATE_URL);

// Auth
export const login = (data) => authApi.post('/api/auth/login', data);
export const signup = (data) => authApi.post('/api/auth/signup', data);
export const getMe = () => authApi.get('/api/auth/me');

// Earnings
export const getEarnings = (params) => earningsApi.get('/api/earnings', { params });
export const createEarning = (data) => earningsApi.post('/api/earnings', data);
export const updateEarning = (id, data) => earningsApi.put(`/api/earnings/${id}`, data);
export const deleteEarning = (id) => earningsApi.delete(`/api/earnings/${id}`);
export const getDashboard = () => earningsApi.get('/api/earnings/dashboard');
export const importCSV = (file) => {
  const form = new FormData();
  form.append('file', file);
  return earningsApi.post('/api/earnings/import/csv', form);
};
export const uploadScreenshot = (file) => {
  const form = new FormData();
  form.append('file', file);
  return earningsApi.post('/api/earnings/upload/screenshot', form);
};
export const getAllEarnings = (params) => earningsApi.get('/api/earnings/admin/all', { params });

// Grievances
export const getGrievances = (params) => grievanceApi.get('/api/grievances', { params });
export const createGrievance = (data) => grievanceApi.post('/api/grievances', data);
export const updateGrievanceStatus = (id, data) => grievanceApi.put(`/api/grievances/${id}/status`, data);
export const upvoteGrievance = (id) => grievanceApi.post(`/api/grievances/${id}/upvote`);
export const getTrendingGrievances = () => grievanceApi.get('/api/grievances/trending');

// Analytics
export const getCityMedian = (params) => analyticsApi.get('/city-median', { params });
export const getPlatformTrends = () => analyticsApi.get('/platform-trends');
export const getIncomeDistribution = (params) => analyticsApi.get('/income-distribution', { params });
export const getVulnerabilityFlags = () => analyticsApi.get('/vulnerability-flags');
export const getCityOverview = () => analyticsApi.get('/city-overview');
export const getGlobalSummary = () => analyticsApi.get('/summary');

// Certificate
export const getCertificatePreview = (workerId) => certificateApi.get(`/api/certificate/preview/${workerId}`);
export const getCertificateUrl = (workerId, workerName) =>
  `${CERTIFICATE_URL}/api/certificate/generate/${workerId}?worker_name=${encodeURIComponent(workerName)}`;
