import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission, ROLES, formatRoleName } from '../utils/permissions';
import { Line, Doughnut } from 'react-chartjs-2';
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

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [realtimeData, setRealtimeData] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    fetchRealtimeData();
    fetchHistoricalData();
    
    const dashboardInterval = setInterval(fetchDashboardData, 30000);
    const realtimeInterval = setInterval(fetchRealtimeData, 10000);
    
    return () => {
      clearInterval(dashboardInterval);
      clearInterval(realtimeInterval);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await apiClient.get('/api/dashboard');
      setStats(response.data?.data ?? null);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
      setLoading(false);
    }
  };

  const fetchRealtimeData = async () => {
    try {
      const response = await apiClient.get('/api/dashboard/realtime');
      setRealtimeData(response.data?.data ?? null);
    } catch (error) {
      console.error('Failed to fetch real-time data:', error);
      toast.error(error.response?.data?.message || 'Failed to load real-time data');
    }
  };

  const fetchHistoricalData = async () => {
    try {
      const response = await apiClient.get('/api/dashboard/historical');
      setHistoricalData(response.data?.data ?? null);
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
      setHistoricalData({ months: [], portfolioValues: [], collections: [] });
      toast.error(error.response?.data?.message || 'Failed to load historical data');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Ensure stats and statistics exist with defaults
  const statistics = stats?.statistics || {
    totalClients: 0,
    activeLoans: 0,
    totalSavings: 0,
    overdueLoans: 0,
    totalTransactions: 0,
    portfolioValue: 0,
    totalCollections: 0,
    lrd: {
      totalSavings: 0,
      totalLoans: 0,
      outstandingLoans: 0,
      portfolioValue: 0,
      totalCollections: 0,
      totalDues: 0,
      outstandingDues: 0,
      monthlyDues: 0,
      clientsWithOutstandingDues: 0,
      clientsPaidDues: 0,
      totalFines: 0,
      outstandingSavings: 0
    },
    usd: {
      totalSavings: 0,
      totalLoans: 0,
      outstandingLoans: 0,
      portfolioValue: 0,
      totalCollections: 0,
      totalDues: 0,
      outstandingDues: 0,
      monthlyDues: 0,
      clientsWithOutstandingDues: 0,
      clientsPaidDues: 0,
      totalFines: 0,
      outstandingSavings: 0
    },
    totalLoans: 0,
    totalOutstandingLoans: 0,
    totalOutstandingSavings: 0
  };
  const recentLoans = stats?.recentLoans || [];
  const recentTransactions = stats?.recentTransactions || [];
  const clientsWithDues = stats?.clientsWithDues?.all || stats?.clientsWithDues || [];
  const clientsWithDuesLRD = stats?.clientsWithDues?.lrd || [];
  const clientsWithDuesUSD = stats?.clientsWithDues?.usd || [];

  // Chart data for portfolio trend - using real historical data
  const portfolioData = historicalData ? {
    labels: historicalData.months || [],
    datasets: [
      {
        label: 'Portfolio Value',
        data: historicalData.portfolioValues || [],
        borderColor: 'rgb(37, 99, 235)',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  } : {
    labels: [],
    datasets: []
  };

  // Chart data for loan distribution
  const loanDistributionData = {
    labels: ['Active', 'Pending', 'Overdue', 'Completed'],
    datasets: [
      {
        data: [
          statistics.activeLoans || 0,
          realtimeData?.pendingLoans || 0,
          statistics.overdueLoans || 0,
          0
        ],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(100, 116, 139, 0.8)',
        ],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  const StatCard = ({ icon, title, value, color, trend }) => (
    <div className="col-md-3 col-sm-6 mb-4">
      <div className="stat-card hover-lift">
        <div className={`stat-icon bg-${color} text-white`}>
          <i className={icon}></i>
        </div>
        <div className="stat-label">{title}</div>
        <div className={`stat-value text-${color}`}>
          {typeof value === 'number' && value >= 1000
            ? `$${value.toLocaleString()}`
            : value}
        </div>
        {trend && (
          <div className="mt-2">
            <small className={`text-${trend > 0 ? 'success' : 'danger'}`}>
              <i className={`fas fa-arrow-${trend > 0 ? 'up' : 'down'}`}></i>
              {Math.abs(trend)}%
            </small>
          </div>
        )}
      </div>
    </div>
  );

  // Role-based dashboard title and description
  const getDashboardTitle = () => {
    const role = user?.role;
    if (role === ROLES.ADMIN) {
      return { title: 'Admin Dashboard', desc: 'Complete system overview and management' };
    } else if (role === ROLES.MICRO_LOAN_OFFICER) {
      return { title: 'Micro Loan Officer Dashboard', desc: 'Manage clients, loans, and approvals' };
    } else if (role === ROLES.HEAD_MICRO_LOAN) {
      return { title: 'Head Micro Loan Dashboard', desc: 'Oversee loan operations and approvals' };
    } else if (role === ROLES.SUPERVISOR) {
      return { title: 'Supervisor Dashboard', desc: 'Review and approve loan applications' };
    } else if (role === ROLES.FINANCE) {
      return { title: 'Finance Dashboard', desc: 'Manage loan disbursements and savings transactions' };
    } else if (role === ROLES.BORROWER) {
      return { title: 'My Dashboard', desc: 'View your loans, savings, and transaction history' };
    }
    return { title: 'Dashboard', desc: 'Welcome back! Here\'s what\'s happening today.' };
  };

  const { title, desc } = getDashboardTitle();

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">{title}</h1>
          <p className="text-muted">{desc}</p>
          {user && (
            <small className="text-muted">
              <i className="fas fa-user-tag me-1"></i>
              Logged in as: <strong>{formatRoleName(user.role)}</strong>
            </small>
          )}
        </div>
        <div>
          {hasPermission(user?.role, 'canViewReports') && (
            <button className="btn btn-primary">
              <i className="fas fa-download me-2"></i>Export Report
            </button>
          )}
        </div>
      </div>

      {/* Role-based Statistics Cards */}
      <div className="row mb-4">
        {/* For Borrower role - show their financial summary */}
        {user?.role === ROLES.BORROWER ? (
          <>
            {/* USD Component - Above */}
            <div className="col-12 mb-4">
              <div className="card border-success">
                <div className="card-header bg-success text-white">
                  <h5 className="mb-0"><i className="fas fa-dollar-sign me-2"></i>USD Summary</h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                        <span className="fw-bold">Total Savings</span>
                        <span className="text-success fs-5">+ ${(statistics.usd?.totalSavings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                        <span className="fw-bold">Personal Interest</span>
                        <span className="text-success fs-5">+ ${(statistics.usd?.personalInterest || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                        <span className="fw-bold">General Interest</span>
                        <span className="text-success fs-5">+ ${(statistics.usd?.generalInterest || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                        <span className="fw-bold">Outstanding Loan</span>
                        <span className="text-danger fs-5">- ${(statistics.usd?.outstandingLoans || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                        <span className="fw-bold">Outstanding Dues</span>
                        <span className="text-danger fs-5">- ${(statistics.usd?.outstandingDues || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                        <span className="fw-bold">Fines</span>
                        <span className="text-danger fs-5">- ${(statistics.usd?.totalFines || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="d-flex justify-content-between align-items-center p-4 bg-primary text-white rounded">
                        <span className="fw-bold fs-4">Total Take Home</span>
                        <span className="fs-3 fw-bold">
                          ${((statistics.usd?.totalSavings || 0) + (statistics.usd?.personalInterest || 0) + (statistics.usd?.generalInterest || 0) - (statistics.usd?.outstandingLoans || 0) - (statistics.usd?.outstandingDues || 0) - (statistics.usd?.totalFines || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* LRD Component - Below */}
            <div className="col-12">
              <div className="card border-primary">
                <div className="card-header bg-primary text-white">
                  <h5 className="mb-0"><i className="fas fa-coins me-2"></i>LRD Summary</h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                        <span className="fw-bold">Total Savings</span>
                        <span className="text-success fs-5">+ LRD {(statistics.lrd?.totalSavings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                        <span className="fw-bold">Personal Interest</span>
                        <span className="text-success fs-5">+ LRD {(statistics.lrd?.personalInterest || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                        <span className="fw-bold">General Interest</span>
                        <span className="text-success fs-5">+ LRD {(statistics.lrd?.generalInterest || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                        <span className="fw-bold">Outstanding Loan</span>
                        <span className="text-danger fs-5">- LRD {(statistics.lrd?.outstandingLoans || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                        <span className="fw-bold">Outstanding Dues</span>
                        <span className="text-danger fs-5">- LRD {(statistics.lrd?.outstandingDues || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                        <span className="fw-bold">Fines</span>
                        <span className="text-danger fs-5">- LRD {(statistics.lrd?.totalFines || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="d-flex justify-content-between align-items-center p-4 bg-primary text-white rounded">
                        <span className="fw-bold fs-4">Total Take Home</span>
                        <span className="fs-3 fw-bold">
                          LRD {((statistics.lrd?.totalSavings || 0) + (statistics.lrd?.personalInterest || 0) + (statistics.lrd?.generalInterest || 0) - (statistics.lrd?.outstandingLoans || 0) - (statistics.lrd?.outstandingDues || 0) - (statistics.lrd?.totalFines || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Clients - visible to roles that can view clients */}
            {(hasPermission(user?.role, 'canViewClients') || user?.role === ROLES.ADMIN) && (
              <StatCard
                icon="fas fa-users"
                title="Total Clients"
                value={statistics.totalClients || 0}
                color="primary"
              />
            )}
            
            {/* Loans - visible to roles that can view loans */}
            {(hasPermission(user?.role, 'canViewLoans') || user?.role === ROLES.ADMIN) && (
              <>
                <StatCard
                  icon="fas fa-hand-holding-usd"
                  title="Active Loans"
                  value={statistics.activeLoans || 0}
                  color="success"
                />
                <StatCard
                  icon="fas fa-exclamation-triangle"
                  title="Overdue Loans"
                  value={statistics.overdueLoans || 0}
                  color="danger"
                />
              </>
            )}

            {/* Savings - visible to Finance and Admin */}
            {(user?.role === ROLES.FINANCE || user?.role === ROLES.ADMIN) && (
              <StatCard
                icon="fas fa-piggy-bank"
                title="Total Savings"
                value={statistics.totalSavings || 0}
                color="info"
              />
            )}

            {/* Pending Approvals - visible to roles that can approve */}
            {(hasPermission(user?.role, 'canApproveLoans') || user?.role === ROLES.ADMIN) && realtimeData && (
              <StatCard
                icon="fas fa-clock"
                title="Pending Approvals"
                value={realtimeData.pendingLoans || 0}
                color="warning"
              />
            )}
          </>
        )}
      </div>

      {/* Additional Stats - Role-based */}
      <div className="row mb-4">
        {/* Portfolio Value - visible to Head Micro Loan, Supervisor, Finance, Admin */}
        {(user?.role === ROLES.HEAD_MICRO_LOAN || user?.role === ROLES.SUPERVISOR || 
          user?.role === ROLES.FINANCE || user?.role === ROLES.ADMIN) && (
          <StatCard
            icon="fas fa-chart-line"
            title="Portfolio Value"
            value={statistics.portfolioValue || 0}
            color="warning"
          />
        )}

        {/* Collections - visible to Micro Loan Officer, Head Micro Loan, Admin */}
        {(user?.role === ROLES.MICRO_LOAN_OFFICER || user?.role === ROLES.HEAD_MICRO_LOAN || 
          user?.role === ROLES.ADMIN) && (
          <StatCard
            icon="fas fa-money-bill-wave"
            title="Total Collections"
            value={statistics.totalCollections || 0}
            color="success"
          />
        )}

        {/* Transactions - visible to Finance and Admin */}
        {(user?.role === ROLES.FINANCE || user?.role === ROLES.ADMIN) && (
          <StatCard
            icon="fas fa-exchange-alt"
            title="Total Transactions"
            value={statistics.totalTransactions || 0}
            color="info"
          />
        )}

        {/* Pending KYC Approvals - visible to roles that can approve KYC */}
        {(hasPermission(user?.role, 'canApproveKYC') || user?.role === ROLES.ADMIN) && realtimeData && (
          <StatCard
            icon="fas fa-id-card"
            title="Pending KYC Approvals"
            value={realtimeData.pendingKYC || 0}
            color="info"
          />
        )}
      </div>

      {/* Charts Row */}
      <div className="row mb-4">
        <div className="col-md-8 mb-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="fas fa-chart-line me-2"></i>Portfolio Trend
              </h5>
            </div>
            <div className="card-body">
              <Line 
                key="portfolio-chart"
                data={portfolioData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: function(value) {
                          return '$' + value.toLocaleString();
                        }
                      }
                    }
                  }
                }} 
              />
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="fas fa-chart-pie me-2"></i>Loan Distribution
              </h5>
            </div>
              <div className="card-body">
                {loanDistributionData.datasets[0].data.some(d => d > 0) ? (
                  <Doughnut 
                    key="loan-distribution-chart"
                    data={loanDistributionData} 
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
                    No loan data available yet
                  </div>
                )}
              </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="row">
        <div className="col-md-6 mb-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="fas fa-file-invoice-dollar me-2"></i>Recent Loans
              </h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Loan Number</th>
                      <th>Client</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLoans && recentLoans.length > 0 ? (
                      recentLoans.map((loan) => (
                        <tr key={loan.id}>
                          <td>{loan.loan_number}</td>
                          <td>
                            {loan.client?.first_name} {loan.client?.last_name}
                          </td>
                          <td>
                            {loan.currency === 'LRD' ? 'LRD' : '$'}
                            {parseFloat(loan.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <small className="text-muted ms-1">({loan.currency || 'USD'})</small>
                          </td>
                          <td>
                            <span className={`badge bg-${
                              loan.status === 'active' ? 'success' :
                              loan.status === 'pending' ? 'warning' :
                              loan.status === 'overdue' ? 'danger' : 'secondary'
                            }`}>
                              {loan.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="text-center text-muted py-4">
                          No recent loans
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 mb-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="fas fa-exchange-alt me-2"></i>Recent Transactions
              </h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Transaction</th>
                      <th>Client</th>
                      <th>Amount</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions && recentTransactions.length > 0 ? (
                      recentTransactions.map((transaction) => (
                        <tr key={transaction.id}>
                          <td>{transaction.transaction_number}</td>
                          <td>
                            {transaction.client?.first_name} {transaction.client?.last_name}
                          </td>
                          <td>
                            {transaction.currency === 'LRD' ? 'LRD' : '$'}
                            {parseFloat(transaction.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <small className="text-muted ms-1">({transaction.currency || 'USD'})</small>
                          </td>
                          <td>
                            {new Date(transaction.transaction_date).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="text-center text-muted py-4">
                          No recent transactions
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Currency-Separated Financial Metrics (Admin/Head/Supervisor/Finance) */}
      {(user?.role === ROLES.ADMIN || user?.role === ROLES.HEAD_MICRO_LOAN || user?.role === ROLES.SUPERVISOR || user?.role === ROLES.FINANCE || user?.role === 'general_manager') && (
        <>
          {/* LRD Financial Metrics */}
          <div className="card mb-4">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">
                <i className="fas fa-coins me-2"></i>LRD Financial Metrics
              </h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-3">
                  <div className="card bg-info text-white">
                    <div className="card-body">
                      <h6 className="card-subtitle mb-2 text-white-50">Total Savings (LRD)</h6>
                      <h3 className="card-title mb-0">LRD {statistics.lrd?.totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</h3>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-success text-white">
                    <div className="card-body">
                      <h6 className="card-subtitle mb-2 text-white-50">Total Loans (LRD)</h6>
                      <h3 className="card-title mb-0">LRD {statistics.lrd?.totalLoans.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</h3>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-warning text-white">
                    <div className="card-body">
                      <h6 className="card-subtitle mb-2 text-white-50">Outstanding Loans (LRD)</h6>
                      <h3 className="card-title mb-0">LRD {statistics.lrd?.outstandingLoans.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</h3>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-danger text-white">
                    <div className="card-body">
                      <h6 className="card-subtitle mb-2 text-white-50">Outstanding Dues (LRD)</h6>
                      <h3 className="card-title mb-0">LRD {statistics.lrd?.outstandingDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</h3>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-secondary text-white">
                    <div className="card-body">
                      <h6 className="card-subtitle mb-2 text-white-50">Portfolio Value (LRD)</h6>
                      <h3 className="card-title mb-0">LRD {statistics.lrd?.portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</h3>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-primary text-white">
                    <div className="card-body">
                      <h6 className="card-subtitle mb-2 text-white-50">Total Collections (LRD)</h6>
                      <h3 className="card-title mb-0">LRD {statistics.lrd?.totalCollections.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</h3>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-dark text-white">
                    <div className="card-body">
                      <h6 className="card-subtitle mb-2 text-white-50">Total Fines (LRD)</h6>
                      <h3 className="card-title mb-0">LRD {statistics.lrd?.totalFines.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</h3>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-info text-white">
                    <div className="card-body">
                      <h6 className="card-subtitle mb-2 text-white-50">Clients with Dues (LRD)</h6>
                      <h3 className="card-title mb-0">{statistics.lrd?.clientsWithOutstandingDues || 0}</h3>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* USD Financial Metrics */}
          <div className="card mb-4">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0">
                <i className="fas fa-dollar-sign me-2"></i>USD Financial Metrics
              </h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-3">
                  <div className="card bg-info text-white">
                    <div className="card-body">
                      <h6 className="card-subtitle mb-2 text-white-50">Total Savings (USD)</h6>
                      <h3 className="card-title mb-0">${statistics.usd?.totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</h3>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-success text-white">
                    <div className="card-body">
                      <h6 className="card-subtitle mb-2 text-white-50">Total Loans (USD)</h6>
                      <h3 className="card-title mb-0">${statistics.usd?.totalLoans.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</h3>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-warning text-white">
                    <div className="card-body">
                      <h6 className="card-subtitle mb-2 text-white-50">Outstanding Loans (USD)</h6>
                      <h3 className="card-title mb-0">${statistics.usd?.outstandingLoans.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</h3>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-danger text-white">
                    <div className="card-body">
                      <h6 className="card-subtitle mb-2 text-white-50">Outstanding Dues (USD)</h6>
                      <h3 className="card-title mb-0">${statistics.usd?.outstandingDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</h3>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-secondary text-white">
                    <div className="card-body">
                      <h6 className="card-subtitle mb-2 text-white-50">Portfolio Value (USD)</h6>
                      <h3 className="card-title mb-0">${statistics.usd?.portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</h3>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-primary text-white">
                    <div className="card-body">
                      <h6 className="card-subtitle mb-2 text-white-50">Total Collections (USD)</h6>
                      <h3 className="card-title mb-0">${statistics.usd?.totalCollections.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</h3>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-dark text-white">
                    <div className="card-body">
                      <h6 className="card-subtitle mb-2 text-white-50">Total Fines (USD)</h6>
                      <h3 className="card-title mb-0">${statistics.usd?.totalFines.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</h3>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-info text-white">
                    <div className="card-body">
                      <h6 className="card-subtitle mb-2 text-white-50">Clients with Dues (USD)</h6>
                      <h3 className="card-title mb-0">{statistics.usd?.clientsWithOutstandingDues || 0}</h3>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Clients with Dues - Currency Separated (Admin/Head/Supervisor/Finance) */}
      {(user?.role === ROLES.ADMIN || user?.role === ROLES.HEAD_MICRO_LOAN || user?.role === ROLES.SUPERVISOR || user?.role === ROLES.FINANCE || user?.role === 'general_manager') && (clientsWithDuesLRD.length > 0 || clientsWithDuesUSD.length > 0) && (
        <div className="row mb-4">
          {/* LRD Clients with Dues */}
          {clientsWithDuesLRD.length > 0 && (
            <div className="col-md-6 mb-4">
              <div className="card">
                <div className="card-header bg-primary text-white">
                  <h5 className="mb-0">
                    <i className="fas fa-calendar-check me-2"></i>Clients with Outstanding Dues (LRD)
                  </h5>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead>
                        <tr>
                          <th>Client Number</th>
                          <th>Name</th>
                          <th>Outstanding Dues</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientsWithDuesLRD.map((client) => (
                          <tr key={client.id}>
                            <td><strong>{client.client_number}</strong></td>
                            <td>{client.first_name} {client.last_name}</td>
                            <td>
                              <strong className="text-danger">
                                LRD {Math.abs(parseFloat(client.total_dues || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </strong>
                            </td>
                            <td>
                              <Link to={`/dues`} className="btn btn-sm btn-outline-primary">
                                <i className="fas fa-money-bill-wave me-1"></i>Manage
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* USD Clients with Dues */}
          {clientsWithDuesUSD.length > 0 && (
            <div className="col-md-6 mb-4">
              <div className="card">
                <div className="card-header bg-success text-white">
                  <h5 className="mb-0">
                    <i className="fas fa-calendar-check me-2"></i>Clients with Outstanding Dues (USD)
                  </h5>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead>
                        <tr>
                          <th>Client Number</th>
                          <th>Name</th>
                          <th>Outstanding Dues</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientsWithDuesUSD.map((client) => (
                          <tr key={client.id}>
                            <td><strong>{client.client_number}</strong></td>
                            <td>{client.first_name} {client.last_name}</td>
                            <td>
                              <strong className="text-danger">
                                ${Math.abs(parseFloat(client.total_dues || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </strong>
                            </td>
                            <td>
                              <Link to={`/dues`} className="btn btn-sm btn-outline-primary">
                                <i className="fas fa-money-bill-wave me-1"></i>Manage
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
