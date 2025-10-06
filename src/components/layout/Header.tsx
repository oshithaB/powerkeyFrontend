import React from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { Menu, Building2, LogOut, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

export default function Header({ setSidebarOpen }: HeaderProps) {
  const { selectedCompany, setSelectedCompany } = useCompany();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleCompanySwitch = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    selectedCompany && setSelectedCompany(null);
    navigate('/companies'); // Redirect to company selection page
    // Logic to handle company switch can be added here
  };

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-gray-200 lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {selectedCompany?.company_logo ? (
            <img
              src={`http://localhost:3000${selectedCompany.company_logo}`}
              alt={selectedCompany.name}
              className="h-8 w-8 rounded-lg object-cover"
            />
          ) : (
            <div className="h-8 w-8 bg-primary-100 rounded-lg flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary-600" />
            </div>
          )}
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {selectedCompany?.name}
            </h1>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-x-4 lg:gap-x-6">
          {/* Profile dropdown */}
          <div className="relative">
            <div className="flex items-center gap-x-4">
              <span className="text-sm font-medium text-gray-700">
                {user?.fullname}
                {user?.role ? ` (${user.role})` : ''}
              </span>
              <div className="flex items-center gap-x-2">
                <Link
                  to="/companies"
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => {handleCompanySwitch(e)}}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Switch Company
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setSelectedCompany(null);
                  }}
                  className="btn btn-secondary btn-sm text-red-600 hover:text-red-700"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}