import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const api = axios.create({
    baseURL: API_URL
});

// Interceptor para adicionar o token JWT (admin ou cliente)
// clientToken tem prioridade para evitar que token expirado de admin
// bloqueie requisições de cliente logado simultaneamente.
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('clientToken') || localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
