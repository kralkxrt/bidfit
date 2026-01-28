import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Organization {
    id: string;
    name: string;
    logo?: string;
}

interface OrgState {
    currentOrg: Organization | null;
    organizations: Organization[];
    setCurrentOrg: (org: Organization) => void;
    setOrganizations: (orgs: Organization[]) => void;
    fetchOrganizations: () => Promise<void>;
}

export const useOrgStore = create<OrgState>()(
    persist(
        (set) => ({
            currentOrg: null,
            organizations: [],
            setCurrentOrg: (org) => set({ currentOrg: org }),
            setOrganizations: (orgs) => set({ organizations: orgs }),
            fetchOrganizations: async () => {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                const response = await fetch(`${apiUrl}/api/companies`);
                if (!response.ok) {
                    throw new Error("Failed to fetch organizations");
                }
                const organizations = await response.json();
                set({ organizations });
                set((state) => {
                    if (!organizations.length) {
                        return { currentOrg: null };
                    }
                    const isValid = state.currentOrg && organizations.some((org: Organization) => org.id === state.currentOrg?.id);
                    return { currentOrg: isValid ? state.currentOrg : organizations[0] };
                });
            },
        }),
        { name: "bidwin-org" }
    )
);
