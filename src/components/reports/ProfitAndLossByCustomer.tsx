import React, { useState, useEffect, useRef } from 'react';
import axiosInstance from '../../axiosInstance';
import { X, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useCompany } from '../../contexts/CompanyContext';

interface ProfitAndLossData {
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  income: {
    sales_of_product_income: number;
    tax_income: number;
    discounts_given: number;
    total_income: number;
    net_income: number;
  };
  cost_of_sales: {
    cost_of_sales: number;
    total_cost_of_sales: number;
  };
  profitability: {
    gross_profit: number;
    net_earnings: number;
    gross_profit_margin: number;
    net_profit_margin: number;
  };
  cash_flow: {
    total_invoiced: number;
    total_paid: number;
    outstanding_balance: number;
    collection_rate: number;
  };
}

const ProfitAndLossByCustomer: React.FC = () => {
  const { selectedCompany } = useCompany();
  const [data, setData] = useState<ProfitAndLossData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [filter, setFilter] = useState<string>('year');
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const [inventoryShrinkage, setInventoryShrinkage] = useState<number>(0);
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isCustomRange, setIsCustomRange] = useState(false);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  const fetchProfitAndLossData = async (startDate?: string, endDate?: string) => {
    if (!selectedCompany?.company_id) {
      setError('No company selected');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [profitResponse, shrinkageResponse] = await Promise.all([
        axiosInstance.get(`/api/profit-and-loss-all-customers/${selectedCompany.company_id}`, {
          params: { start_date: startDate, end_date: endDate }
        }),
        axiosInstance.get(`/api/inventory-shrinkage/${selectedCompany.company_id}`)
      ]);
      
      // Validate response structure
      if (profitResponse.data?.data?.customers && Array.isArray(profitResponse.data.data.customers)) {
        setData(profitResponse.data.data.customers);
        setInventoryShrinkage(shrinkageResponse.data?.data?.inventory_shrinkage || 0);
      } else {
        setData([]);
        setError('Invalid data format received from server');
      }
    } catch (err) {
      setError('Failed to fetch profit and loss data. Please try again.');
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany?.company_id) {
      if (isCustomRange) {
        return;
      }
      
      const today = new Date();
      let startDate: string | undefined;
      let endDate: string = today.toISOString().split('T')[0];
  
      if (filter === 'week') {
        startDate = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0];
      } else if (filter === 'month') {
        startDate = new Date(today.setMonth(today.getMonth() - 1)).toISOString().split('T')[0];
      } else if (filter === 'year') {
        startDate = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
      }
  
      fetchProfitAndLossData(startDate, endDate);
    }
  }, [selectedCompany?.company_id, filter, isCustomRange]);

  const formatCurrency = (value: number) => {
    // Handle null/undefined values
    const numValue = typeof value === 'number' ? value : 0;
    return new Intl.NumberFormat('en-LK', { 
      style: 'currency', 
      currency: 'LKR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numValue);
  };

  const safeGetValue = (customer: ProfitAndLossData, path: string): number => {
    try {
      const keys = path.split('.');
      let value: any = customer;
      for (const key of keys) {
        value = value?.[key];
      }
      return typeof value === 'number' ? value : 0;
    } catch {
      return 0;
    }
  };

  const getTotal = (path: string) => {
    return data.reduce((total, customer) => total + safeGetValue(customer, path), 0);
  };

  const handleCustomerClick = (customerId: string) => {
    navigate(`/reports/profit-and-loss-by-customer/${customerId}`);
  };

  const handlePrint = () => {
    if (data.length === 0) {
      alert('No data available to print');
      return;
    }
    setShowPrintPreview(true);
  };

  const handleDownloadPDF = async () => {
    if (!data.length) {
      alert('No data available to print');
      return;
    }
  
    try {
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const columnsPerPage = 5; // Account column + 4 customer columns + total column on last page
      const totalPages = Math.ceil((data.length + 1) / columnsPerPage); // +1 for total column
  
      // Generate each page
      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        if (pageIndex > 0) {
          pdf.addPage();
        }
  
        const startCustomerIndex = pageIndex * (columnsPerPage - 1);
        const endCustomerIndex = Math.min(startCustomerIndex + (columnsPerPage - 1), data.length);
        const pageCustomers = data.slice(startCustomerIndex, endCustomerIndex);
        const showTotalColumn = pageIndex === totalPages - 1;
  
        // Create a temporary div for this page
        const tempDiv = document.createElement('div');
        tempDiv.style.width = '1200px';
        tempDiv.style.backgroundColor = '#ffffff';
        tempDiv.style.padding = '20px';
        
        // Generate HTML content for this page with company logo
        tempDiv.innerHTML = `
          <div style="margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
              <div>
                <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">Profit and Loss by Customer</h1>
                <h2 style="font-size: 18px; color: #666; margin-bottom: 8px;">Profit and Loss Summary</h2>
                <h2 style="font-size: 18px; color: #666; margin-bottom: 8px;">${selectedCompany?.name || 'Company Name'} (Pvt) Ltd.</h2>
                <p style="font-size: 12px; color: #666;">
                  ${isCustomRange 
                    ? `Period: ${startDate} to ${endDate}` 
                    : filter === 'week' ? 'Last 7 Days' : filter === 'month' ? 'Last 30 Days' : filter === 'year' ? `January 1 - December 31, ${new Date().getFullYear()}` : ''
                  }
                </p>
              </div>
              ${selectedCompany?.company_logo ? `
                <img src="http://localhost:3000${selectedCompany.company_logo}" alt="${selectedCompany.name} Logo" 
                     style="height: 100px; width: auto; max-width: 500px; object-fit: contain;" />
              ` : ''}
            </div>
            <p style="font-size: 10px; color: #666; margin-top: 10px;">Page ${pageIndex + 1} of ${totalPages}</p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr>
                <th style="background-color: #e2e8f0; padding: 8px; font-weight: bold; text-align: left; border: 1px solid #ccc; width: 200px;">Account</th>
                ${pageCustomers.map(customer => 
                  `<th style="background-color: #e2e8f0; padding: 8px; font-weight: bold; text-align: right; border: 1px solid #ccc; min-width: 120px;">${customer.customer.name}</th>`
                ).join('')}
                ${showTotalColumn ? 
                  `<th style="background-color: #e2e8f0; padding: 8px; font-weight: bold; text-align: right; border: 1px solid #ccc; min-width: 120px;">Total</th>` 
                  : ''}
              </tr>
            </thead>
            <tbody>
              ${generateTableRowsHTML(pageCustomers, showTotalColumn)}
            </tbody>
          </table>
          
          <div style="border-top: 1px solid #ccc; padding-top: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <p style="font-size: 12px; color: #666;">Report generated at: ${new Date().toLocaleString()}</p>
              <p style="font-size: 12px; color: #666;">Profit and Loss by Customer</p>
            </div>
          </div>
        `;
  
        document.body.appendChild(tempDiv);
  
        // Convert to canvas
        const canvas = await html2canvas(tempDiv, {
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: '#ffffff',
        });
  
        document.body.removeChild(tempDiv);
  
        // Add to PDF
        const imgData = canvas.toDataURL('image/png', 0.95);
        const imgProps = pdf.getImageProperties(imgData);
        const imgWidth = pageWidth - 2 * margin;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
  
        pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, Math.min(imgHeight, pageHeight - 2 * margin));
      }
  
      const filename = `profit-and-loss-by-customer-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      setShowPrintPreview(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };
  
  const generateTableRowsHTML = (pageCustomers: any[], showTotalColumn: boolean) => {
    const rows = [
      { label: 'Discounts given', getValue: (customer: any) => -safeGetValue(customer, 'income.discounts_given') },
      { label: 'Sales of Product Income', getValue: (customer: any) => safeGetValue(customer, 'income.sales_of_product_income') },
      { label: 'Tax Income', getValue: (customer: any) => safeGetValue(customer, 'income.tax_income') },
      { label: 'Total for Income', getValue: (customer: any) => safeGetValue(customer, 'income.total_income'), isTotal: true },
      { label: 'Cost of Sales', getValue: (customer: any) => safeGetValue(customer, 'cost_of_sales.cost_of_sales'), isCostSection: true },
      { label: 'Inventory Shrinkage', getValue: () => 0, isInventory: true, isCostSection: true },
      { label: 'Total for Cost of Sales', getValue: (customer: any) => safeGetValue(customer, 'cost_of_sales.total_cost_of_sales'), isTotal: true, isCostSection: true },
      { label: 'Gross Profit', getValue: (customer: any) => safeGetValue(customer, 'profitability.gross_profit'), isTotal: true },
      { label: 'Other Income', getValue: () => 0 },
      { label: 'Expenses', getValue: () => 0 },
      { label: 'Other Expenses', getValue: () => 0 },
      { label: 'Net Earnings', getValue: (customer: any) => safeGetValue(customer, 'profitability.net_earnings'), isFinal: true }
    ];
  
    return rows.map(row => {
      const cellStyle = `padding: 6px; border: 1px solid #ccc; text-align: ${row.label === 'Account' ? 'left' : 'right'}; ${
        row.isTotal || row.isFinal ? 'font-weight: bold;' : ''
      } ${row.isCostSection ? 'background-color: #f7fafc;' : ''} ${
        row.isFinal ? 'border-top: 2px solid #333;' : ''
      }`;
  
      let totalValue = 0;
      if (row.isInventory) {
        totalValue = inventoryShrinkage;
      } else if (row.label === 'Total for Cost of Sales') {
        totalValue = data.reduce((sum, customer) => sum + row.getValue(customer), 0) + inventoryShrinkage;
      } else if (row.label === 'Net Earnings') {
        totalValue = data.reduce((sum, customer) => sum + row.getValue(customer), 0) - inventoryShrinkage;
      } else {
        totalValue = data.reduce((sum, customer) => sum + row.getValue(customer), 0);
      }
  
      return `
        <tr>
          <td style="${cellStyle}">${row.label}</td>
          ${pageCustomers.map(customer => 
            `<td style="${cellStyle}">${formatCurrency(row.isInventory ? 0 : row.getValue(customer))}</td>`
          ).join('')}
          ${showTotalColumn ? 
            `<td style="${cellStyle}">${formatCurrency(totalValue)}</td>` 
            : ''}
        </tr>
      `;
    }).join('');
  };

  const printStyles = `
    @media print {
      .section-header {
        background-color: #e2e8f0 !important;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .cost-section {
        background-color: #f7fafc !important;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      table {
        page-break-inside: avoid;
      }
      tr {
        page-break-inside: avoid;
      }
    }
    .cost-section {
      background-color: #f7fafc;
    }
    
    /* Fixed column styles */
    .table-container {
      position: relative;
      overflow-x: auto;
      max-width: 100%;
    }
    
    .fixed-table {
      display: flex;
    }
    
    .fixed-column {
      position: sticky;
      left: 0;
      z-index: 10;
      background: white;
      border-right: 2px solid #e2e8f0;
    }
    
    .scrollable-columns {
      overflow-x: auto;
      flex: 1;
      scrollbar-width: auto;
      scrollbar-color: #d1d5db #f3f4f6;
    }
    
    .scrollable-columns::-webkit-scrollbar {
      height: 8px;
    }
    
    .scrollable-columns::-webkit-scrollbar-track {
      background: #f3f4f6;
    }
    
    .scrollable-columns::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 4px;
    }
    
    .scrollable-columns::-webkit-scrollbar-thumb:hover {
      background: #9ca3af;
    }
    .scrollable-columns table {
      border-collapse: separate;
      border-spacing: 0;
      min-width: ${(data.length + 1) + 200}px; /* Ensure table width exceeds viewport for scrolling */
    }
    
    .scrollable-column th {
      border-right: none;
      width: 100%
    }

    .scrollable-columns th, td {
      white-space: nowrap; /* Prevent employee names from wrapping */
    }
  `;

  const renderTableRow = (label: string, getValue: (emp: ProfitAndLossData) => number, isTotal = false, isSection = false, sectionClass = '') => (
    <tr key={label}>
      <td className={`p-2 border-b ${isTotal ? 'font-bold' : 'font-medium'} ${sectionClass}`}>
        {label}
      </td>
      {data.map((customer) => (
        <td key={customer.customer.id} className={`p-2 border-b text-right ${isTotal ? 'font-bold' : ''} ${sectionClass}`}>
          {formatCurrency(getValue(customer))}
        </td>
      ))}
      <td className={`p-2 border-b text-right ${isTotal ? 'font-bold' : ''} ${sectionClass}`}>
        {formatCurrency(data.reduce((total, emp) => total + getValue(emp), 0))}
      </td>
    </tr>
  );

  if (!selectedCompany) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600">Please select a company to view profit and loss data.</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto px-4 py-8">
          <div className="relative top-4 mx-auto p-5 border w-full max-w-7xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold mb-4">Profit and Loss by Customer</h1>
              <div className="flex space-x-2 items-end">
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600 mb-1">Filter Period</label>
                  <select
                    value={isCustomRange ? 'custom' : filter}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'custom') {
                        setIsCustomRange(true);
                        setFilter('');
                      } else {
                        setIsCustomRange(false);
                        setFilter(value);
                        setStartDate('');
                        setEndDate('');
                      }
                    }}
                    className="border rounded-md p-2 w-40"
                  >
                    <option value="">Select Period</option>
                    <option value="week">Last Week</option>
                    <option value="month">Last Month</option>
                    <option value="year">Last Year</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
                
                {isCustomRange && (
                  <>
                    <div className="flex flex-col">
                      <label className="text-xs text-gray-600 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="border rounded-md p-2"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs text-gray-600 mb-1">End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="border rounded-md p-2"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (startDate && endDate) {
                          fetchProfitAndLossData(startDate, endDate);
                        }
                      }}
                      disabled={!startDate || !endDate}
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Apply
                    </button>
                  </>
                )}
                
                <button
                  onClick={handlePrint}
                  className="text-gray-400 hover:text-gray-600"
                  title="Print Report"
                >
                  <Printer className="h-6 w-6" />
                </button>
                <button
                  onClick={() => navigate(-1)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div id="print-content">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm font-medium">Profit and Loss Summary</p>
                {isCustomRange 
                  ? `Period: ${startDate} to ${endDate}` 
                  : filter === 'week' ? 'Last 7 Days' : filter === 'month' ? 'Last 30 Days' : filter === 'year' ? `January 1 - December 31, ${new Date().getFullYear()}` : ''
                }
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}
              
              {loading && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <p className="mt-2 text-gray-600">Loading data...</p>
                </div>
              )}
              
              {!loading && !error && data.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No data available for the selected period.
                </div>
              )}
              
              {!loading && !error && data.length > 0 && (
                <div className="table-container">
                  <div className="fixed-table">
                    {/* Fixed Account Column */}
                    <div className="fixed-column">
                      <table className="border-collapse">
                        <thead>
                          <tr>
                            <th className="bg-gray-100 p-3 font-semibold text-lg border section-header text-left w-48"
                                style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                              Account
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr><td className="p-2 border-b font-medium w-48">Discounts given</td></tr>
                          <tr><td className="p-2 border-b font-medium w-48">Sales of Product Income</td></tr>
                          <tr><td className="p-2 border-b font-medium w-48">Tax Income</td></tr>
                          <tr><td className="p-2 border-b font-bold w-48">Total for Income</td></tr>
                          <tr><td className="p-2 border-b font-medium cost-section w-48">Cost of Sales</td></tr>
                          <tr><td className="p-2 border-b font-medium cost-section w-48">Inventory Shrinkage</td></tr>
                          <tr><td className="p-2 border-b font-bold cost-section w-48">Total for Cost of Sales</td></tr>
                          <tr><td className="p-2 border-b font-bold w-48">Gross Profit</td></tr>
                          <tr><td className="p-2 border-b font-medium w-48">Other Income</td></tr>
                          <tr><td className="p-2 border-b font-medium w-48">Expenses</td></tr>
                          <tr><td className="p-2 border-b font-medium w-48">Other Expenses</td></tr>
                          <tr><td className="p-3 border-t-2 border-gray-800 font-bold w-48">Net Earnings</td></tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Scrollable Columns */}
                    <div className="scrollable-columns">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr>
                            {data.map((customer) => (
                              <th key={customer.customer.id} 
                                  onClick={() => handleCustomerClick(customer.customer.id)}
                                  className="bg-gray-100 p-3 font-semibold text-lg border section-header text-right min-w-[120px] cursor-pointer hover:underline"
                                  style={{ 
                                    backgroundColor: '#e2e8f0', 
                                    WebkitPrintColorAdjust: 'exact', 
                                    colorAdjust: 'exact', 
                                    printColorAdjust: 'exact'
                                  }}>
                                {customer.customer.name}
                              </th>
                            ))}
                            <th className="bg-gray-100 p-3 font-semibold text-lg border section-header text-right min-w-[120px]" 
                                style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Income Section */}
                          <tr>
                            {data.map((customer) => (
                              <td key={customer.customer.id} className="p-2 border-b text-right">
                                {formatCurrency(-safeGetValue(customer, 'income.discounts_given'))}
                              </td>
                            ))}
                            <td className="p-2 border-b text-right">
                              {formatCurrency(data.reduce((total, emp) => total + (-safeGetValue(emp, 'income.discounts_given')), 0))}
                            </td>
                          </tr>
                          <tr>
                            {data.map((customer) => (
                              <td key={customer.customer.id} className="p-2 border-b text-right">
                                {formatCurrency(safeGetValue(customer, 'income.sales_of_product_income'))}
                              </td>
                            ))}
                            <td className="p-2 border-b text-right">
                              {formatCurrency(data.reduce((total, emp) => total + safeGetValue(emp, 'income.sales_of_product_income'), 0))}
                            </td>
                          </tr>
                          <tr>
                            {data.map((customer) => (
                              <td key={customer.customer.id} className="p-2 border-b text-right">
                                {formatCurrency(safeGetValue(customer, 'income.tax_income'))}
                              </td>
                            ))}
                            <td className="p-2 border-b text-right">
                              {formatCurrency(data.reduce((total, emp) => total + safeGetValue(emp, 'income.tax_income'), 0))}
                            </td>
                          </tr>
                          <tr>
                            {data.map((customer) => (
                              <td key={customer.customer.id} className="p-2 border-b text-right font-bold">
                                {formatCurrency(safeGetValue(customer, 'income.total_income'))}
                              </td>
                            ))}
                            <td className="p-2 border-b text-right font-bold">
                              {formatCurrency(data.reduce((total, emp) => total + safeGetValue(emp, 'income.total_income'), 0))}
                            </td>
                          </tr>
                          
                          {/* Cost of Sales Section */}
                          <tr>
                            {data.map((customer) => (
                              <td key={customer.customer.id} className="p-2 border-b text-right cost-section">
                                {formatCurrency(safeGetValue(customer, 'cost_of_sales.cost_of_sales'))}
                              </td>
                            ))}
                            <td className="p-2 border-b text-right cost-section">
                              {formatCurrency(data.reduce((total, emp) => total + safeGetValue(emp, 'cost_of_sales.cost_of_sales'), 0))}
                            </td>
                          </tr>
                          <tr>
                            {data.map((customer) => (
                              <td key={customer.customer.id} className="p-2 border-b text-right cost-section">
                                {formatCurrency(0)}
                              </td>
                            ))}
                            <td className="p-2 border-b text-right cost-section">
                              {formatCurrency(inventoryShrinkage)}
                            </td>
                          </tr>
                          <tr>
                            {data.map((customer) => (
                              <td key={customer.customer.id} className="p-2 border-b text-right font-bold cost-section">
                                {formatCurrency(safeGetValue(customer, 'cost_of_sales.total_cost_of_sales'))}
                              </td>
                            ))}
                            <td className="p-2 border-b text-right font-bold cost-section">
                              {formatCurrency(getTotal('cost_of_sales.total_cost_of_sales') + inventoryShrinkage)}
                            </td>
                          </tr>
                          
                          {/* Profit Section */}
                          <tr>
                            {data.map((customer) => (
                              <td key={customer.customer.id} className="p-2 border-b text-right font-bold">
                                {formatCurrency(safeGetValue(customer, 'profitability.gross_profit'))}
                              </td>
                            ))}
                            <td className="p-2 border-b text-right font-bold">
                              {formatCurrency(data.reduce((total, emp) => total + safeGetValue(emp, 'profitability.gross_profit'), 0))}
                            </td>
                          </tr>
                          <tr>
                            {data.map((customer) => (
                              <td key={customer.customer.id} className="p-2 border-b text-right">
                                {formatCurrency(0)}
                              </td>
                            ))}
                            <td className="p-2 border-b text-right">
                              {formatCurrency(0)}
                            </td>
                          </tr>
                          <tr>
                            {data.map((customer) => (
                              <td key={customer.customer.id} className="p-2 border-b text-right">
                                {formatCurrency(0)}
                              </td>
                            ))}
                            <td className="p-2 border-b text-right">
                              {formatCurrency(0)}
                            </td>
                          </tr>
                          <tr>
                            {data.map((customer) => (
                              <td key={customer.customer.id} className="p-2 border-b text-right">
                                {formatCurrency(0)}
                              </td>
                            ))}
                            <td className="p-2 border-b text-right">
                              {formatCurrency(0)}
                            </td>
                          </tr>
                          
                          {/* Final Net Earnings */}
                          <tr>
                            {data.map((customer) => (
                              <td key={customer.customer.id} className="p-3 border-t-2 border-gray-800 font-bold text-right">
                                {formatCurrency(safeGetValue(customer, 'profitability.net_earnings'))}
                              </td>
                            ))}
                            <td className="p-3 border-t-2 border-gray-800 font-bold text-right">
                              {formatCurrency(getTotal('profitability.net_earnings') - inventoryShrinkage)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              
              <p className="text-sm mt-5 text-gray-600">
                Report generated at {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Print Preview Modal */}
      {showPrintPreview && data.length > 0 && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Print Preview - Profit and Loss by Customer
              </h3>
              <button
                onClick={() => setShowPrintPreview(false)}
                className="text-gray-400 hover:text-gray-600"
                title="Close Preview"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <div ref={printRef} className="p-8 bg-white text-gray-900">
                {/* Header */}
                <div className="flex justify-between items-start border-b pb-4 mb-6">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">Profit and Loss by Customer</h1>
                    <h2 className="text-xl text-gray-600 mb-2">Profit and Loss Summary</h2>
                    <h2 className="text-xl text-gray-600 mb-2">
                      {selectedCompany?.name || 'Company Name'} (Pvt) Ltd.
                    </h2>
                    <p className="text-sm text-gray-600">
                      Period: {formatDate(periodStart)} - {formatDate(periodEnd)}, {new Date(periodEnd).getFullYear()}
                    </p>
                  </div>

                  {selectedCompany?.company_logo && (
                    <img
                      src={`http://localhost:3000${selectedCompany.company_logo}`}
                      alt={`${selectedCompany.name} Logo`}
                      className="h-20 w-auto max-w-[200px] object-contain"
                    />
                  )}
                </div>

                {/* Report Content */}
                <table className="w-full border-collapse mb-6">
                  <thead>
                    <tr className='scrollable-columns'>
                      <th className="bg-gray-100 p-2 font-bold text-base border section-header text-left" 
                          style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        Account
                      </th>
                      {data.map((customer) => (
                        <th key={customer.customer.id} 
                            className="bg-gray-100 p-2 font-bold text-base border section-header text-right" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                          {customer.customer.name}
                        </th>
                      ))}
                      <th className="bg-gray-100 p-2 font-bold text-base border section-header text-right" 
                          style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Income Section */}
                    {renderTableRow('Discounts given', (emp) => -safeGetValue(emp, 'income.discounts_given'))}
                    {renderTableRow('Sales of Product Income', (emp) => safeGetValue(emp, 'income.sales_of_product_income'))}
                    {renderTableRow('Tax Income', (emp) => safeGetValue(emp, 'income.tax_income'))}
                    {renderTableRow('Total for Income', (emp) => safeGetValue(emp, 'income.total_income'), true)}
                    
                    {/* Cost of Sales Section */}
                    {renderTableRow('Cost of Sales', (emp) => safeGetValue(emp, 'cost_of_sales.cost_of_sales'), false, true, 'cost-section')}
                    <tr>
                      <td className="p-2 border-b font-medium cost-section">Inventory Shrinkage</td>
                      {data.map((customer) => (
                        <td key={customer.customer.id} className="p-2 border-b text-right cost-section">
                          {formatCurrency(0)}
                        </td>
                      ))}
                      <td className="p-2 border-b text-right cost-section">
                        {formatCurrency(inventoryShrinkage)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b font-bold cost-section">Total for Cost of Sales</td>
                      {data.map((customer) => (
                        <td key={customer.customer.id} className="p-2 border-b text-right font-bold cost-section">
                          {formatCurrency(safeGetValue(customer, 'cost_of_sales.total_cost_of_sales'))}
                        </td>
                      ))}
                      <td className="p-2 border-b text-right font-bold cost-section">
                        {formatCurrency(getTotal('cost_of_sales.total_cost_of_sales') + inventoryShrinkage)}
                      </td>
                    </tr>
                    
                    {/* Profit Section */}
                    {renderTableRow('Gross Profit', (emp) => safeGetValue(emp, 'profitability.gross_profit'), true)}
                    {renderTableRow('Other Income', () => 0)}
                    {renderTableRow('Expenses', () => 0)}
                    {renderTableRow('Other Expenses', () => 0)}
                    
                    {/* Final Net Earnings */}
                    <tr>
                      <td className="p-2 border-t-2 border-gray-800 font-bold">Net Earnings</td>
                      {data.map((customer) => (
                        <td key={customer.customer.id} className="p-2 border-t-2 border-gray-800 font-bold text-right">
                          {formatCurrency(safeGetValue(customer, 'profitability.net_earnings'))}
                        </td>
                      ))}
                      <td className="p-2 border-t-2 border-gray-800 font-bold text-right">
                        {formatCurrency(getTotal('profitability.net_earnings') - inventoryShrinkage)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Footer */}
                <div className="border-t pt-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">
                        Report generated at: {new Date().toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Profit and Loss by Customer
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => setShowPrintPreview(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleDownloadPDF}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfitAndLossByCustomer;