import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, FileText, TrendingUp, Download, Star } from 'lucide-react';

export default function ReportsPage() {
  const navigate = useNavigate();
  const [favoriteReports, setFavoriteReports] = useState(() => {
    // Load favorite reports from localStorage on initial render
    const saved = localStorage.getItem('favoriteReports');
    return saved ? JSON.parse(saved) : [];
  });

  // Save favorite reports to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('favoriteReports', JSON.stringify(favoriteReports));
  }, [favoriteReports]);

  const reports = [
    {
      name: 'Sales Report',
      description: 'Detailed sales analysis and trends',
      icon: TrendingUp,
      color: 'bg-green-100 text-green-600'
    },
    {
      name: 'Financial Statement',
      description: 'Balance sheet and income statement',
      icon: FileText,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      name: 'Customer Report',
      description: 'Customer analysis and aging report',
      icon: BarChart3,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      name: 'Inventory Report',
      description: 'Stock levels and inventory valuation',
      icon: BarChart3,
      color: 'bg-orange-100 text-orange-600'
    }

  ];

  const businessOverviewReports = [
    {
      name: 'Profit & Loss',
      description: 'Current month P&L statement',
      path: '/reports/profit&loss'
    },
    {
      name: 'Balance Sheet',
      description: 'Cash flow statement',
      path: '/reports/balance-sheet'
    },
    {
      name: 'Profit & Loss By All Classes',
      description: 'P&L statement segmented by Employees',
      path: '/reports/profit&loss-by-class'
    },
    {
      name: 'Commissions Report',
      description: 'Commission details for sales persons',
      path: '/reports/commission'
    },
    {
      name: 'Profit & Loss By All Customer',
      description: 'P&L statement segmented by Customers',
      path: '/reports/profit&loss-by-customer'
    },
    {
      name: 'Profit & Loss By Month',
      description: 'Monthly P&L statement',
      path: '/reports/profit&loss-by-month'
    }
  ];

  const whoOwesYouReports = [
    {
      name: 'Accounts receivable ageing summary',
      description: 'Current month P&L statement',
      path: '/reports/ar-aging-summary'
    },
    {
      name: 'Customer Balance Summary',
      description: 'Outstanding balances by customer',
      path: '/reports/customer-balance-summary'
    },
    {
      name: 'Invoices and Received Payments',
      description: 'List of invoices and their payment status',
      path: '/reports/invoices-and-payments'
    },
    {
      name: 'Open Invoices',
      description: 'List of all open invoices',
      path: '/reports/open-invoices'
    },
    {
      name: 'Invoice List',
      description: 'List of all invoices',
      path: '/reports/invoice-list'
    }
  ];

  const salesAndCustomersReports = [
    {
      name: 'Sales by Employee Summary',
      description: 'Sales performance by employee',
      path: '/reports/sales'
    },
    {
      name: 'Sales by Customer Summary',
      description: 'Sales performance by customer',
      path: '/reports/sales-by-customer'
    },
    {
      name: 'Product/Service List',
      description: 'List of all products and services',
      path: '/reports/product-service-list'
    },
    {
      name: 'Customer Contact List',
      description: 'List of customer contacts details',
      path: '/reports/customer-contact-list'
    },
    {
      name: 'Sales by Product Summary',
      description: 'Sales performance by product/service',
      path: '/reports/sales-by-product'
    },
    {
      name: 'Income by Customer Summary',
      description: 'Income details by customer',
      path: '/reports/income-by-customer-summary'
    },
    {
      name: 'Deposit Detail',
      description: 'Details of all deposits made',
      path: '/reports/deposit-detail'
    },
    {
      name: 'Estimates by Customer',
      description: 'Estimates provided to each customer',
      path: '/reports/estimates-by-customer'
    },
    {
      name: 'Stock Take Worksheet',
      description: 'Worksheet for stock taking',
      path: '/reports/stock-take-worksheet'
    }

  ];

  const whatYouOweReports = [
    {
      name: 'Accounts Payable Ageing Summary',
      description: 'Summary of outstanding payables',
      path: '/reports/ap-aging-summary'
    },
    {
      name: 'Bills and Applied Payments',
      description: 'List of bills and their payment status',
      path: '/reports/bills-and-payments'
    },
    {
      name: 'Unpaid Bills',
      description: 'List of all unpaid bills',
      path: '/reports/unpaid-bills'
    },
    {
      name: 'Supplier Balance Summary',
      description: 'Outstanding balances by supplier',
      path: '/reports/supplier-balance-summary'
    }
  ];

  const expenseAndSuppliers = [
    {
      name: "Cheque Detail",
      description: "Details of all cheques issued",
      path: "/reports/cheque-detail"
    },
    {
      name: 'Purchases by Product/Service Summary',
      description: 'Purchases summary by product/service',
      path: '/reports/purchases-by-product-service'
    },
    {
      name: 'Purchases by Class Detail',
      description: 'Detailed purchases by class',
      path: '/reports/purchases-by-class-detail'
    },
    {
      name: 'Open Purchase Orders Detail',
      description: 'Details of all open purchase orders',
      path: '/reports/open-purchase-orders-detail'
    },
    {
      name: 'Open Purchase Order List',
      description: 'List of all open purchase orders',
      path: '/reports/open-purchase-orders-list'
    },
    {
      name: 'Purchase List',
      description: 'List of all purchases made',
      path: '/reports/purchase-list'
    },
    {
      name: 'Purchases by Supplier Summary',
      description: 'Purchases summary by supplier',
      path: '/reports/purchases-by-supplier'
    },
    {
      name: 'Supplier Contact List',
      description: 'List of supplier contacts details',
      path: '/reports/supplier-contact-list'
    },
    {
      name: 'Expense by Payee Summary',
      description: 'Expense summary by supplier',
      path: '/reports/expense-by-supplier'
    },
  ];

  const salesTax = [
    {
      name: 'SSCL(50%) - Tax Detail Report',
      description: 'Detailed report of SSCL tax collected at 50%',
      path: '/reports/sscl-50-tax-detail'
    },
    {
      name: 'SSCL(100%) - Tax Detail Report',
      description: 'Detailed report of SSCL tax collected at 100%',
      path: '/reports/sscl-tax-detail'
    },
    {
      name: 'VAT 18% - Tax Detail Report',
      description: 'Detailed report of VAT 18% tax collected',
      path: '/reports/vat-18-tax-detail'
    },
    // {
    //   name: 'SSCL (100%) - Tax Exception Report',
    //   description: 'Exceptions in SSCL tax collection',
    //   path: '/reports/sscl-tax-exception'
    // },
    // {
    //   name: 'VAT 18% - Tax Exception Report',
    //   description: 'Exceptions in VAT 18% tax collection',
    //   path: '/reports/vat-18-tax-exception'
    // },
    // {
    //   name: 'SSCL (100%) - Tax Summary Report',
    //   description: 'Summary of SSCL tax collected',
    //   path: '/reports/sscl-tax-summary'
    // },
    // {
    //   name: 'VAT 18% - Tax Summary Report',
    //   description: 'Summary of VAT 18% tax collected',
    //   path: '/reports/vat-18-tax-summary'
    // },
    // {
    //   name: 'Tax Liability Report',
    //   description: 'Overview of tax liabilities',
    //   path: '/reports/tax-liability'
    // },
    {
      name: 'Transaction Detail by Tax Code',
      description: 'Detailed transactions categorized by tax code',
      path: '/reports/transaction-detail-by-tax-code'
    }
  ];

  const employees = [
    {
      name: 'Employee Contact List',
      description: 'List of employee contacts details',
      path: '/reports/employee-contact-list'
    }
  ];

  const forMyAccountant = [
    {
      name: 'Recent Automatic Transactions',
      description: 'List of recent automatic transactions',
      path: '/reports/recent-automatic-transactions'
    },
  ]

  const toggleFavorite = (reportName) => {
    setFavoriteReports(prev => {
      if (prev.includes(reportName)) {
        return prev.filter(name => name !== reportName);
      }
      return [...prev, reportName];
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
      </div>

      {/* Report Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {reports.map((report) => (
          <div key={report.name} className="card hover:shadow-lg transition-shadow cursor-pointer">
            <div className="card-content p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${report.color}`}>
                  <report.icon className="h-6 w-6" />
                </div>
                <div className="flex space-x-2">
                  <Download className="h-5 w-5 text-gray-400" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {report.name}
              </h3>
              <p className="text-sm text-gray-600">
                {report.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Reports */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Quick Reports</h2>
        </div>
        <div className="card-content">
          {favoriteReports.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Quick Reports</h3>
              <p className="text-gray-600">
                Star a report to add it here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                ...reports,
                ...businessOverviewReports,
                ...whoOwesYouReports,
                ...salesAndCustomersReports,
                ...whatYouOweReports,
                ...expenseAndSuppliers,
                ...salesTax,
                ...employees,
                ...forMyAccountant]
                .filter(report => favoriteReports.includes(report.name))
                .map(report => (
                  <button 
                    key={report.name}
                    className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-left"
                    onClick={() => navigate('path' in report ? report.path : '/reports')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{report.name}</h4>
                      <Star 
                        className="h-5 w-5 text-yellow-400 fill-yellow-400 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(report.name);
                        }}
                      />
                    </div>
                    <p className="text-sm text-gray-600">{report.description}</p>
                  </button>
                ))
              }
            </div>
          )}
        </div>
      </div>

      {/* Business Overview */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Business Overview</h2>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {businessOverviewReports.map(report => (
              <button 
                key={report.name}
                className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-left"
                onClick={() => navigate(report.path)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{report.name}</h4>
                  <Star 
                    className={`h-5 w-5 cursor-pointer ${
                      favoriteReports.includes(report.name) 
                        ? 'text-yellow-400 fill-yellow-400' 
                        : 'text-gray-400'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(report.name);
                    }}
                  />
                </div>
                <p className="text-sm text-gray-600">{report.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Who Owes You */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Who Owes You</h2>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {whoOwesYouReports.map(report => (
              <button 
                key={report.name}
                className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-left"
                onClick={() => navigate(report.path)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{report.name}</h4>
                  <Star 
                    className={`h-5 w-5 cursor-pointer ${
                      favoriteReports.includes(report.name) 
                        ? 'text-yellow-400 fill-yellow-400' 
                        : 'text-gray-400'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(report.name);
                    }}
                  />
                </div>
                <p className="text-sm text-gray-600">{report.description}</p>
              </button>
            ))}
          </div>
        </div>

        
      </div>

      {/* Sales and Customers */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Sales and Customers</h2>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {salesAndCustomersReports.map(report => (
              <button 
                key={report.name}
                className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-left"
                onClick={() => navigate(report.path)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{report.name}</h4>
                  <Star 
                    className={`h-5 w-5 cursor-pointer ${
                      favoriteReports.includes(report.name) 
                        ? 'text-yellow-400 fill-yellow-400' 
                        : 'text-gray-400'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(report.name);
                    }}
                  />
                </div>
                <p className="text-sm text-gray-600">{report.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* What You Owe */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">What You Owe</h2>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {whatYouOweReports.map(report => (
              <button 
                key={report.name}
                className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-left"
                onClick={() => navigate(report.path)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{report.name}</h4>
                  <Star 
                    className={`h-5 w-5 cursor-pointer ${
                      favoriteReports.includes(report.name) 
                        ? 'text-yellow-400 fill-yellow-400' 
                        : 'text-gray-400'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(report.name);
                    }}
                  />
                </div>
                <p className="text-sm text-gray-600">{report.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Expense and Suppliers */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Expense and Suppliers</h2>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expenseAndSuppliers.map(report => (
              <button 
                key={report.name}
                className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-left"
                onClick={() => navigate(report.path)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{report.name}</h4>
                  <Star 
                    className={`h-5 w-5 cursor-pointer ${
                      favoriteReports.includes(report.name) 
                        ? 'text-yellow-400 fill-yellow-400' 
                        : 'text-gray-400'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(report.name);
                    }}
                  />
                </div>
                <p className="text-sm text-gray-600">{report.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sales Tax */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Sales Tax</h2>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {salesTax.map(report => (
              <button 
                key={report.name}
                className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-left"
                onClick={() => navigate(report.path)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{report.name}</h4>
                  <Star 
                    className={`h-5 w-5 cursor-pointer ${
                      favoriteReports.includes(report.name) 
                        ? 'text-yellow-400 fill-yellow-400' 
                        : 'text-gray-400'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(report.name);
                    }}
                  />
                </div>
                <p className="text-sm text-gray-600">{report.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Employees */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Employees</h2>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map(report => (
              <button 
                key={report.name}
                className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-left"
                onClick={() => navigate(report.path)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{report.name}</h4>
                  <Star 
                    className={`h-5 w-5 cursor-pointer ${
                      favoriteReports.includes(report.name) 
                        ? 'text-yellow-400 fill-yellow-400' 
                        : 'text-gray-400'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(report.name);
                    }}
                  />
                </div>
                <p className="text-sm text-gray-600">{report.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* For my Accountant */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">For My Accountant</h2>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {forMyAccountant.map(report => (
              <button 
                key={report.name}
                className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-left"
                onClick={() => navigate(report.path)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{report.name}</h4>
                  <Star 
                    className={`h-5 w-5 cursor-pointer ${
                      favoriteReports.includes(report.name) 
                        ? 'text-yellow-400 fill-yellow-400' 
                        : 'text-gray-400'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(report.name);
                    }}
                  />
                </div>
                <p className="text-sm text-gray-600">{report.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}