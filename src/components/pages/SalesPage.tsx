import React, { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, Receipt, FileClock } from 'lucide-react';
import EstimatesPage from './EstimatesPage';
import InvoicesPage from './InvoicesPage';
import { useLocation } from 'react-router-dom';
import { useCompany } from '../../contexts/CompanyContext';
import axiosInstance from '../../axiosInstance';
import { PieChart, BarChart3, Activity } from 'lucide-react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [salesData, setSalesData] = useState({
    totalSales: 0,
    totalInvoices: 0,
    totalProformaInvoices: 0,
    growthPercentage: 0
  });
  const location = useLocation();
  const { selectedCompany } = useCompany();
  const [topSalespersons, setTopSalespersons] = useState<{ name: string; total_sales: number; total_invoices: number }[]>([]);
  const [topCustomers, setTopCustomers] = useState<{ name: string; email: string; purchase_count: number; total_spent: number }[]>([]);

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
    if (selectedCompany?.company_id) {
      fetchSalesData();
    }
  }, [location.state, selectedCompany?.company_id]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const salespersonsResponse = await axiosInstance.get(`api/top5Salespersons/${selectedCompany?.company_id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setTopSalespersons(salespersonsResponse.data.data);

        const customersResponse = await axiosInstance.get(`api/customerPurchaseFrequency/${selectedCompany?.company_id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setTopCustomers(customersResponse.data.data);
      } catch (error) {
        console.error('Error fetching chart data:', error);
      }
    };

    if (selectedCompany?.company_id) {
      fetchData();
    }
  }, [selectedCompany?.company_id]);

  const fetchSalesData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await axiosInstance.get(`/api/getSalesPageData/${selectedCompany?.company_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 200) {
        setSalesData(response.data);
      }

    } catch (error) {
      console.error('Error fetching sales data:', error);
    }
  };

  const normalizeRevenue = (revenue: number) => revenue / 100;


  const topSalespersonsData = {
    labels: topSalespersons.map((salesperson) => salesperson.name),
    datasets: [
      {
        label: 'Total Sales',
        data: topSalespersons.map((salesperson) => Number(salesperson.total_sales)),
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1,
        yAxisID: 'y',
      },
      {
        label: 'Total Invoices',
        data: topSalespersons.map((salesperson) => Number(salesperson.total_invoices)),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
        yAxisID: 'y1',
      },
    ],
  };

  const topCustomersData = {
    labels: topCustomers.map((customer) => customer.name),
    datasets: [
      {
        label: 'Purchase Count',
        data: topCustomers.map((customer) => Number(customer.purchase_count)),
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        fill: true,
        tension: 0.4,
        yAxisID: 'y',
      },
      {
        label: 'Total Spent (x100)',
        data: topCustomers.map((customer) => normalizeRevenue(Number(customer.total_spent))),
        borderColor: 'rgba(255, 206, 86, 1)',
        backgroundColor: 'rgba(255, 206, 86, 0.2)',
        fill: true,
        tension: 0.4,
        yAxisID: 'y1',
      },
    ],
  };

  // Chart Options for Top 5 Salespersons
  const salespersonsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const datasetLabel = context.dataset.label || '';
            const value = context.parsed.y;
            return `${datasetLabel}: ${value}`;
          },
        },
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Total Sales',
        },
        beginAtZero: true,
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Total Invoices',
        },
        beginAtZero: true,
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  // Chart Options for Top 5 Customers
  const customersChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const datasetLabel = context.dataset.label || '';
            const value = context.parsed.y;
            if (datasetLabel.includes('Spent')) {
              return `${datasetLabel}: ${(value * 100).toFixed(2)}`;
            }
            return `${datasetLabel}: ${value}`;
          },
        },
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Purchase Count',
        },
        beginAtZero: true,
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Total Spent (x100)',
        },
        beginAtZero: true,
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200" style={{marginTop: '-1px'}}>
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('estimates')}
            className={`${
              activeTab === 'estimates'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Estimates
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`${
              activeTab === 'invoices'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Invoices
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div>
          {/* Sales Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card">
              <div className="card-content p-6">
                <div className="flex items-center">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Sales</p>
                    <p className="text-2xl font-bold text-gray-900">Rs. {salesData.totalSales.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-content p-6">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Receipt className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Invoices</p>
                    <p className="text-2xl font-bold text-gray-900">{salesData.totalInvoices}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-content p-6">
                <div className="flex items-center">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <FileClock className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Proforma Invoices</p>
                    <p className="text-2xl font-bold text-gray-900">{salesData.totalProformaInvoices}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-content p-6">
                <div className="flex items-center">
                  <div className="bg-yellow-100 p-3 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Growth</p>
                    <p className={`text-2xl font-bold ${salesData.growthPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {salesData.growthPercentage >= 0 ? '+' : ''}{salesData.growthPercentage}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-7">
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold">Top 5 Salespersons</h2>
              </div>
              <div className="card-content">
                <div className="h-64">
                  {topSalespersons.length > 0 ? (
                    <Bar data={topSalespersonsData} options={salespersonsChartOptions} />
                  ) : (
                    <div className="h-64 flex items-center justify-center">
                      <div className="text-center">
                        <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-600">No data available</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold">Top 5 Customers</h2>
              </div>
              <div className="card-content">
                <div className="h-64">
                  {topCustomers.length > 0 ? (
                    <Line data={topCustomersData} options={customersChartOptions} />
                  ) : (
                    <div className="h-64 flex items-center justify-center">
                      <div className="text-center">
                        <PieChart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-600">No data available</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'estimates' && (
        <EstimatesPage />
      )}

      {activeTab === 'invoices' && (
        <InvoicesPage />
      )}
    </div>
  );
}