import App from '@/App.vue';
import { registerPlugins } from '@core/utils/plugins';
import axios from "axios";
import { createApp } from 'vue';
// Styles
import '@core/scss/template/index.scss';
import '@layouts/styles/index.scss';
import ApiService from './services/ApiService';

// Create vue app
const app = createApp(App)

axios.defaults.withCredentials = true; // For saving tokens
axios.defaults.baseURL = 'http://127.0.0.1:8000/api/';


// Register plugins
registerPlugins(app)

ApiService.init(app)

// Mount vue app
app.mount('#app')

