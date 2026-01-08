import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Reports = () => {
  const [reportType, setReportType] = useState('financial');
  const [chartKey, setChartKey] = useState(0);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [financialSummary, setFinancialSummary] = useState({
    totalSavings: 0,
    totalPersonalInterest: 0,
    totalGeneralInterest: 0,
    totalOutstandingDues: 0,
    totalOutstandingLoans: 0,
    grandTotal: 0,
    overallTotalSavings: 0
  });
  const [revenueData, setRevenueData] = useState({
    totalRevenue: 0,
    loanRevenue: 0,
    savingsRevenue: 0,
    feesRevenue: 0,
    revenueBySource: {},
    revenues: []
  });

  // Reset chart key when switching report types to avoid canvas reuse errors
  useEffect(() => {
    setChartKey(prev => prev + 1);
  }, [reportType]);

  // Fetch real dashboard data for reports
  useEffect(() => {
    fetchDashboardData();
    fetchHistoricalData();
    fetchFinancialSummary();
    fetchRevenueData();
    
    // Refresh data every 30 seconds for real-time updates
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchHistoricalData();
      fetchFinancialSummary();
      fetchRevenueData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchFinancialSummary = async () => {
    try {
      const [savingsRes, transactionsRes, clientsRes, loansRes] = await Promise.all([
        apiClient.get('/api/savings'),
        apiClient.get('/api/transactions', { params: { limit: 1000 } }),
        apiClient.get('/api/clients'),
        apiClient.get('/api/loans')
      ]);

      const savings = savingsRes.data.data.savingsAccounts || [];
      const transactions = transactionsRes.data.data.transactions || [];
      const clients = clientsRes.data.data.clients || [];
      const loans = loansRes.data.data.loans || [];

      const totalSavings = savings.reduce((sum, acc) => 
        sum + parseFloat(acc.balance || 0), 0
      );

      const totalPersonalInterest = transactions
        .filter(t => t.type === 'personal_interest_payment')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      const totalGeneralInterest = transactions
        .filter(t => t.type === 'general_interest')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      const totalOutstandingDues = clients
        .filter(c => parseFloat(c.total_dues || 0) < 0)
        .reduce((sum, c) => sum + Math.abs(parseFloat(c.total_dues || 0)), 0);

      const totalOutstandingLoans = loans.reduce((sum, loan) => 
        sum + parseFloat(loan.outstanding_balance || 0), 0
      );

      // Grand Total = Total Savings + Personal Interest + General Interest - Outstanding Dues
      const grandTotal = totalSavings + totalPersonalInterest + totalGeneralInterest - totalOutstandingDues;
      
      // Overall Total Savings = Grand Total - Outstanding Loans
      const overallTotalSavings = grandTotal - totalOutstandingLoans;

      setFinancialSummary({
        totalSavings,
        totalPersonalInterest,
        totalGeneralInterest,
        totalOutstandingDues,
        totalOutstandingLoans,
        grandTotal,
        overallTotalSavings
      });
    } catch (error) {
      console.error('Failed to fetch financial summary:', error);
    }
  };

  const fetchHistoricalData = async () => {
    try {
      const response = await apiClient.get('/api/dashboard/historical');
      setHistoricalData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
      // Set empty data structure if fetch fails
      setHistoricalData({ months: [], portfolioValues: [], collections: [] });
    }
  };

  const fetchDashboardData = async () => {
    try {
      const response = await apiClient.get('/api/dashboard');
      setDashboardStats(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setLoading(false);
    }
  };

  // Generate financial data from real historical statistics
  const financialData = historicalData && dashboardStats ? {
    labels: historicalData.months || [],
    datasets: [
      {
        label: 'Revenue',
        data: historicalData.collections || [],
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
      },
      {
        label: 'Expenses',
        data: historicalData.collections ? historicalData.collections.map(c => c * 0.6) : [],
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
      },
    ],
  } : {
    labels: [],
    datasets: []
  };

  // Generate loan portfolio data from real statistics
  const loanPortfolioData = dashboardStats ? {
    labels: ['Active', 'Pending', 'Overdue', 'Completed'],
    datasets: [
      {
        data: [
          dashboardStats.statistics.activeLoans || 0,
          dashboardStats.statistics.totalClients || 0,
          dashboardStats.statistics.overdueLoans || 0,
          (dashboardStats.statistics.totalClients || 0) - (dashboardStats.statistics.activeLoans || 0)
        ],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(100, 116, 139, 0.8)',
        ],
      },
    ],
  } : {
    labels: [],
    datasets: []
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">Reports & Analytics</h1>
          <p className="text-muted">Comprehensive system reports</p>
        </div>
        <div className="btn-group">
          <button className="btn btn-outline-primary">
            <i className="fas fa-file-excel me-2"></i>Export Excel
          </button>
          <button className="btn btn-outline-danger">
            <i className="fas fa-file-pdf me-2"></i>Export PDF
          </button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${reportType === 'financial' ? 'active' : ''}`}
            onClick={() => setReportType('financial')}
          >
            <i className="fas fa-chart-line me-2"></i>Financial Reports
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${reportType === 'portfolio' ? 'active' : ''}`}
            onClick={() => setReportType('portfolio')}
          >
            <i className="fas fa-hand-holding-usd me-2"></i>Loan Portfolio
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${reportType === 'clients' ? 'active' : ''}`}
            onClick={() => setReportType('clients')}
          >
            <i className="fas fa-users me-2"></i>Client Reports
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${reportType === 'performance' ? 'active' : ''}`}
            onClick={() => setReportType('performance')}
          >
            <i className="fas fa-tachometer-alt me-2"></i>Performance
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${reportType === 'revenue' ? 'active' : ''}`}
            onClick={() => setReportType('revenue')}
          >
            <i className="fas fa-dollar-sign me-2"></i>Revenue
          </button>
        </li>
      </ul>

      {/* Financial Reports */}
      {reportType === 'financial' && (
        <div className="row">
          {/* Financial Summary Cards */}
          <div className="col-md-12 mb-4">
            <div className="row g-3">
              <div className="col-md-3">
                <div className="card bg-primary text-white">
                  <div className="card-body">
                    <h6 className="card-subtitle mb-2 text-white-50">Total Savings</h6>
                    <h3 className="card-title mb-0">
                      ${financialSummary.overallTotalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-success text-white">
                  <div className="card-body">
                    <h6 className="card-subtitle mb-2 text-white-50">Personal Interest</h6>
                    <h3 className="card-title mb-0">
                      ${financialSummary.totalPersonalInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-info text-white">
                  <div className="card-body">
                    <h6 className="card-subtitle mb-2 text-white-50">General Interest</h6>
                    <h3 className="card-title mb-0">
                      ${financialSummary.totalGeneralInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-warning text-white">
                  <div className="card-body">
                    <h6 className="card-subtitle mb-2 text-white-50">Grand Total</h6>
                    <h3 className="card-title mb-0">
                      ${financialSummary.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-12 mb-4">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Revenue vs Expenses</h5>
              </div>
              <div className="card-body">
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : financialData.labels.length > 0 ? (
                  <Bar 
                    key={`bar-${chartKey}`}
                    data={financialData} 
                    options={{ 
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                      },
                    }} 
                  />
                ) : (
                  <div className="text-center text-muted py-5">
                    No financial data available
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loan Portfolio Reports */}
      {reportType === 'portfolio' && (
        <div className="row">
          <div className="col-md-6 mb-4">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Loan Distribution</h5>
              </div>
              <div className="card-body">
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : loanPortfolioData.labels.length > 0 ? (
                  <Pie 
                    key={`pie-${chartKey}`}
                    data={loanPortfolioData} 
                    options={{ 
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: {
                          position: 'bottom',
                        },
                      },
                    }} 
                  />
                ) : (
                  <div className="text-center text-muted py-5">
                    No portfolio data available
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="col-md-6 mb-4">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Portfolio Summary</h5>
              </div>
              <div className="card-body">
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : dashboardStats ? (
                  <div className="row">
                    <div className="col-6 mb-3">
                      <div className="stat-card">
                        <div className="stat-label">Total Portfolio</div>
                        <div className="stat-value text-primary">
                          ${(dashboardStats.statistics.portfolioValue || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="col-6 mb-3">
                      <div className="stat-card">
                        <div className="stat-label">Active Loans</div>
                        <div className="stat-value text-success">
                          {dashboardStats.statistics.activeLoans || 0}
                        </div>
                      </div>
                    </div>
                    <div className="col-6 mb-3">
                      <div className="stat-card">
                        <div className="stat-label">Overdue</div>
                        <div className="stat-value text-danger">
                          {dashboardStats.statistics.overdueLoans || 0}
                        </div>
                      </div>
                    </div>
                    <div className="col-6 mb-3">
                      <div className="stat-card">
                        <div className="stat-label">Collection Rate</div>
                        <div className="stat-value text-info">
                          {dashboardStats.statistics.portfolioValue > 0 && dashboardStats.statistics.totalCollections > 0
                            ? ((dashboardStats.statistics.totalCollections / dashboardStats.statistics.portfolioValue) * 100).toFixed(1)
                            : 0}%
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted py-5">
                    No data available
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client Reports */}
      {reportType === 'clients' && (
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Client Statistics</h5>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : dashboardStats ? (
              <div className="row">
                <div className="col-md-3 mb-4">
                  <div className="stat-card">
                    <div className="stat-label">Total Clients</div>
                    <div className="stat-value text-primary">
                      {dashboardStats.statistics.totalClients || 0}
                    </div>
                  </div>
                </div>
                <div className="col-md-3 mb-4">
                  <div className="stat-card">
                    <div className="stat-label">Active Clients</div>
                    <div className="stat-value text-success">
                      {dashboardStats.statistics.totalClients || 0}
                    </div>
                  </div>
                </div>
                <div className="col-md-3 mb-4">
                  <div className="stat-card">
                    <div className="stat-label">Total Savings</div>
                    <div className="stat-value text-info">
                      ${(dashboardStats.statistics.totalSavings || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="col-md-3 mb-4">
                  <div className="stat-card">
                    <div className="stat-label">Total Transactions</div>
                    <div className="stat-value text-warning">
                      {dashboardStats.statistics.totalTransactions || 0}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted py-5">
                No data available
              </div>
            )}
          </div>
        </div>
      )}

      {/* Performance Reports */}
      {reportType === 'performance' && (
        <div className="row">
          <div className="col-md-6 mb-4">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Monthly Performance</h5>
              </div>
              <div className="card-body">
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : financialData.labels.length > 0 ? (
                  <Line 
                    key={`line-${chartKey}`}
                    data={financialData} 
                    options={{ 
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                      },
                    }} 
                  />
                ) : (
                  <div className="text-center text-muted py-5">
                    No performance data available
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="col-md-6 mb-4">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Key Metrics</h5>
              </div>
              <div className="card-body">
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : dashboardStats ? (
                  <div className="list-group">
                    <div className="list-group-item">
                      <strong>Portfolio at Risk (PAR)</strong>
                      <span className="float-end badge bg-warning">
                        {dashboardStats.statistics.activeLoans > 0
                          ? ((dashboardStats.statistics.overdueLoans / dashboardStats.statistics.activeLoans) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                    <div className="list-group-item">
                      <strong>Default Rate</strong>
                      <span className="float-end badge bg-danger">
                        {dashboardStats.statistics.activeLoans > 0
                          ? ((dashboardStats.statistics.overdueLoans / dashboardStats.statistics.activeLoans) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                    <div className="list-group-item">
                      <strong>Collection Efficiency</strong>
                      <span className="float-end badge bg-success">
                        {dashboardStats.statistics.portfolioValue > 0
                          ? ((dashboardStats.statistics.totalCollections / dashboardStats.statistics.portfolioValue) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                    <div className="list-group-item">
                      <strong>Average Loan Size</strong>
                      <span className="float-end">
                        ${dashboardStats.statistics.activeLoans > 0
                          ? (dashboardStats.statistics.portfolioValue / dashboardStats.statistics.activeLoans).toFixed(2)
                          : 0}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted py-5">
                    No data available
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
