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
  registration_number: string;
  terms_and_conditions?: string | null;
  notes?: string | null;
}


interface CompanyContextType {
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company | null) => void;
  companies: Company[];
  setCompanies: (companies: Company[]) => void;
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

  const value = {
    selectedCompany,
    setSelectedCompany,
    companies,
    setCompanies
  };

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}