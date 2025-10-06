import React, { useState, useEffect, useRef } from 'react';
import axiosInstance from '../../../axiosInstance';
import { X, Printer, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useCompany } from '../../../contexts/CompanyContext';

interface EmployeeContactData {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

const EmployeeContactDetails: React.FC = () => {
  const { selectedCompany } = useCompany();
  const [data, setData] = useState<EmployeeContactData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [employeeFilter, setEmployeeFilter] = useState<string>('');
  const [employeeSuggestions, setEmployeeSuggestions] = useState<EmployeeContactData[]>([]);
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const fetchEmployeeContacts = async () => {
    if (!selectedCompany?.company_id) {
      setError('No company selected');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get(`/api/employee-contacts`);
      
      if (response.data?.data && Array.isArray(response.data.data)) {
        setData(response.data.data);
        setEmployeeSuggestions(response.data.data);
      } else {
        setData([]);
        setEmployeeSuggestions([]);
        setError('Invalid data format received from server');
      }
    } catch (err) {
      setError('Failed to fetch employee contact data. Please try again.');
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany?.company_id) {
      fetchEmployeeContacts();
    }
  }, [selectedCompany?.company_id]);

  const handleEmployeeSearch = (value: string) => {
    setEmployeeFilter(value);
    const filtered = data.filter(employee =>
      employee.name.toLowerCase().includes(value.toLowerCase())
    );
    setEmployeeSuggestions(filtered.length > 0 ? filtered : data);
  };

  const handlePrint = () => {
    if (employeeSuggestions.length === 0) {
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

      const filename = `employee-contact-details-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      setShowPrintPreview(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
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
                <h1 className="text-2xl font-bold mb-4">Employee Contact Details</h1>
              </div>
              <div className="flex space-x-2 items-end">
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600 mb-1">Search Employee</label>
                  <div className="relative">
                    <input
                      type="text"
                      className="border rounded-md p-2 w-40"
                      value={employeeFilter}
                      onChange={(e) => handleEmployeeSearch(e.target.value)}
                      placeholder="Search employees..."
                    />
                    {employeeFilter && employeeSuggestions.length > 0 && (
                      <ul className="absolute z-10 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto w-40 mt-1">
                        {employeeSuggestions.map((employee) => (
                          <li
                            key={employee.id}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => {
                              setEmployeeFilter(employee.name);
                              setEmployeeSuggestions([employee]);
                            }}
                          >
                            {employee.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
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
                <p className="text-sm font-medium">Employee Contact Details</p>
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
              
              {!loading && !error && employeeSuggestions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No employee contact data available.
                </div>
              )}
              
              {!loading && !error && employeeSuggestions.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-full">
                    <thead>
                      <tr>
                        <th className="bg-gray-100 p-3 font-semibold text-lg border section-header text-left" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                          Name
                        </th>
                        <th className="bg-gray-100 p-3 font-semibold text-lg border section-header text-left" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                          Email
                        </th>
                        <th className="bg-gray-100 p-3 font-semibold text-lg border section-header text-left" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                          Phone
                        </th>
                        <th className="bg-gray-100 p-3 font-semibold text-lg border section-header text-left" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                          Address
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeSuggestions.map((employee, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="p-2 border-b font-medium">
                            {employee.name}
                          </td>
                          <td className="p-2 border-b">
                            {employee.email}
                          </td>
                          <td className="p-2 border-b">
                            {employee.phone}
                          </td>
                          <td className="p-2 border-b">
                            {employee.address}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              <p className="text-sm mt-5 text-gray-600">
                Report generated at {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {showPrintPreview && employeeSuggestions.length > 0 && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Print Preview - Employee Contact Details
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
                    <h1 className="text-3xl font-bold mb-2">Employee Contact Details</h1>
                    <h2 className="text-xl text-gray-600 mb-2">Employee Contact Information</h2>
                  </div>
                </div>

                <table className="w-full border-collapse mb-6">
                  <thead>
                    <tr>
                      <th className="bg-gray-100 p-2 font-bold text-base border section-header text-left" 
                          style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        Name
                      </th>
                      <th className="bg-gray-100 p-2 font-bold text-base border section-header text-left" 
                          style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        Email
                      </th>
                      <th className="bg-gray-100 p-2 font-bold text-base border section-header text-left" 
                          style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        Phone
                      </th>
                      <th className="bg-gray-100 p-2 font-bold text-base border section-header text-left" 
                          style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        Address
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeSuggestions.map((employee, index) => (
                      <tr key={index}>
                        <td className="p-2 border-b font-medium">
                          {employee.name}
                        </td>
                        <td className="p-2 border-b">
                          {employee.email}
                        </td>
                        <td className="p-2 border-b">
                          {employee.phone}
                        </td>
                        <td className="p-2 border-b">
                          {employee.address}
                        </td>
                      </tr>
                    ))}
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
                        Employee Contact Details
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

export default EmployeeContactDetails;