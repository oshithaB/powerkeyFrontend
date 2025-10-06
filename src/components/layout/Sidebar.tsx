import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  BarChart3, 
  Settings,
  X,
  Building2,
  Banknote,
  ShoppingCart,
  Truck,
  CreditCard,
  PieChart,
  Receipt,
  Folder,
} from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Customers', href: '/dashboard/customers', icon: Users },
  { name: 'Categories', href: '/dashboard/categories', icon: Folder },
  { name: 'Vendors', href: '/dashboard/vendors', icon: Truck },
  { name: 'Products', href: '/dashboard/products', icon: Package },
  { name: 'Expenses', href: '/dashboard/expenses', icon: Receipt },
  { name: 'Sales', href: '/dashboard/sales', icon: ShoppingCart },
  { name: 'Purchases', href: '/dashboard/purchases', icon: CreditCard },
  { name: 'Cheques', href: '/dashboard/cheques', icon: Banknote },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Analytics', href: '/dashboard/analytics', icon: PieChart },
  { name: 'Employees', href: '/dashboard/employees', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const location = useLocation();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const { hasNearDueCheques } = useNotification();

  return (
    <>
      {/* Mobile sidebar overlay */}
      {open && (
        <div className="relative z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-900/80" onClick={() => setOpen(false)} />
          <div className="fixed inset-0 flex">
            <div className="relative mr-16 flex w-full max-w-xs flex-1">
              <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                <button
                  type="button"
                  className="-m-2.5 p-2.5"
                  onClick={() => setOpen(false)}
                >
                  <span className="sr-only">Close sidebar</span>
                  <X className="h-6 w-6 text-white" aria-hidden="true" />
                </button>
              </div>
              <SidebarContent />
            </div>
          </div>
        </div>
      )}

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <SidebarContent />
      </div>
    </>
  );

  function SidebarContent() {
    return (
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-gray-200 px-6 pb-4">
        <div className="flex h-16 shrink-0 items-center">
          <div className="flex items-center gap-x-3">
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
            <span className="text-lg font-semibold text-gray-900">
              ERP System
            </span>
          </div>
        </div>
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation
                  .filter((item) => 
                    item.name !== 'Employees' || (user?.role === 'admin' && item.name === 'Employees')
                  )
                  .map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <li key={item.name} className="relative">
                        <Link
                          to={item.href}
                          className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                          onClick={() => setOpen(false)}
                        >
                          <item.icon className="h-5 w-5 mr-3" />
                          {item.name}
                          {item.name === 'Cheques' && hasNearDueCheques && (
                            <span className="absolute right-2 top-1/2 transform -translate-y-1/2 h-2 w-2 bg-red-500 rounded-full"></span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    );
  }
}