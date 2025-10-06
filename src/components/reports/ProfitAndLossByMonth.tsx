import React, { useState, useEffect, useRef } from 'react';
import axiosInstance from '../../axiosInstance';
import { X, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useCompany } from '../../contexts/CompanyContext';

interface MonthlyData {
  month: number;
  month_name: string;
  income: {
    product_income: number;
    tax_income: number;
    discounts_given: number;
    total_income: number;
    net_income: number;
  };
  cost_of_sales: {
    cost_of_sales: number;
    inventory_shrinkage: number;
    total_cost_of_sales: number;
  };
  profitability: {
    gross_profit: number;
    gross_profit_margin: number;
  };
  invoice_count: number;
}

interface ProfitAndLossData {
  year: number;
  company_id: string;
  monthly_breakdown: MonthlyData[];
  summary: {
    total_inventory_shrinkage: number;
  };
}

const ProfitAndLossByMonth: React.FC = () => {
  const { selectedCompany } = useCompany();
  const [data, setData] = useState<ProfitAndLossData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const fetchMonthlyProfitAndLossData = async (year: number) => {
    if (!selectedCompany?.company_id) {
      setError('No company selected');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get(`/api/monthly-profit-and-loss/${selectedCompany.company_id}/${year}`);
      
      if (response.data?.data) {
        setData(response.data.data);
      } else {
        setData(null);
        setError('Invalid data format received from server');
      }
    } catch (err) {
      setError('Failed to fetch monthly profit and loss data. Please try again.');
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany?.company_id) {
      fetchMonthlyProfitAndLossData(selectedYear);
    }
  }, [selectedCompany?.company_id, selectedYear]);

  const formatCurrency = (value: number) => {
    const numValue = typeof value === 'number' ? value : 0;
    return new Intl.NumberFormat('en-LK', { 
      style: 'currency', 
      currency: 'LKR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numValue);
  };

  const safeGetValue = (monthly: MonthlyData, path: string): number => {
    try {
      const keys = path.split('.');
      let value: any = monthly;
      for (const key of keys) {
        value = value?.[key];
      }
      return typeof value === 'number' ? value : 0;
    } catch {
      return 0;
    }
  };

  const getTotal = (path: string) => {
    if (!data?.monthly_breakdown) return 0;
    return data.monthly_breakdown.reduce((total, monthly) => total + safeGetValue(monthly, path), 0);
  };

  const handlePrint = () => {
    if (!data || data.monthly_breakdown.length === 0) {
      alert('No data available to print');
      return;
    }
    setShowPrintPreview(true);
  };

  const handleDownloadPDF = async () => {
    if (!data || !data.monthly_breakdown.length) {
      alert('No data available to print');
      return;
    }
  
    try {
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const columnsPerPage = 7; // Account column + 6 month columns or total column on last page
      const totalPages = Math.ceil((data.monthly_breakdown.length + 1) / (columnsPerPage - 1)); // +1 for total column

      // Generate each page
      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        if (pageIndex > 0) {
          pdf.addPage();
        }

        const startMonthIndex = pageIndex * (columnsPerPage - 1);
        const endMonthIndex = Math.min(startMonthIndex + (columnsPerPage - 1), data.monthly_breakdown.length);
        const pageMonths = data.monthly_breakdown.slice(startMonthIndex, endMonthIndex);
        const showTotalColumn = pageIndex === totalPages - 1;

        // Create a temporary div for this page
        const tempDiv = document.createElement('div');
        tempDiv.style.width = '1200px';
        tempDiv.style.backgroundColor = '#ffffff';
        tempDiv.style.padding = '20px';
        
        // Generate HTML content for this page
        tempDiv.innerHTML = `
          <div style="margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
              <div>
                <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">Monthly Profit and Loss Report</h1>
                <h2 style="font-size: 18px; color: #666; margin-bottom: 8px;">Profit and Loss Summary</h2>
                <h2 style="font-size: 18px; color: #666; margin-bottom: 8px;">${selectedCompany?.name || 'Company Name'} (Pvt) Ltd.</h2>
                <p style="font-size: 12px; color: #666;">Year: ${data.year}</p>
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
                ${pageMonths.map(month => 
                  `<th style="background-color: #e2e8f0; padding: 8px; font-weight: bold; text-align: right; border: 1px solid #ccc; min-width: 120px;">${month.month_name}</th>`
                ).join('')}
                ${showTotalColumn ? 
                  `<th style="background-color: #e2e8f0; padding: 8px; font-weight: bold; text-align: right; border: 1px solid #ccc; min-width: 120px;">Total</th>` 
                  : ''}
              </tr>
            </thead>
            <tbody>
              ${generateTableRowsHTML(pageMonths, showTotalColumn)}
            </tbody>
          </table>
          
          <div style="border-top: 1px solid #ccc; padding-top: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <p style="font-size: 12px; color: #666;">Report generated at: ${new Date().toLocaleString()}</p>
              <p style="font-size: 12px; color: #666;">Monthly Profit and Loss Report</p>
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

      const filename = `monthly-profit-and-loss-${selectedYear}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      setShowPrintPreview(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };
  
  const generateTableRowsHTML = (pageMonths: MonthlyData[], showTotalColumn: boolean) => {
    const rows = [
      { label: 'Discounts given', getValue: (month: MonthlyData) => -safeGetValue(month, 'income.discounts_given') },
      { label: 'Product Income', getValue: (month: MonthlyData) => safeGetValue(month, 'income.product_income') },
      { label: 'Tax Income', getValue: (month: MonthlyData) => safeGetValue(month, 'income.tax_income') },
      { label: 'Total for Income', getValue: (month: MonthlyData) => safeGetValue(month, 'income.total_income'), isTotal: true },
      { label: 'Cost of Sales', getValue: (month: MonthlyData) => safeGetValue(month, 'cost_of_sales.cost_of_sales'), isCostSection: true },
      { label: 'Inventory Shrinkage', getValue: (month: MonthlyData) => safeGetValue(month, 'cost_of_sales.inventory_shrinkage'), isCostSection: true },
      { label: 'Total for Cost of Sales', getValue: (month: MonthlyData) => safeGetValue(month, 'cost_of_sales.total_cost_of_sales'), isTotal: true, isCostSection: true },
      { label: 'Gross Profit', getValue: (month: MonthlyData) => safeGetValue(month, 'profitability.gross_profit'), isTotal: true },
      { label: 'Other Income', getValue: () => 0 },
      { label: 'Expenses', getValue: () => 0 },
      { label: 'Other Expenses', getValue: () => 0 },
      { label: 'Net Earnings', getValue: (month: MonthlyData) => safeGetValue(month, 'profitability.gross_profit'), isFinal: true }
    ];

    return rows.map(row => {
      const cellStyle = `padding: 6px; border: 1px solid #ccc; text-align: ${row.label === 'Account' ? 'left' : 'right'}; ${
        row.isTotal || row.isFinal ? 'font-weight: bold;' : ''
      } ${row.isCostSection ? 'background-color: #f7fafc;' : ''} ${
        row.isFinal ? 'border-top: 2px solid #333;' : ''
      }`;

      const totalValue = data!.monthly_breakdown.reduce((sum, month) => sum + row.getValue(month), 0);

      return `
        <tr>
          <td style="${cellStyle}">${row.label}</td>
          ${pageMonths.map(month => 
            `<td style="${cellStyle}">${formatCurrency(row.getValue(month))}</td>`
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
      min-width: ${data ? (Math.max(data.monthly_breakdown.length * 150 + 200, 800)) : 800}px;
    }
    
    .scrollable-columns th, .scrollable-columns td {
      white-space: nowrap;
    }
  `;

  const renderTableRow = (label: string, getValue: (month: MonthlyData) => number, isTotal = false, sectionClass = '') => (
    <tr key={label}>
      <td className={`p-2 border-b ${isTotal ? 'font-bold' : 'font-medium'} ${sectionClass}`}>
        {label}
      </td>
      {data!.monthly_breakdown.map((month) => (
        <td key={month.month} className={`p-2 border-b text-right ${isTotal ? 'font-bold' : ''} ${sectionClass}`}>
          {formatCurrency(getValue(month))}
        </td>
      ))}
      <td className={`p-2 border-b text-right ${isTotal ? 'font-bold' : ''} ${sectionClass}`}>
        {formatCurrency(data!.monthly_breakdown.reduce((total, month) => total + getValue(month), 0))}
      </td>
    </tr>
  );

  // Generate year options (current year ± 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  if (!selectedCompany) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600">Please select a company to view monthly profit and loss data.</p>
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
              <h1 className="text-2xl font-bold mb-4">Monthly Profit and Loss Report</h1>
              <div className="flex space-x-2 items-end">
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600 mb-1">Select Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="border rounded-md p-2 w-32"
                  >
                    {yearOptions.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                
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
                <p className="text-sm text-gray-600">Year: {selectedYear}</p>
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
              
              {!loading && !error && (!data || data.monthly_breakdown.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  No data available for the selected year.
                </div>
              )}
              
              {!loading && !error && data && data.monthly_breakdown.length > 0 && (
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
                          <tr><td className="p-2 border-b font-medium w-48">Product Income</td></tr>
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
                            {data.monthly_breakdown.map((month) => (
                              <th key={month.month} 
                                  className="bg-gray-100 p-3 font-semibold text-lg border section-header text-right min-w-[120px]"
                                  style={{ 
                                    backgroundColor: '#e2e8f0', 
                                    WebkitPrintColorAdjust: 'exact', 
                                    colorAdjust: 'exact', 
                                    printColorAdjust: 'exact'
                                  }}>
                                {month.month_name}
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
                            {data.monthly_breakdown.map((month) => (
                              <td key={month.month} className="p-2 border-b text-right">
                                {formatCurrency(-safeGetValue(month, 'income.discounts_given'))}
                              </td>
                            ))}
                            <td className="p-2 border-b text-right">
                              {formatCurrency(getTotal('income.discounts_given') * -1)}
                            </td>
                          </tr>
                          <tr>
                            {data.monthly_breakdown.map((month) => (
                              <td key={month.month} className="p-2 border-b text-right">
                                {formatCurrency(safeGetValue(month, 'income.product_income'))}
                              </td>
                            ))}
                            <td className="p-2 border-b text-right">
                              {formatCurrency(getTotal('income.product_income'))}
                            </td>
                          </tr>
                          <tr>
                            {data.monthly_breakdown.map((month) => (
                              <td key={month.month} className="p-2 border-b text-right">
                                {formatCurrency(safeGetValue(month, 'income.tax_income'))}
                              </td>
                            ))}
                            <td className="p-2 border-b text-right">
                              {formatCurrency(getTotal('income.tax_income'))}
                            </td>
                          </tr>
                          <tr>
                            {data.monthly_breakdown.map((month) => (
                              <td key={month.month} className="p-2 border-b text-right font-bold">
                                {formatCurrency(safeGetValue(month, 'income.total_income'))}
                              </td>
                            ))}
                            <td className="p-2 border-b text-right font-bold">
                              {formatCurrency(getTotal('income.total_income'))}
                            </td>
                          </tr>
                          
                          {/* Cost of Sales Section */}
                          <tr>
                            {data.monthly_breakdown.map((month) => (
                              <td key={month.month} className="p-2 border-b text-right cost-section">
                                {formatCurrency(safeGetValue(month, 'cost_of_sales.cost_of_sales'))}
                              </td>
                            ))}
                            <td className="p-2 border-b text-right cost-section">
                              {formatCurrency(getTotal('cost_of_sales.cost_of_sales'))}
                            </td>
                          </tr>
                          <tr>
                            {data.monthly_breakdown.map((month) => (
                              <td key={month.month} className="p-2 border-b text-right cost-section">
                                {formatCurrency(safeGetValue(month, 'cost_of_sales.inventory_shrinkage'))}
                              </td>
                            ))}
                            <td className="p-2 border-b text-right cost-section">
                              {formatCurrency(getTotal('cost_of_sales.inventory_shrinkage'))}
                            </td>
                          </tr>
                          <tr>
                            {data.monthly_breakdown.map((month) => (
                              <td key={month.month} className="p-2 border-b text-right font-bold cost-section">
                                {formatCurrency(safeGetValue(month, 'cost_of_sales.total_cost_of_sales'))}
                              </td>
                            ))}
                            <td className="p-2 border-b text-right font-bold cost-section">
                              {formatCurrency(getTotal('cost_of_sales.total_cost_of_sales'))}
                            </td>
                          </tr>
                          
                          {/* Profit Section */}
                          <tr>
                            {data.monthly_breakdown.map((month) => (
                              <td key={month.month} className="p-2 border-b text-right font-bold">
                                {formatCurrency(safeGetValue(month, 'profitability.gross_profit'))}
                              </td>
                            ))}
                            <td className="p-2 border-b text-right font-bold">
                              {formatCurrency(getTotal('profitability.gross_profit'))}
                            </td>
                          </tr>
                          <tr>
                            {data.monthly_breakdown.map((month) => (
                              <td key={month.month} className="p-2 border-b text-right">
                                {formatCurrency(0)}
                              </td>
                            ))}
                            <td className="p-2 border-b text-right">
                              {formatCurrency(0)}
                            </td>
                          </tr>
                          <tr>
                            {data.monthly_breakdown.map((month) => (
                              <td key={month.month} className="p-2 border-b text-right">
                                {formatCurrency(0)}
                              </td>
                            ))}
                            <td className="p-2 border-b text-right">
                              {formatCurrency(0)}
                            </td>
                          </tr>
                          <tr>
                            {data.monthly_breakdown.map((month) => (
                              <td key={month.month} className="p-2 border-b text-right">
                                {formatCurrency(0)}
                              </td>
                            ))}
                            <td className="p-2 border-b text-right">
                              {formatCurrency(0)}
                            </td>
                          </tr>
                          
                          {/* Final Net Earnings */}
                          <tr>
                            {data.monthly_breakdown.map((month) => (
                              <td key={month.month} className="p-3 border-t-2 border-gray-800 font-bold text-right">
                                {formatCurrency(safeGetValue(month, 'profitability.gross_profit'))}
                              </td>
                            ))}
                            <td className="p-3 border-t-2 border-gray-800 font-bold text-right">
                              {formatCurrency(getTotal('profitability.gross_profit'))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Print Preview Modal */}
        {showPrintPreview && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-screen-xl shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-regular">Print Preview</h3>
              </div>
              
              <div ref={printRef} className="print-content bg-white p-6">
                <div className="mb-6 border-b pb-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h1 className="text-2xl font-bold mb-2">Monthly Profit and Loss Report</h1>
                      <h2 className="text-lg text-gray-600 mb-2">Profit and Loss Summary</h2>
                      <h2 className="text-lg text-gray-600 mb-2">{selectedCompany?.name || 'Company Name'} (Pvt) Ltd.</h2>
                      <p className="text-sm text-gray-600">Year: {data?.year}</p>
                    </div>
                    {selectedCompany?.company_logo && (
                      <img 
                        src={`http://localhost:3000${selectedCompany.company_logo}`}
                        alt={`${selectedCompany.name} Logo`}
                        className="h-20 w-auto max-w-xs object-contain"
                      />
                    )}
                  </div>
                </div>

                {data && data.monthly_breakdown.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse border">
                      <thead>
                        <tr>
                          <th className="section-header p-2 border font-bold text-left sticky left-0 bg-gray-100 z-10 min-w-[200px]">Account</th>
                          {data.monthly_breakdown.map((month) => (
                            <th key={month.month} className="section-header p-2 border font-bold text-right min-w-[120px] whitespace-nowrap">
                              {month.month_name}
                            </th>
                          ))}
                          <th className="section-header p-2 border font-bold text-right min-w-[120px] whitespace-nowrap">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Income Section */}
                        <tr>
                          <td className="p-2 border font-medium sticky left-0 bg-white z-10 min-w-[200px]">Discounts given</td>
                          {data.monthly_breakdown.map((month) => (
                            <td key={month.month} className="p-2 border text-right min-w-[120px] whitespace-nowrap">
                              {formatCurrency(-safeGetValue(month, 'income.discounts_given'))}
                            </td>
                          ))}
                          <td className="p-2 border text-right min-w-[120px] whitespace-nowrap">
                            {formatCurrency(getTotal('income.discounts_given') * -1)}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 border font-medium sticky left-0 bg-white z-10 min-w-[200px]">Product Income</td>
                          {data.monthly_breakdown.map((month) => (
                            <td key={month.month} className="p-2 border text-right min-w-[120px] whitespace-nowrap">
                              {formatCurrency(safeGetValue(month, 'income.product_income'))}
                            </td>
                          ))}
                          <td className="p-2 border text-right min-w-[120px] whitespace-nowrap">
                            {formatCurrency(getTotal('income.product_income'))}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 border font-medium sticky left-0 bg-white z-10 min-w-[200px]">Tax Income</td>
                          {data.monthly_breakdown.map((month) => (
                            <td key={month.month} className="p-2 border text-right min-w-[120px] whitespace-nowrap">
                              {formatCurrency(safeGetValue(month, 'income.tax_income'))}
                            </td>
                          ))}
                          <td className="p-2 border text-right min-w-[120px] whitespace-nowrap">
                            {formatCurrency(getTotal('income.tax_income'))}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 border font-bold sticky left-0 bg-white z-10 min-w-[200px]">Total for Income</td>
                          {data.monthly_breakdown.map((month) => (
                            <td key={month.month} className="p-2 border text-right font-bold min-w-[120px] whitespace-nowrap">
                              {formatCurrency(safeGetValue(month, 'income.total_income'))}
                            </td>
                          ))}
                          <td className="p-2 border text-right font-bold min-w-[120px] whitespace-nowrap">
                            {formatCurrency(getTotal('income.total_income'))}
                          </td>
                        </tr>
                        
                        {/* Cost of Sales Section */}
                        <tr>
                          <td className="p-2 border font-medium cost-section sticky left-0 bg-blue-50 z-10 min-w-[200px]">Cost of Sales</td>
                          {data.monthly_breakdown.map((month) => (
                            <td key={month.month} className="p-2 border text-right cost-section min-w-[120px] whitespace-nowrap">
                              {formatCurrency(safeGetValue(month, 'cost_of_sales.cost_of_sales'))}
                            </td>
                          ))}
                          <td className="p-2 border text-right cost-section min-w-[120px] whitespace-nowrap">
                            {formatCurrency(getTotal('cost_of_sales.cost_of_sales'))}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 border font-medium cost-section sticky left-0 bg-blue-50 z-10 min-w-[200px]">Inventory Shrinkage</td>
                          {data.monthly_breakdown.map((month) => (
                            <td key={month.month} className="p-2 border text-right cost-section min-w-[120px] whitespace-nowrap">
                              {formatCurrency(safeGetValue(month, 'cost_of_sales.inventory_shrinkage'))}
                            </td>
                          ))}
                          <td className="p-2 border text-right cost-section min-w-[120px] whitespace-nowrap">
                            {formatCurrency(getTotal('cost_of_sales.inventory_shrinkage'))}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 border font-bold cost-section sticky left-0 bg-blue-50 z-10 min-w-[200px]">Total for Cost of Sales</td>
                          {data.monthly_breakdown.map((month) => (
                            <td key={month.month} className="p-2 border text-right font-bold cost-section min-w-[120px] whitespace-nowrap">
                              {formatCurrency(safeGetValue(month, 'cost_of_sales.total_cost_of_sales'))}
                            </td>
                          ))}
                          <td className="p-2 border text-right font-bold cost-section min-w-[120px] whitespace-nowrap">
                            {formatCurrency(getTotal('cost_of_sales.total_cost_of_sales'))}
                          </td>
                        </tr>
                        
                        {/* Profit Section */}
                        <tr>
                          <td className="p-2 border font-bold sticky left-0 bg-white z-10 min-w-[200px]">Gross Profit</td>
                          {data.monthly_breakdown.map((month) => (
                            <td key={month.month} className="p-2 border text-right font-bold min-w-[120px] whitespace-nowrap">
                              {formatCurrency(safeGetValue(month, 'profitability.gross_profit'))}
                            </td>
                          ))}
                          <td className="p-2 border text-right font-bold min-w-[120px] whitespace-nowrap">
                            {formatCurrency(getTotal('profitability.gross_profit'))}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 border font-medium sticky left-0 bg-white z-10 min-w-[200px]">Other Income</td>
                          {data.monthly_breakdown.map((month) => (
                            <td key={month.month} className="p-2 border text-right min-w-[120px] whitespace-nowrap">
                              {formatCurrency(0)}
                            </td>
                          ))}
                          <td className="p-2 border text-right min-w-[120px] whitespace-nowrap">
                            {formatCurrency(0)}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 border font-medium sticky left-0 bg-white z-10 min-w-[200px]">Expenses</td>
                          {data.monthly_breakdown.map((month) => (
                            <td key={month.month} className="p-2 border text-right min-w-[120px] whitespace-nowrap">
                              {formatCurrency(0)}
                            </td>
                          ))}
                          <td className="p-2 border text-right min-w-[120px] whitespace-nowrap">
                            {formatCurrency(0)}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 border font-medium sticky left-0 bg-white z-10 min-w-[200px]">Other Expenses</td>
                          {data.monthly_breakdown.map((month) => (
                            <td key={month.month} className="p-2 border text-right min-w-[120px] whitespace-nowrap">
                              {formatCurrency(0)}
                            </td>
                          ))}
                          <td className="p-2 border text-right min-w-[120px] whitespace-nowrap">
                            {formatCurrency(0)}
                          </td>
                        </tr>
                        
                        {/* Final Net Earnings */}
                        <tr>
                          <td className="p-3 border-t-2 border-gray-800 font-bold sticky left-0 bg-white z-10 min-w-[200px]">Net Earnings</td>
                          {data.monthly_breakdown.map((month) => (
                            <td key={month.month} className="p-3 border-t-2 border-gray-800 font-bold text-right min-w-[120px] whitespace-nowrap">
                              {formatCurrency(safeGetValue(month, 'profitability.gross_profit'))}
                            </td>
                          ))}
                          <td className="p-3 border-t-2 border-gray-800 font-bold text-right min-w-[120px] whitespace-nowrap">
                            {formatCurrency(getTotal('profitability.gross_profit'))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                
                <div className="mt-6 border-t pt-4">
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <p>Report generated at: {new Date().toLocaleString()}</p>
                    <p>Monthly Profit and Loss Report</p>
                  </div>
                </div>

                <div className="flex space-x-2 float-right">
                  <button
                    onClick={handleDownloadPDF}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Download PDF
                  </button>

                  <button
                    onClick={() => setShowPrintPreview(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
};

export default ProfitAndLossByMonth;