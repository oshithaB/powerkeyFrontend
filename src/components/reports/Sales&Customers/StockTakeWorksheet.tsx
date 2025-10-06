import React, { useState, useEffect, useRef } from 'react';
import axiosInstance from '../../../axiosInstance';
import { X, Printer, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useCompany } from '../../../contexts/CompanyContext';

interface StockTakeData {
  id: number;
  product_name: string;
  description: string;
  quantity_on_hand: number;
  manual_count: number;
  reorder_level: number;
  category_name: string;
  preferred_vendor: string;
  cost_price: number;
}

const StockTakeWorksheet: React.FC = () => {
  const { selectedCompany } = useCompany();
  const [data, setData] = useState<StockTakeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [productFilter, setProductFilter] = useState<string>('');
  const [filteredData, setFilteredData] = useState<StockTakeData[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [tempManualCount, setTempManualCount] = useState<number>(0);
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const fetchStockTakeWorksheet = async () => {
    if (!selectedCompany?.company_id) {
      setError('No company selected');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get(`/api/stock-take-worksheet/${selectedCompany.company_id}`);
      console.log('API Response:', response.data);
      
      if (response.data?.data && Array.isArray(response.data.data)) {
        setData(response.data.data);
        setFilteredData(response.data.data);
        
        // Extract unique categories for filtering
        const categories = [...new Set(response.data.data.map((item: StockTakeData) => item.category_name).filter(Boolean))];
        setAvailableCategories(categories as string[]);
      } else {
        setData([]);
        setFilteredData([]);
        setAvailableCategories([]);
        setError('Invalid data format received from server');
      }
    } catch (err) {
      setError('Failed to fetch Stock Take Worksheet data. Please try again.');
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateManualCount = async (productId: number, newManualCount: number) => {
    try {
      const response = await axiosInstance.put(`/api/update-product-manual-count/${selectedCompany?.company_id}/${productId}`, {
        manual_count: newManualCount
      });
  
      if (response.status !== 200) {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
  
      // Update local state
      const updatedData = data.map(item =>
        item.id === productId ? { ...item, manual_count: newManualCount } : item
      );
      setData(updatedData);
      
      // Apply current filters to updated data
      applyFiltersToData(updatedData, productFilter, categoryFilter);
    } catch (error: any) {
      console.error('Error updating manual count:', {
        error: error.message,
        productId,
        response: error.response?.data,
        status: error.response?.status
      });
      alert(`Failed to update manual count for product ID ${productId}: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleManualCountEdit = (item: StockTakeData) => {
    setEditingId(item.id);
    setTempManualCount(item.manual_count);
  };

  const handleManualCountSave = async (productId: number) => {
    console.log('Saving manual count for productId:', productId);
    await updateManualCount(productId, tempManualCount);
    setEditingId(null);
    setTempManualCount(0);
  };

  const handleManualCountCancel = () => {
    setEditingId(null);
    setTempManualCount(0);
  };

  const handleManualCountKeyPress = (e: React.KeyboardEvent, productId: number) => {
    if (e.key === 'Enter') {
      handleManualCountSave(productId);
    } else if (e.key === 'Escape') {
      handleManualCountCancel();
    }
  };

  useEffect(() => {
    if (selectedCompany?.company_id) {
      fetchStockTakeWorksheet();
    }
  }, [selectedCompany?.company_id]);

  const handleProductSearch = (value: string) => {
    setProductFilter(value);
    applyFilters(value, categoryFilter);
  };

  const handleCategoryFilter = (value: string) => {
    setCategoryFilter(value);
    applyFilters(productFilter, value);
  };

  const applyFilters = (productSearch: string, categorySearch: string) => {
    applyFiltersToData(data, productSearch, categorySearch);
  };

  const applyFiltersToData = (dataToFilter: StockTakeData[], productSearch: string, categorySearch: string) => {
    let filtered = dataToFilter;

    if (productSearch.trim() !== '') {
      filtered = filtered.filter(item =>
        item.product_name.toLowerCase().includes(productSearch.toLowerCase())
      );
    }

    if (categorySearch !== '') {
      filtered = filtered.filter(item => item.category_name === categorySearch);
    }

    setFilteredData(filtered);
  };

  const clearFilters = () => {
    setProductFilter('');
    setCategoryFilter('');
    setFilteredData(data);
  };

  const handlePrint = () => {
    if (filteredData.length === 0) {
      alert('No data available to print');
      return;
    }
    setShowPrintPreview(true);
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) {
      alert('Print content not available');
      return;
    }

    try {
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const maxContentHeight = pageHeight - 2 * margin;

      const scale = 2;
      const canvas = await html2canvas(printRef.current, {
        scale,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff',
        windowWidth: printRef.current.scrollWidth,
        windowHeight: printRef.current.scrollHeight,
      });
      
      const imgData = canvas.toDataURL('image/png', 0.95);
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      const totalPages = Math.ceil(imgHeight / maxContentHeight);

      for (let i = 0; i < totalPages; i++) {
        if (i > 0) {
          pdf.addPage();
        }
        
        const srcY = i * maxContentHeight * (canvas.height / imgHeight);
        const pageContentHeight = Math.min(canvas.height - srcY, maxContentHeight * (canvas.height / imgHeight));
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = pageContentHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        if (tempCtx && pageContentHeight > 0) {
          tempCtx.imageSmoothingEnabled = true;
          tempCtx.imageSmoothingQuality = 'high';
          tempCtx.drawImage(canvas, 0, srcY, canvas.width, pageContentHeight, 0, 0, canvas.width, pageContentHeight);
          const pageImgData = tempCanvas.toDataURL('image/png', 0.95);
          pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, Math.min(imgHeight - (i * maxContentHeight), maxContentHeight));
        }
      }

      const filename = `stock-take-worksheet-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      setShowPrintPreview(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  // Calculate variance between system count and manual count
  const getVariance = (systemCount: number, manualCount: number) => {
    return manualCount - systemCount;
  };

  // Calculate shrinkage value (variance * cost price)
  const getShrinkageValue = (variance: number, costPrice: number) => {
    return variance * costPrice;
  };

  // Get variance color based on difference
  const getVarianceColor = (variance: number) => {
    if (variance === 0) return 'text-green-600';
    if (variance > 0) return 'text-blue-600';
    return 'text-red-600';
  };

  // Get shrinkage color based on variance
  const getShrinkageColor = (variance: number) => {
    if (variance === 0) return 'text-green-600';
    if (variance > 0) return 'text-blue-600';
    return 'text-red-600';
  };

  // Check if item needs reordering
  const needsReorder = (quantityOnHand: number, reorderLevel: number) => {
    return quantityOnHand <= reorderLevel;
  };

  const printStyles = `
    @media print {
      .section-header {
        background-color: #e2e8f0 !important;
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
  `;

  if (!selectedCompany) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600">Please select a company to view Stock Take Worksheet.</p>
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
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate(-1)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Go Back"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <h1 className="text-2xl font-bold mb-4">Stock Take Worksheet</h1>
              </div>
              <div className="flex space-x-2 items-end">
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600 mb-1">Search Product</label>
                  <input
                    type="text"
                    className="border rounded-md p-2 w-40"
                    value={productFilter}
                    onChange={(e) => handleProductSearch(e.target.value)}
                    placeholder="Search products..."
                  />
                </div>
                
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600 mb-1">Filter by Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => handleCategoryFilter(e.target.value)}
                    className="border rounded-md p-2 w-40"
                  >
                    <option value="">All Categories</option>
                    {availableCategories.map((category, index) => (
                      <option key={index} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                {(productFilter || categoryFilter) && (
                  <button
                    onClick={clearFilters}
                    className="bg-gray-500 text-white px-3 py-2 rounded-md hover:bg-gray-600 text-sm"
                  >
                    Clear
                  </button>
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
                <p className="text-sm font-medium">Stock Take Worksheet</p>
                <p className="text-sm text-gray-600">
                  Generated: {new Date().toLocaleDateString()}
                </p>
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
              
              {!loading && !error && filteredData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No stock data available.
                </div>
              )}
              
              {!loading && !error && filteredData.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-full">
                    <thead>
                      <tr>
                        <th className="bg-gray-100 p-3 font-semibold text-lg border section-header text-left" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                          Product Name
                        </th>
                        <th className="bg-gray-100 p-3 font-semibold text-lg border section-header text-left" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                          Category
                        </th>
                        <th className="bg-gray-100 p-3 font-semibold text-lg border section-header text-left" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                          Vendor
                        </th>
                        <th className="bg-gray-100 p-3 font-semibold text-lg border section-header text-right" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                          System Count
                        </th>
                        <th className="bg-gray-100 p-3 font-semibold text-lg border section-header text-right" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                          Manual Count
                        </th>
                        <th className="bg-gray-100 p-3 font-semibold text-lg border section-header text-right" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                          Variance
                        </th>
                        <th className="bg-gray-100 p-3 font-semibold text-lg border section-header text-right" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                          Shrinkage
                        </th>
                        <th className="bg-gray-100 p-3 font-semibold text-lg border section-header text-right" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                          Reorder Level
                        </th>
                        <th className="bg-gray-100 p-3 font-semibold text-lg border section-header text-center" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((item, index) => {
                        const variance = getVariance(item.quantity_on_hand, item.manual_count);
                        const shrinkageValue = getShrinkageValue(variance, item.cost_price);
                        const needsReordering = needsReorder(item.quantity_on_hand, item.reorder_level);
                        
                        return (
                          <tr key={index} className={`hover:bg-gray-50 ${needsReordering ? 'bg-yellow-50' : ''}`}>
                            <td className="p-2 border-b font-medium">
                              {item.product_name}
                            </td>
                            <td className="p-2 border-b">
                              {item.category_name || 'N/A'}
                            </td>
                            <td className="p-2 border-b">
                              {item.preferred_vendor || 'N/A'}
                            </td>
                            <td className="p-2 border-b text-right">
                              {item.quantity_on_hand}
                            </td>
                            <td className="p-2 border-b text-right">
                              {editingId === item.id ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    value={tempManualCount}
                                    onChange={(e) => setTempManualCount(parseInt(e.target.value) || 0)}
                                    onKeyDown={(e) => handleManualCountKeyPress(e, item.id)}
                                    className="w-16 px-1 py-1 text-right border rounded focus:outline-none focus:border-blue-500"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleManualCountSave(item.id)}
                                    className="text-green-600 hover:text-green-800 text-xs"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={handleManualCountCancel}
                                    className="text-red-600 hover:text-red-800 text-xs"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <span
                                  className="cursor-pointer font-medium hover:bg-gray-100 px-2 py-1 rounded"
                                  onClick={() => handleManualCountEdit(item)}
                                  title="Click to edit"
                                >
                                  {item.manual_count}
                                </span>
                              )}
                            </td>
                            <td className={`p-2 border-b text-right font-bold ${getVarianceColor(variance)}`}>
                              {variance > 0 ? '+' : ''}{variance}
                            </td>
                            <td className={`p-2 border-b text-right font-bold ${getShrinkageColor(variance)}`}>
                              {shrinkageValue > 0 ? '+' : ''}{shrinkageValue.toFixed(2)}
                            </td>
                            <td className="p-2 border-b text-right">
                              {item.reorder_level}
                            </td>
                            <td className="p-2 border-b text-center">
                              {needsReordering ? (
                                <span className="px-2 py-1 rounded-full text-xs font-medium text-orange-600 bg-orange-100">
                                  Reorder
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded-full text-xs font-medium text-green-600 bg-green-100">
                                  OK
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  <div className="mt-4 text-sm text-gray-600">
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 mr-2"></div>
                        <span>Items requiring reorder</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-red-600 font-bold mr-2">-</span>
                        <span>Negative variance/shrinkage (shortage)</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-blue-600 font-bold mr-2">+</span>
                        <span>Positive variance/shrinkage (overage)</span>
                      </div>
                      <div className="flex items-center">
                        <span className="mr-2">💡</span>
                        <span>Click manual count to edit</span>
                      </div>
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

      {showPrintPreview && filteredData.length > 0 && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Print Preview - Stock Take Worksheet
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
                <div className="flex justify-between items-start border-b pb-4 mb-6">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">Stock Take Worksheet</h1>
                    <h2 className="text-xl text-gray-600 mb-2">Inventory Count Verification</h2>
                    <h2 className="text-xl text-gray-600 mb-2">
                      {selectedCompany?.name || 'Company Name'} (Pvt) Ltd.
                    </h2>
                    <p className="text-sm text-gray-600">
                      Generated: {new Date().toLocaleDateString()}
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

                <table className="w-full border-collapse mb-6">
                  <thead>
                    <tr>
                      <th className="bg-gray-100 p-2 font-bold text-base border section-header text-left" 
                          style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        Product Name
                      </th>
                      <th className="bg-gray-100 p-2 font-bold text-base border section-header text-left" 
                          style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        Category
                      </th>
                      <th className="bg-gray-100 p-2 font-bold text-base border section-header text-right" 
                          style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        System Count
                      </th>
                      <th className="bg-gray-100 p-2 font-bold text-base border section-header text-right" 
                          style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        Manual Count
                      </th>
                      <th className="bg-gray-100 p-2 font-bold text-base border section-header text-right" 
                          style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        Variance
                      </th>
                      <th className="bg-gray-100 p-2 font-bold text-base border section-header text-right" 
                          style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        Shrinkage
                      </th>
                      <th className="bg-gray-100 p-2 font-bold text-base border section-header text-right" 
                          style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        Reorder Level
                      </th>
                      <th className="bg-gray-100 p-2 font-bold text-base border section-header text-center" 
                          style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item, index) => {
                      const variance = getVariance(item.quantity_on_hand, item.manual_count);
                      const shrinkageValue = getShrinkageValue(variance, item.cost_price);
                      const needsReordering = needsReorder(item.quantity_on_hand, item.reorder_level);
                      
                      return (
                        <tr key={index}>
                          <td className="p-2 border-b font-medium">
                            {item.product_name}
                          </td>
                          <td className="p-2 border-b">
                            {item.category_name || 'N/A'}
                          </td>
                          <td className="p-2 border-b text-right">
                            {item.quantity_on_hand}
                          </td>
                          <td className="p-2 border-b text-right font-medium">
                            {item.manual_count}
                          </td>
                          <td className="p-2 border-b text-right font-bold">
                            {variance > 0 ? '+' : ''}{variance}
                          </td>
                          <td className="p-2 border-b text-right font-bold">
                            {shrinkageValue > 0 ? '+' : ''}{shrinkageValue.toFixed(2)}
                          </td>
                          <td className="p-2 border-b text-right">
                            {item.reorder_level}
                          </td>
                          <td className="p-2 border-b text-center">
                            {needsReordering ? 'Reorder' : 'OK'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="border-t pt-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">
                        Report generated at: {new Date().toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Stock Take Worksheet
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

export default StockTakeWorksheet;