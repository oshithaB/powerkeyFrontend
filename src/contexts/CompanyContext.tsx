import React, { createContext, useContext, useState, useEffect } from 'react';

interface Company {
  company_id: number; // maps to company_id
  name: string;
  is_taxable: boolean; // maps from tinyint(1) → boolean
  tax_number?: string | null;
  company_logo?: string | null; // maps to company_logo
  address: string;
  contact_number: string; // maps to contact_number
  email_address?: string | null; // maps to email_address
  email?: string; // alias or additional field
  registration_number: string;
  terms_and_conditions?: string | null;
  notes?: string | null;
  invoice_prefix?: string;
  current_invoice_number?: number;
}


interface CompanyContextType {
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company | null) => void;
  companies: Company[];
  setCompanies: (companies: Company[]) => void;
  refreshCompany: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [selectedCompany, setSelectedCompanyState] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedCompany = sessionStorage.getItem('selectedCompany');
    if (savedCompany) {
      setSelectedCompanyState(JSON.parse(savedCompany));
    }
  }, []);

  const setSelectedCompany = (company: Company | null) => {
    setSelectedCompanyState(company);
    if (company) {
      sessionStorage.setItem('selectedCompany', JSON.stringify(company));
    } else {
      sessionStorage.removeItem('selectedCompany');
    }
  };

  const refreshCompany = async () => {
    // Logic to refresh company if needed, for example fetching from API if we had an API call here.
    // Since selectedCompany is primarily from session or login, maybe we just update it if we have an endpoint.
    // For now, let's assume we can't easily fetch without an ID or more context.
    // But SettingsPage calls it after update.
    // If we don't have an endpoint to fetch a single company by ID in this context easily (without circular deps or knowing the URL config),
    // we can at least provide a placeholder or try to fetch if we had the ID.
    // Actually, we can assume the user just wants to reload the data. 
    // Let's implement a basic fetch if we have an ID.
    if (selectedCompany?.company_id) {
      try {
        // We need axiosInstance, but assume it's available or use fetch? 
        // Importing axiosInstance might cause circular dep if axiosInstance uses context.
        // Let's use fetch.
        const token = localStorage.getItem('token');
        const response = await fetch(`http://147.79.115.89:3000/api/company/${selectedCompany.company_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setSelectedCompany(data);
        }
      } catch (e) {
        console.error("Failed to refresh company", e);
      }
    }
  };

  const value = {
    selectedCompany,
    setSelectedCompany,
    companies,
    setCompanies,
    refreshCompany
  };

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}