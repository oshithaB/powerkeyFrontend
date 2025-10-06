import React, { useEffect, useState } from 'react';
import { CreditCard, TrendingDown, Package, Truck } from 'lucide-react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import OrdersPage from './OrdersPage';
import { useCompany } from '../../contexts/CompanyContext';

export default function PurchasesPage() {
  const {selectedCompany} = useCompany();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalPurchases: 0,
    purchaseOrders: 0,
    vendors: 0,
    avgCost: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/stats/${selectedCompany?.company_id}`);
        console.log('Fetching stats for company:', selectedCompany?.company_id);
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching purchase stats:', error);
      }
    };
    fetchStats();
  }, []);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
        <div className="flex justify-between items-center">
          <button
              onClick={() => {
                  navigate('/purchase-orders');
              }}
              className="btn btn-primary btn-md"
          >
              <Plus className="h-4 w-4 mr-2" />
              Add Purchase Order
          </button>
        </div>
      </div>

      <div>
        {/* Overview Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-3">
          <div className="card">
            <div className="card-content p-6">
              <div className="flex items-center">
                <div className="bg-red-100 p-3 rounded-lg">
                  <CreditCard className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Purchases</p>
                  <p className="text-2xl font-bold text-gray-900">Rs. {stats.totalPurchases}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-content p-6">
              <div className="flex items-center">
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Package className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Purchase Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.purchaseOrders}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-content p-6">
              <div className="flex items-center">
                <div className="bg-indigo-100 p-3 rounded-lg">
                  <Truck className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Vendors</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.vendors}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <OrdersPage />
      </div>
      
    </div>
  );
}