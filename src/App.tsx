import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CompanyProvider, useCompany } from './contexts/CompanyContext';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import { SocketProvider } from './contexts/SocketContext';
import axiosInstance from './axiosInstance';

import Login from './components/auth/Login';
import CompanySelection from './components/company/CompanySelection';
import CreateCompany from './components/company/CreateCompany';
import Dashboard from './components/dashboard/Dashboard';
import Layout from './components/layout/Layout';
import useTokenExpirationCheck from './tokenExpirationCheckHook';

import CreateEstimate from './components/modals/CreateEstimate';
import EditEstimate from './components/modals/EditEstimate';
import CreateInvoice from './components/modals/CreateInvoice';
import EditInvoice from './components/modals/EditInvoice';
import InvoiceRecievedPayment from './components/modals/InvoiceReceivePaymentModal';
import BillReceivePaymentModal from './components/modals/billPayPaymentModal';
import PurchaseOrdersPage from './components/modals/PurchaseOrdersPage';
import EditPurchaseOrders from './components/modals/EditPurchaseOrders';
import CreateExpense from './components/modals/CreateExpense';
import EditExpense from './components/modals/EditExpense';
import CreateBill from './components/modals/CreateBill';
import CreateCheque from './components/modals/CreateCheque';
import EditCheques from './components/modals/EditCheques';

// Reports
import ProfitAndLossReport from './components/reports/ProfitAndLossReport';
import CommissionReport from './components/reports/CommissionReport';
import CommissionReportByEmployees from './components/reports/CommissionReportByEmployees';
import SalesReport from './components/reports/SalesReport';
import SalesReportByEmployees from './components/reports/SalesReportByEmployees';
import ProfitAndLossByClass from './components/reports/ProfitAndLossByClass';
import ProfitAndLossByClassInDetail from './components/reports/ProfitAndLossByClassInDetail';
import ProfitAndLossByCustomer from './components/reports/ProfitAndLossByCustomer';
import ProfitAndLossByCustomerInDetail from './components/reports/ProfitAndLossByCustomerInDetail';
import ProfitAndLossByMonth from './components/reports/ProfitAndLossByMonth';

// Sales & Customers Reports
import CustomerContactDetails from './components/reports/Sales&Customers/CustomerContactDetails';
import ProductAndServiceList from './components/reports/Sales&Customers/ProductAndServiceList';
import SalesbyCustomerSummary from './components/reports/Sales&Customers/SalesbyCustomerSummary';
import SalesbyCustomerDetail from './components/reports/Sales&Customers/SalesbyCustomerDetail';
import SalesbyProductSummary from './components/reports/Sales&Customers/SalesbyProductSummary';
import SalesbyProductDetail from './components/reports/Sales&Customers/SalesbyProductDetail';
import DepoistDetail from './components/reports/Sales&Customers/DepoistDetail';
import EstimatesbyCustomers from './components/reports/Sales&Customers/EstimatesbyCustomers';
import StockTakeWorksheet from './components/reports/Sales&Customers/StockTakeWorksheet';
import IncomeByCustomerSummary from './components/reports/Sales&Customers/IncomeByCustomerSummary';

// Who Owes You Reports
import ARAgingSummaryReport from './components/reports/WhoOwesYou/ARAgingSummaryReport';
import ARAgingSummaryInDetails from './components/reports/WhoOwesYou/ARAgingSummaryInDetails';
import InvoicesAndRecievePayments from './components/reports/WhoOwesYou/InvoicesAndRecievePayments';
import OpenInvoices from './components/reports/WhoOwesYou/OpenInvoices';
import InvoiceList from './components/reports/WhoOwesYou/InvoiceList';
import CustomerBalanceSummary from './components/reports/WhoOwesYou/CustomerBalanceSummary';
import CustomerBalanceDetail from './components/reports/WhoOwesYou/CustomerBalanceDetail';

// What you owe Reports
import APAgingSummaryReport from './components/reports/WhatYouOwe/APAgingSummaryReport';
import SupplierBalanceSummary from './components/reports/WhatYouOwe/SupplierBalanceSummary';
import SupplierBalanceDetails from './components/reports/WhatYouOwe/SupplierBalanceDetails';
import APAgingDetailReport from './components/reports/WhatYouOwe/APAgingDetailReport';
import BillsAndAppliedPayments from './components/reports/WhatYouOwe/BillsAndAppliedPayments';
import UnpaidBills from './components/reports/WhatYouOwe/UnpaidBills';

// Expense and Suppliers Reports
import SupplierContactDetails from './components/reports/ExpensesAndSuppliers/SupplierContactDetails';
import ChequeDetails from './components/reports/ExpensesAndSuppliers/ChequeDetails';
import GetPurchasesByProductServiceSummary from './components/reports/ExpensesAndSuppliers/GetPurchasesByProductServiceSummary';
import GetPurchasesByClassDetail from './components/reports/ExpensesAndSuppliers/GetPurchasesByClassDetail';
import GetOpenPurchaseOrdersDetail from './components/reports/ExpensesAndSuppliers/GetOpenPurchaseOrdersDetail';
import GetPurchaseList from './components/reports/ExpensesAndSuppliers/GetPurchaseList';
import GetPurchasesBySupplierSummary from './components/reports/ExpensesAndSuppliers/GetPurchasesBySupplierSummary';
import GetOpenPurchaseOrdersList from './components/reports/ExpensesAndSuppliers/GetOpenPurchaseOrdersList';
import GetExpenseBySupplierSummary from './components/reports/ExpensesAndSuppliers/GetExpenseBySupplierSummary';
import GetExpenseBySupplierDetail from './components/reports/ExpensesAndSuppliers/GetExpenseBySupplierDetail';

