import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useCompany } from '../../contexts/CompanyContext';
import axiosInstance from '../../axiosInstance';

import DashboardHome from './DashboardHome';
import CustomersPage from '../pages/CustomersPage';
import VendorsPage from '../pages/VendorsPage';
import ProductsPage from '../pages/ProductsPage';
import EstimatesPage from '../pages/EstimatesPage';
import InvoicesPage from '../pages/InvoicesPage';
import ExpensesPage from '../pages/ExpensesPage';
import EmployeesPage from '../pages/EmployeesPage';
import SalesPage from '../pages/SalesPage';
import PurchasesPage from '../pages/PurchasesPage';
import AccountingPage from '../pages/AccountingPage';
import ChequesPage from '../pages/ChequesPage';
import ReportsPage from '../pages/ReportsPage';
import AnalyticsPage from '../pages/AnalyticsPage';
import SettingsPage from '../pages/SettingsPage';
import CategoryPage from '../pages/CategoryPage';
import OrdersPage from '../pages/OrdersPage';

export default function Dashboard() {
  const { selectedCompany } = useCompany();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedCompany) {
      fetchDashboardData();
    }
  }, [selectedCompany]);

  const fetchDashboardData = async () => {
    try {
      const response = await axiosInstance.get(`/api/dashboard/${selectedCompany?.company_id}`);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<DashboardHome data={dashboardData} />} />
      <Route path="/estimates" element={<EstimatesPage />} />
      <Route path="/invoices" element={<InvoicesPage />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/customers" element={<CustomersPage />} />
      <Route path="/categories" element={<CategoryPage />} />
      <Route path="/vendors" element={<VendorsPage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/expenses" element={<ExpensesPage />} />
      <Route path="/employees" element={<EmployeesPage />} />
      <Route path="/sales" element={<SalesPage />} />
      <Route path="/purchases" element={<PurchasesPage />} />
      <Route path="/accounting" element={<AccountingPage />} />
      <Route path="/cheques" element={<ChequesPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}