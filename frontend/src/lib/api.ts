import axios from 'axios';
import { useOrgStore } from '@/lib/stores/orgStore';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const { currentOrg } = useOrgStore.getState();
    if (currentOrg?.id) {
        // Backend expects org_id as a query param for most endpoints.
        config.params = {
            ...(config.params || {}),
            org_id: currentOrg.id,
        };

        // Document upload expects org_id as multipart/form-data.
        if (config.data instanceof FormData) {
            if (!config.data.has("org_id")) {
                config.data.append("org_id", currentOrg.id);
            }
        }

        // IMPORTANT: Do NOT inject org_id into JSON bodies.
        // Many FastAPI endpoints validate request bodies against strict schemas
        // that do not include org_id, which can cause 422s.
    }
    return config;
});

export default api;