// Sales Tax
import SSCL100percentTaxDetails from './components/reports/SalesTax/SSCL100percentTaxDetails';
import VAT18percentTaxDetails from './components/reports/SalesTax/VAT18percentTaxDetails';
import TransactionDetailsByTaxCode from './components/reports/SalesTax/TransactionDetailsByTaxCode';

// Employees
import EmployeeContactDetails from './components/reports/Employees/EmployeeContactDetails';

import NotFound from './components/NotFound/NotFound';
import EditBill from './components/modals/EditBill';

interface Cheque {
  id: number;
  cheque_number: string;
  bank_name: string;
  branch_name: string;
  cheque_date: string;
  payee_name: string;
  amount: number;
  status: 'pending' | 'deposited' | 'returned';
  created_at: string;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const isChecking = useTokenExpirationCheck();

  if (loading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function AppContent() {
  const { selectedCompany } = useCompany();
  const { setHasNearDueCheques } = useNotification();

  useEffect(() => {
    const fetchCheques = async () => {
      try {
        if (selectedCompany?.company_id) {
          const response = await axiosInstance.get(`/api/getChequesByCompanyId/${selectedCompany.company_id}`);
          const fetchedCheques: Cheque[] = response.data;

          // Check for near-due pending cheques
          const hasNearDue = fetchedCheques.some((cheque) => {
            if (cheque.cheque_date && cheque.status === 'pending') {
              const today = new Date();
              const chequeDate = new Date(cheque.cheque_date);
              const diffInTime = chequeDate.getTime() - today.getTime();
              const diffInDays = diffInTime / (1000 * 3600 * 24);
              return diffInDays == 0 || diffInDays <= 3;
            }
            return false;
          });
          setHasNearDueCheques(hasNearDue);
        } else {
          setHasNearDueCheques(false);
        }
      } catch (error) {
        console.error('Error fetching cheques for notification:', error);
        setHasNearDueCheques(false);
      }
    };

    fetchCheques();
  }, [selectedCompany, setHasNearDueCheques]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/companies"
          element={
            <ProtectedRoute>
              <CompanySelection />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-company"
          element={
            <ProtectedRoute>
              <CreateCompany />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <SocketProvider>
                <Layout>
                  <Dashboard />
                </Layout>
              </SocketProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/estimates/create"
          element={
            <ProtectedRoute>
              <CreateEstimate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/estimates/edit/:id"
          element={
            <ProtectedRoute>
              <SocketProvider>
                <EditEstimate />
              </SocketProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchase-orders"
          element={
            <ProtectedRoute>
              <PurchaseOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices/create"
          element={
            <ProtectedRoute>
              <CreateInvoice />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices/edit"
          element={
            <ProtectedRoute>
              <SocketProvider>
                <EditInvoice />
              </SocketProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices/receive-payment/:customerId"
          element={
            <ProtectedRoute>
              <InvoiceRecievedPayment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bills/receive-payment/:vendorId"
          element={
            <ProtectedRoute>
              <BillReceivePaymentModal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchase-orders/edit/:orderId"
          element={
            <ProtectedRoute>
              <EditPurchaseOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/expense/create"
          element={
            <ProtectedRoute>
              <CreateExpense />
            </ProtectedRoute>
          }
        />
        <Route
          path="/expense/edit/:id"
          element={
            <ProtectedRoute>
              <EditExpense />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bill/create"
          element={
            <ProtectedRoute>
              <CreateBill />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bill/edit/:id"
          element={
            <ProtectedRoute>
              <EditBill />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cheque/create"
          element={
            <ProtectedRoute>
              <CreateCheque />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cheque/edit/:id"
          element={
            <ProtectedRoute>
              <EditCheques />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/companies" />} />
        {/* Reports */}
        <Route
          path="/reports/profit&loss"
          element={
            <ProtectedRoute>
              <ProfitAndLossReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/profit&loss-by-class"
          element={
            <ProtectedRoute>
              <ProfitAndLossByClass />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/profit-and-loss-by-employee/:employeeId"
          element={
            <ProtectedRoute>
              <ProfitAndLossByClassInDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/profit&loss-by-customer"
          element={
            <ProtectedRoute>
              <ProfitAndLossByCustomer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/profit-and-loss-by-customer/:customerId"
          element={
            <ProtectedRoute>
              <ProfitAndLossByCustomerInDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/profit&loss-by-month"
          element={
            <ProtectedRoute>
              <ProfitAndLossByMonth />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/commission"
          element={
            <ProtectedRoute>
              <CommissionReport />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/commission-by-employee/:employeeId"
          element={
            <ProtectedRoute>
              <CommissionReportByEmployees />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/sales"
          element={
            <ProtectedRoute>
              <SalesReport />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/sales-by-employee/:employeeId"
          element={
            <ProtectedRoute>
              <SalesReportByEmployees />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/customer-contact-list"
          element={
            <ProtectedRoute>
              <CustomerContactDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/product-service-list"
          element={
            <ProtectedRoute>
              <ProductAndServiceList />
            </ProtectedRoute>
          }
        />

        {/* Sales and Customers */}
        <Route
          path="/reports/sales-by-customer"
          element={
            <ProtectedRoute>
              <SalesbyCustomerSummary />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/sales-by-customer-detail/:customerId"
          element={
            <ProtectedRoute>
              <SalesbyCustomerDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/sales-by-product"
          element={
            <ProtectedRoute>
              <SalesbyProductSummary />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/sales-by-product-detail/:productId"
          element={
            <ProtectedRoute>
              <SalesbyProductDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/deposit-detail"
          element={
            <ProtectedRoute>
              <DepoistDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/estimates-by-customer"
          element={
            <ProtectedRoute>
              <EstimatesbyCustomers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/stock-take-worksheet"
          element={
            <ProtectedRoute>
              <StockTakeWorksheet />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/income-by-customer-summary"
          element={
            <ProtectedRoute>
              <IncomeByCustomerSummary />
            </ProtectedRoute>
          }
        />

        {/* Who Owes you section */}
        <Route
          path="/reports/ar-aging-summary"
          element={
            <ProtectedRoute>
              <ARAgingSummaryReport />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/ar-aging-in-detail/:customerId"
          element={
            <ProtectedRoute>
              <ARAgingSummaryInDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/invoices-and-payments"
          element={
            <ProtectedRoute>
              <InvoicesAndRecievePayments />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/open-invoices"
          element={
            <ProtectedRoute>
              <OpenInvoices />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/invoice-list"
          element={
            <ProtectedRoute>
              <InvoiceList />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/customer-balance-summary"
          element={
            <ProtectedRoute>
              <CustomerBalanceSummary />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/customer-balance-detail/:customer_Id"
          element={
            <ProtectedRoute>
              <CustomerBalanceDetail />
            </ProtectedRoute>
          }
        />

        {/* Expense & Suppliers section */}
        <Route
          path="/reports/supplier-contact-list"
          element={
            <ProtectedRoute>
              <SupplierContactDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/cheque-detail"
          element={
            <ProtectedRoute>
              <ChequeDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/purchases-by-product-service"
          element={
            <ProtectedRoute>
              <GetPurchasesByProductServiceSummary />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/purchases-by-class-detail"
          element={
            <ProtectedRoute>
              <GetPurchasesByClassDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/open-purchase-orders-detail"
          element={
            <ProtectedRoute>
              <GetOpenPurchaseOrdersDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/purchase-list"
          element={
            <ProtectedRoute>
              <GetPurchaseList />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/purchases-by-supplier"
          element={
            <ProtectedRoute>
              <GetPurchasesBySupplierSummary />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/open-purchase-orders-list"
          element={
            <ProtectedRoute>
              <GetOpenPurchaseOrdersList />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/expense-by-supplier"
          element={
            <ProtectedRoute>
              <GetExpenseBySupplierSummary />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/expense-by-supplier-detail/:payee_id"
          element={
            <ProtectedRoute>
              <GetExpenseBySupplierDetail />
            </ProtectedRoute>
          }
        />

        {/* Sales Tax section */}
        <Route
          path="/reports/sscl-tax-detail"
          element={
            <ProtectedRoute>
              <SSCL100percentTaxDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/vat-18-tax-detail"
          element={
            <ProtectedRoute>
              <VAT18percentTaxDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/transaction-detail-by-tax-code"
          element={
            <ProtectedRoute>
              <TransactionDetailsByTaxCode />
            </ProtectedRoute>
          }
        />

        {/* What you owe section */}
        <Route
          path="/reports/ap-aging-summary"
          element={
            <ProtectedRoute>
              <APAgingSummaryReport />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/ap-aging-detail/:vendorId"
          element={
            <ProtectedRoute>
              <APAgingDetailReport />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/reports/supplier-balance-summary"
          element={
            <ProtectedRoute>
              <SupplierBalanceSummary />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/supplier-balance-detail/:vendor_id"
          element={
            <ProtectedRoute>
              <SupplierBalanceDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/bills-and-payments"
          element={
            <ProtectedRoute>
              <BillsAndAppliedPayments />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/unpaid-bills"
          element={
            <ProtectedRoute>
              <UnpaidBills />
            </ProtectedRoute>
          }
        />


        {/* Employee section */}
        <Route
          path="/reports/employee-contact-list"
          element={
            <ProtectedRoute>
              <EmployeeContactDetails />
            </ProtectedRoute>
          }
        />

        {/* Catch-all route for 404 Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <CompanyProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </CompanyProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;