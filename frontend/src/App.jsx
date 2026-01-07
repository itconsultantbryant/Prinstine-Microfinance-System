import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Loans from './pages/Loans';
import LoanApplications from './pages/LoanApplications';
import RequestLoan from './pages/RequestLoan';
import Savings from './pages/Savings';
import Transactions from './pages/Transactions';
import Collections from './pages/Collections';
import KYC from './pages/KYC';
import Collaterals from './pages/Collaterals';
import ApprovalCenter from './pages/ApprovalCenter';
import Accounting from './pages/Accounting';
import Reports from './pages/Reports';
import BorrowerReports from './pages/BorrowerReports';
import Dues from './pages/Dues';
import Staff from './pages/Staff';
import Payroll from './pages/Payroll';
import Users from './pages/Users';
import Branches from './pages/Branches';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import RecycleBin from './pages/RecycleBin';
import ClientDetail from './pages/ClientDetail';
import LoanDetail from './pages/LoanDetail';
import SavingsDetail from './pages/SavingsDetail';
import Layout from './components/Layout';

// Suppress React Router future flag warnings
const routerConfig = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
};

function App() {
  return (
    <AuthProvider>
      <Router future={routerConfig.future}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/clients"
            element={
              <PrivateRoute>
                <Layout>
                  <Clients />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/loans"
            element={
              <PrivateRoute>
                <Layout>
                  <Loans />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/savings"
            element={
              <PrivateRoute>
                <Layout>
                  <Savings />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/transactions"
            element={
              <PrivateRoute>
                <Layout>
                  <Transactions />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/accounting"
            element={
              <PrivateRoute>
                <Layout>
                  <Accounting />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/loan-applications"
            element={
              <PrivateRoute>
                <Layout>
                  <LoanApplications />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/request-loan"
            element={
              <PrivateRoute>
                <Layout>
                  <RequestLoan />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/collections"
            element={
              <PrivateRoute>
                <Layout>
                  <Collections />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/kyc"
            element={
              <PrivateRoute>
                <Layout>
                  <KYC />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/collaterals"
            element={
              <PrivateRoute>
                <Layout>
                  <Collaterals />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/approval-center"
            element={
              <PrivateRoute>
                <Layout>
                  <ApprovalCenter />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <PrivateRoute>
                <Layout>
                  <Reports />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/borrower-reports"
            element={
              <PrivateRoute>
                <Layout>
                  <BorrowerReports />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/dues"
            element={
              <PrivateRoute>
                <Layout>
                  <Dues />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/staff"
            element={
              <PrivateRoute>
                <Layout>
                  <Staff />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/payroll"
            element={
              <PrivateRoute>
                <Layout>
                  <Payroll />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/users"
            element={
              <PrivateRoute>
                <Layout>
                  <Users />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/branches"
            element={
              <PrivateRoute>
                <Layout>
                  <Branches />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/recycle-bin"
            element={
              <PrivateRoute>
                <Layout>
                  <RecycleBin />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/clients/:id"
            element={
              <PrivateRoute>
                <Layout>
                  <ClientDetail />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/loans/:id"
            element={
              <PrivateRoute>
                <Layout>
                  <LoanDetail />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/savings/:id"
            element={
              <PrivateRoute>
                <Layout>
                  <SavingsDetail />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <PrivateRoute>
                <Layout>
                  <Notifications />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Layout>
                  <Profile />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer position="top-right" autoClose={3000} />
      </Router>
    </AuthProvider>
  );
}

export default App;

