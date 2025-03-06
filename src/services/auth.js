import axios from 'axios'

export const login = async (credentials) => {
    await axios.get(`${import.meta.env.VITE_API_BASE_URL}/sanctum/csrf-cookie`, { withCredentials: true })
    return axios.post(`${import.meta.env.VITE_API_URL}/login`, credentials)
}

export const logout = () => {
    return axios.post('/logout')
}

export const getUser = () => {
    return axios.get('/api/user')
}
