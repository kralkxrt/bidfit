import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

export interface Company {
    id: string;
    name: string;
    website?: string;
    linkedin_url?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    country?: string;

    // Extended Info
    employee_count?: number;
    founded_year?: number;
    description?: string;

    // GovCon
    uei?: string;
    cage_code?: string;
    business_size?: string;
    certifications?: string[];
    certification_details?: Record<string, unknown>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gsa_schedules?: any[];
    contract_vehicles?: string[];

    naics_codes?: string[];
    primary_naic_code?: string;
    service_areas?: string[];
    facility_clearance?: string;
    geographic_coverage?: string[];

    annual_revenue?: number;
    bonding_capacity?: number;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    teaming_partners?: any[];
    typical_role?: string;
}

interface CompanyState {
    companies: Company[];
    selectedCompanyId: string | null;
    isLoading: boolean;
    error: string | null;

    fetchCompanies: () => Promise<void>;
    addCompany: (name: string) => Promise<void>;
    updateCompany: (id: string, data: Partial<Company>) => Promise<void>;
    removeCompany: (id: string) => Promise<void>;
    selectCompany: (id: string) => void;
    getSelectedCompany: () => Company | undefined;

    // Hydration
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
}

export const useCompanyStore = create<CompanyState>()(
    persist(
        (set, get) => ({
            companies: [],
            selectedCompanyId: null,
            isLoading: false,
            error: null,
            _hasHydrated: false,

            setHasHydrated: (state) => {
                set({
                    _hasHydrated: state
                });
            },

            fetchCompanies: async () => {
                set({ isLoading: true, error: null });
                try {
                    const response = await api.get('/api/companies');
                    const companies = response.data;
                    set({ companies, isLoading: false });

                    // Auto-select first company if none selected or selection invalid
                    const { selectedCompanyId } = get();
                    if (companies.length > 0) {
                        const isValid = companies.find((c: Company) => c.id === selectedCompanyId);
                        if (!selectedCompanyId || !isValid) {
                            set({ selectedCompanyId: companies[0].id });
                        }
                    }
                } catch (error: unknown) {
                    console.error('Failed to fetch companies:', error);
                    const message = error instanceof Error ? error.message : 'Failed to fetch companies';
                    set({
                        error: message,
                        isLoading: false
                    });
                }
            },

            addCompany: async (name: string) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await api.post('/api/companies/', { name });
                    const newCompany = response.data;

                    // Add to list and select it
                    const { companies } = get();
                    set({
                        companies: [...companies, newCompany],
                        selectedCompanyId: newCompany.id,
                        isLoading: false
                    });
                } catch (error: unknown) {
                    console.error('Failed to add company:', error);
                    const message = error instanceof Error ? error.message : 'Failed to add company';
                    set({
                        error: message,
                        isLoading: false
                    });
                    throw error;
                }
            },

            updateCompany: async (id: string, data: Partial<Company>) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await api.patch(`/api/companies/${id}`, data);
                    const updatedCompany = response.data;

                    const { companies } = get();
                    const updatedList = companies.map(c => c.id === id ? updatedCompany : c);

                    set({
                        companies: updatedList,
                        isLoading: false
                    });
                } catch (error: unknown) {
                    console.error('Failed to update company:', error);
                    const message = error instanceof Error ? error.message : 'Failed to update company';
                    set({
                        error: message,
                        isLoading: false
                    });
                    throw error;
                }
            },

            removeCompany: async (id: string) => {
                set({ isLoading: true, error: null });
                try {
                    await api.delete(`/api/companies/${id}`);

                    const { companies, selectedCompanyId } = get();
                    const updatedCompanies = companies.filter(c => c.id !== id);

                    // If we deleted the selected company, select another one or null
                    let newSelectedId = selectedCompanyId;
                    if (selectedCompanyId === id) {
                        newSelectedId = updatedCompanies.length > 0 ? updatedCompanies[0].id : null;
                    }

                    set({
                        companies: updatedCompanies,
                        selectedCompanyId: newSelectedId,
                        isLoading: false
                    });
                } catch (error: unknown) {
                    console.error('Failed to remove company:', error);
                    const message = error instanceof Error ? error.message : 'Failed to remove company';
                    set({
                        error: message,
                        isLoading: false
                    });
                    throw error;
                }
            },

            selectCompany: (id: string) => {
                set({ selectedCompanyId: id });
            },

            getSelectedCompany: () => {
                const { companies, selectedCompanyId } = get();
                return companies.find((c) => c.id === selectedCompanyId);
            }
        }),
        {
            name: 'pp-gap-analysis-company-store',
            partialize: (state) => ({ selectedCompanyId: state.selectedCompanyId }), // Only persist selection
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.setHasHydrated(true);
                }
            }
        }
    )
);
