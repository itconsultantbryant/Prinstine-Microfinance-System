import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { exportToPDF, exportToExcel, formatCurrency } from '../utils/exportUtils';
import { toast } from 'react-toastify';
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
    // Overall totals
    totalSavings: 0,
    totalPersonalInterest: 0,
    totalGeneralInterest: 0,
    totalOutstandingDues: 0,
    totalOutstandingLoans: 0,
    totalLoans: 0,
    totalFines: 0,
    outstandingSavings: 0,
    grandTotal: 0,
    overallTotalSavings: 0,
    // Currency-separated data
    lrd: {
      totalSavings: 0,
      totalPersonalInterest: 0,
      totalGeneralInterest: 0,
      totalDues: 0,
      outstandingDues: 0,
      monthlyDues: 0,
      totalLoans: 0,
      outstandingLoans: 0,
      outstandingSavings: 0,
      totalFines: 0,
      grandTotal: 0,
      overallTotalSavings: 0,
      clientsWithOutstandingDues: 0,
      clientsPaidDues: 0
    },
    usd: {
      totalSavings: 0,
      totalPersonalInterest: 0,
      totalGeneralInterest: 0,
      totalDues: 0,
      outstandingDues: 0,
      monthlyDues: 0,
      totalLoans: 0,
      outstandingLoans: 0,
      outstandingSavings: 0,
      totalFines: 0,
      grandTotal: 0,
      overallTotalSavings: 0,
      clientsWithOutstandingDues: 0,
      clientsPaidDues: 0
    }
  });
  const [revenueData, setRevenueData] = useState({
    // Overall totals
    totalRevenue: 0,
    loanRevenue: 0,
    savingsRevenue: 0,
    feesRevenue: 0,
    revenueBySource: {},
    revenues: [],
    // Currency-separated data
    lrd: {
      totalRevenue: 0,
      loanRevenue: 0,
      savingsRevenue: 0,
      feesRevenue: 0,
      revenueBySource: {}
    },
    usd: {
      totalRevenue: 0,
      loanRevenue: 0,
      savingsRevenue: 0,
      feesRevenue: 0,
      revenueBySource: {}
    }
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

      // Separate data by currency
      const savingsLRD = savings.filter(s => (s.currency || 'USD') === 'LRD');
      const savingsUSD = savings.filter(s => (s.currency || 'USD') === 'USD');
      
      const transactionsLRD = transactions.filter(t => (t.currency || 'USD') === 'LRD');
      const transactionsUSD = transactions.filter(t => (t.currency || 'USD') === 'USD');
      
      const loansLRD = loans.filter(l => (l.currency || 'USD') === 'LRD');
      const loansUSD = loans.filter(l => (l.currency || 'USD') === 'USD');
      
      const clientsLRD = clients.filter(c => (c.dues_currency || 'USD') === 'LRD');
      const clientsUSD = clients.filter(c => (c.dues_currency || 'USD') === 'USD');

      // Calculate LRD totals
      const totalSavingsLRD = savingsLRD.reduce((sum, acc) => 
        sum + parseFloat(acc.balance || 0), 0
      );

      const totalPersonalInterestLRD = transactionsLRD
        .filter(t => t.type === 'personal_interest_payment')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      const totalGeneralInterestLRD = transactionsLRD
        .filter(t => t.type === 'general_interest')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      const totalDuesLRD = clientsLRD.reduce((sum, c) => 
        sum + parseFloat(c.total_dues || 0), 0
      );

      const outstandingDuesLRD = clientsLRD
        .filter(c => parseFloat(c.total_dues || 0) < 0)
        .reduce((sum, c) => sum + Math.abs(parseFloat(c.total_dues || 0)), 0);

      const clientsWithOutstandingDuesLRD = clientsLRD.filter(c => parseFloat(c.total_dues || 0) < 0).length;
      
      const clientsPaidDuesLRD = clientsLRD.filter(c => {
        const duesPayments = transactionsLRD.filter(t => 
          t.client_id === c.id && t.type === 'due_payment'
        );
        return parseFloat(c.total_dues || 0) === 0 && duesPayments.length > 0;
      }).length;

      const totalLoansLRD = loansLRD.reduce((sum, loan) => 
        sum + parseFloat(loan.amount || 0), 0
      );

      const outstandingLoansLRD = loansLRD.reduce((sum, loan) => 
        sum + parseFloat(loan.outstanding_balance || 0), 0
      );

      const totalFinesLRD = transactionsLRD
        .filter(t => t.type === 'penalty' || t.type === 'fee')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      const monthlyDuesLRD = outstandingDuesLRD / 12;

      // Grand Total (LRD) = Total Savings + Personal Interest + General Interest - Outstanding Dues
      const grandTotalLRD = totalSavingsLRD + totalPersonalInterestLRD + totalGeneralInterestLRD - outstandingDuesLRD;
      
      // Overall Total Savings (LRD) = Grand Total - Outstanding Loans
      const overallTotalSavingsLRD = grandTotalLRD - outstandingLoansLRD;

      // Calculate USD totals
      const totalSavingsUSD = savingsUSD.reduce((sum, acc) => 
        sum + parseFloat(acc.balance || 0), 0
      );

      const totalPersonalInterestUSD = transactionsUSD
        .filter(t => t.type === 'personal_interest_payment')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      const totalGeneralInterestUSD = transactionsUSD
        .filter(t => t.type === 'general_interest')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      const totalDuesUSD = clientsUSD.reduce((sum, c) => 
        sum + parseFloat(c.total_dues || 0), 0
      );

      const outstandingDuesUSD = clientsUSD
        .filter(c => parseFloat(c.total_dues || 0) < 0)
        .reduce((sum, c) => sum + Math.abs(parseFloat(c.total_dues || 0)), 0);

      const clientsWithOutstandingDuesUSD = clientsUSD.filter(c => parseFloat(c.total_dues || 0) < 0).length;
      
      const clientsPaidDuesUSD = clientsUSD.filter(c => {
        const duesPayments = transactionsUSD.filter(t => 
          t.client_id === c.id && t.type === 'due_payment'
        );
        return parseFloat(c.total_dues || 0) === 0 && duesPayments.length > 0;
      }).length;

      const totalLoansUSD = loansUSD.reduce((sum, loan) => 
        sum + parseFloat(loan.amount || 0), 0
      );

      const outstandingLoansUSD = loansUSD.reduce((sum, loan) => 
        sum + parseFloat(loan.outstanding_balance || 0), 0
      );

      const totalFinesUSD = transactionsUSD
        .filter(t => t.type === 'penalty' || t.type === 'fee')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      const monthlyDuesUSD = outstandingDuesUSD / 12;

      // Grand Total (USD) = Total Savings + Personal Interest + General Interest - Outstanding Dues
      const grandTotalUSD = totalSavingsUSD + totalPersonalInterestUSD + totalGeneralInterestUSD - outstandingDuesUSD;
      
      // Overall Total Savings (USD) = Grand Total - Outstanding Loans
      const overallTotalSavingsUSD = grandTotalUSD - outstandingLoansUSD;

      // Overall totals (for backward compatibility)
      const totalSavings = totalSavingsLRD + totalSavingsUSD;
      const totalPersonalInterest = totalPersonalInterestLRD + totalPersonalInterestUSD;
      const totalGeneralInterest = totalGeneralInterestLRD + totalGeneralInterestUSD;
      const totalOutstandingDues = outstandingDuesLRD + outstandingDuesUSD;
      const totalOutstandingLoans = outstandingLoansLRD + outstandingLoansUSD;
      const totalLoans = totalLoansLRD + totalLoansUSD;
      const totalFines = totalFinesLRD + totalFinesUSD;
      const grandTotal = grandTotalLRD + grandTotalUSD;
      const overallTotalSavings = overallTotalSavingsLRD + overallTotalSavingsUSD;

      setFinancialSummary({
        // Overall totals
        totalSavings,
        totalPersonalInterest,
        totalGeneralInterest,
        totalOutstandingDues,
        totalOutstandingLoans,
        totalLoans,
        totalFines,
        outstandingSavings: totalSavings, // Outstanding savings = total savings
        grandTotal,
        overallTotalSavings,
        // Currency-separated data
        lrd: {
          totalSavings: totalSavingsLRD,
          totalPersonalInterest: totalPersonalInterestLRD,
          totalGeneralInterest: totalGeneralInterestLRD,
          totalDues: totalDuesLRD,
          outstandingDues: outstandingDuesLRD,
          monthlyDues: monthlyDuesLRD,
          totalLoans: totalLoansLRD,
          outstandingLoans: outstandingLoansLRD,
          outstandingSavings: totalSavingsLRD,
          totalFines: totalFinesLRD,
          grandTotal: grandTotalLRD,
          overallTotalSavings: overallTotalSavingsLRD,
          clientsWithOutstandingDues: clientsWithOutstandingDuesLRD,
          clientsPaidDues: clientsPaidDuesLRD
        },
        usd: {
          totalSavings: totalSavingsUSD,
          totalPersonalInterest: totalPersonalInterestUSD,
          totalGeneralInterest: totalGeneralInterestUSD,
          totalDues: totalDuesUSD,
          outstandingDues: outstandingDuesUSD,
          monthlyDues: monthlyDuesUSD,
          totalLoans: totalLoansUSD,
          outstandingLoans: outstandingLoansUSD,
          outstandingSavings: totalSavingsUSD,
          totalFines: totalFinesUSD,
          grandTotal: grandTotalUSD,
          overallTotalSavings: overallTotalSavingsUSD,
          clientsWithOutstandingDues: clientsWithOutstandingDuesUSD,
          clientsPaidDues: clientsPaidDuesUSD
        }
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

  const fetchRevenueData = async () => {
    try {
      const response = await apiClient.get('/api/revenue/summary');
      if (response.data.success) {
        setRevenueData(prev => ({
          // Overall totals
          totalRevenue: response.data.data.totalRevenue || 0,
          loanRevenue: response.data.data.loanRevenue || 0,
          savingsRevenue: response.data.data.savingsRevenue || 0,
          feesRevenue: response.data.data.feesRevenue || 0,
          revenueBySource: response.data.data.revenueBySource || {},
          revenues: prev.revenues || [],
          // Currency-separated data
          lrd: response.data.data.lrd || {
            totalRevenue: 0,
            loanRevenue: 0,
            savingsRevenue: 0,
            feesRevenue: 0,
            revenueBySource: {}
          },
          usd: response.data.data.usd || {
            totalRevenue: 0,
            loanRevenue: 0,
            savingsRevenue: 0,
            feesRevenue: 0,
            revenueBySource: {}
          }
        }));
      }

      // Fetch detailed revenue list
      const revenueListResponse = await apiClient.get('/api/revenue');
      if (revenueListResponse.data.success) {
        setRevenueData(prev => ({
          ...prev,
          revenues: revenueListResponse.data.data.revenues || []
        }));
      }
    } catch (error) {
      console.error('Failed to fetch revenue data:', error);
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

  const handleExportPDF = () => {
    if (!financialSummary || (!financialSummary.lrd && !financialSummary.usd)) {
      toast.error('No data available to export');
      return;
    }

    const lrd = financialSummary.lrd || {};
    const usd = financialSummary.usd || {};

    const exportData = [
      {
        'Metric': 'Total Savings (LRD)',
        'Amount': formatCurrency(lrd.totalSavings || 0, 'LRD')
      },
      {
        'Metric': 'Total Savings (USD)',
        'Amount': formatCurrency(usd.totalSavings || 0, 'USD')
      },
      {
        'Metric': 'Personal Interest (LRD)',
        'Amount': formatCurrency(lrd.totalPersonalInterest || 0, 'LRD')
      },
      {
        'Metric': 'Personal Interest (USD)',
        'Amount': formatCurrency(usd.totalPersonalInterest || 0, 'USD')
      },
      {
        'Metric': 'General Interest (LRD)',
        'Amount': formatCurrency(lrd.totalGeneralInterest || 0, 'LRD')
      },
      {
        'Metric': 'General Interest (USD)',
        'Amount': formatCurrency(usd.totalGeneralInterest || 0, 'USD')
      },
      {
        'Metric': 'Outstanding Dues (LRD)',
        'Amount': formatCurrency(lrd.outstandingDues || 0, 'LRD')
      },
      {
        'Metric': 'Outstanding Dues (USD)',
        'Amount': formatCurrency(usd.outstandingDues || 0, 'USD')
      },
      {
        'Metric': 'Outstanding Loans (LRD)',
        'Amount': formatCurrency(lrd.outstandingLoans || 0, 'LRD')
      },
      {
        'Metric': 'Outstanding Loans (USD)',
        'Amount': formatCurrency(usd.outstandingLoans || 0, 'USD')
      },
      {
        'Metric': 'Total Fines (LRD)',
        'Amount': formatCurrency(lrd.totalFines || 0, 'LRD')
      },
      {
        'Metric': 'Total Fines (USD)',
        'Amount': formatCurrency(usd.totalFines || 0, 'USD')
      },
      {
        'Metric': 'Grand Total (LRD)',
        'Amount': formatCurrency(lrd.grandTotal || 0, 'LRD')
      },
      {
        'Metric': 'Grand Total (USD)',
        'Amount': formatCurrency(usd.grandTotal || 0, 'USD')
      }
    ];

    const columns = [
      { key: 'Metric', header: 'Metric' },
      { key: 'Amount', header: 'Amount' }
    ];
    exportToPDF(exportData, columns, 'Financial Reports Summary', 'reports_summary');
    toast.success('Reports exported to PDF successfully!');
  };

  const handleExportExcel = () => {
    if (!financialSummary || (!financialSummary.lrd && !financialSummary.usd)) {
      toast.error('No data available to export');
      return;
    }

    const lrd = financialSummary.lrd || {};
    const usd = financialSummary.usd || {};

    const exportData = [
      {
        'Metric': 'Total Savings (LRD)',
        'Amount': formatCurrency(lrd.totalSavings || 0, 'LRD')
      },
      {
        'Metric': 'Total Savings (USD)',
        'Amount': formatCurrency(usd.totalSavings || 0, 'USD')
      },
      {
        'Metric': 'Personal Interest (LRD)',
        'Amount': formatCurrency(lrd.totalPersonalInterest || 0, 'LRD')
      },
      {
        'Metric': 'Personal Interest (USD)',
        'Amount': formatCurrency(usd.totalPersonalInterest || 0, 'USD')
      },
      {
        'Metric': 'General Interest (LRD)',
        'Amount': formatCurrency(lrd.totalGeneralInterest || 0, 'LRD')
      },
      {
        'Metric': 'General Interest (USD)',
        'Amount': formatCurrency(usd.totalGeneralInterest || 0, 'USD')
      },
      {
        'Metric': 'Outstanding Dues (LRD)',
        'Amount': formatCurrency(lrd.outstandingDues || 0, 'LRD')
      },
      {
        'Metric': 'Outstanding Dues (USD)',
        'Amount': formatCurrency(usd.outstandingDues || 0, 'USD')
      },
      {
        'Metric': 'Outstanding Loans (LRD)',
        'Amount': formatCurrency(lrd.outstandingLoans || 0, 'LRD')
      },
      {
        'Metric': 'Outstanding Loans (USD)',
        'Amount': formatCurrency(usd.outstandingLoans || 0, 'USD')
      },
      {
        'Metric': 'Total Fines (LRD)',
        'Amount': formatCurrency(lrd.totalFines || 0, 'LRD')
      },
      {
        'Metric': 'Total Fines (USD)',
        'Amount': formatCurrency(usd.totalFines || 0, 'USD')
      },
      {
        'Metric': 'Grand Total (LRD)',
        'Amount': formatCurrency(lrd.grandTotal || 0, 'LRD')
      },
      {
        'Metric': 'Grand Total (USD)',
        'Amount': formatCurrency(usd.grandTotal || 0, 'USD')
      }
    ];

    const columns = [
      { key: 'Metric', header: 'Metric' },
      { key: 'Amount', header: 'Amount' }
    ];
    exportToExcel(exportData, columns, 'Financial Reports', 'reports_summary');
    toast.success('Reports exported to Excel successfully!');
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">Reports & Analytics</h1>
        </div>
        <div className="btn-group">
          <button
            className="btn btn-success hover-lift"
            onClick={handleExportExcel}
            title="Export to Excel"
          >
            <i className="fas fa-file-excel me-2"></i>Export Excel
          </button>
          <button
            className="btn btn-danger hover-lift"
            onClick={handleExportPDF}
            title="Export to PDF"
          >
            <i className="fas fa-file-pdf me-2"></i>Export PDF
          </button>
        </div>
      </div>
      <p className="text-muted mb-4">Comprehensive system reports</p>

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
          {/* LRD Financial Summary */}
          <div className="col-md-12 mb-4">
            <div className="card">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0"><i className="fas fa-coins me-2"></i>LRD Financial Reports</h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-2">
                    <div className="card bg-primary text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Total Savings</h6>
                        <h5 className="card-title mb-0">
                          LRD {financialSummary.lrd?.totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-success text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Personal Interest</h6>
                        <h5 className="card-title mb-0">
                          LRD {financialSummary.lrd?.totalPersonalInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-info text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">General Interest</h6>
                        <h5 className="card-title mb-0">
                          LRD {financialSummary.lrd?.totalGeneralInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-danger text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Outstanding Dues</h6>
                        <h5 className="card-title mb-0">
                          LRD {financialSummary.lrd?.outstandingDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-secondary text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Monthly Dues</h6>
                        <h5 className="card-title mb-0">
                          LRD {financialSummary.lrd?.monthlyDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-warning text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Grand Total</h6>
                        <h5 className="card-title mb-0">
                          LRD {financialSummary.lrd?.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-dark text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Total Loans</h6>
                        <h5 className="card-title mb-0">
                          LRD {financialSummary.lrd?.totalLoans.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-danger text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Outstanding Loans</h6>
                        <h5 className="card-title mb-0">
                          LRD {financialSummary.lrd?.outstandingLoans.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-info text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Outstanding Savings</h6>
                        <h5 className="card-title mb-0">
                          LRD {financialSummary.lrd?.outstandingSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-secondary text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Total Fines</h6>
                        <h5 className="card-title mb-0">
                          LRD {financialSummary.lrd?.totalFines.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-warning text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Clients with Dues</h6>
                        <h5 className="card-title mb-0">
                          {financialSummary.lrd?.clientsWithOutstandingDues || 0}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-success text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Clients Paid Dues</h6>
                        <h5 className="card-title mb-0">
                          {financialSummary.lrd?.clientsPaidDues || 0}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-12 mt-3">
                    <div className="card bg-success text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50">Grand Total Savings (LRD)</h6>
                        <h2 className="card-title mb-0">
                          LRD {financialSummary.lrd?.overallTotalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h2>
                        <small className="text-white-50">Grand Total - Outstanding Loans</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* USD Financial Summary */}
          <div className="col-md-12 mb-4">
            <div className="card">
              <div className="card-header bg-success text-white">
                <h5 className="mb-0"><i className="fas fa-dollar-sign me-2"></i>USD Financial Reports</h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-2">
                    <div className="card bg-primary text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Total Savings</h6>
                        <h5 className="card-title mb-0">
                          ${financialSummary.usd?.totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-success text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Personal Interest</h6>
                        <h5 className="card-title mb-0">
                          ${financialSummary.usd?.totalPersonalInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-info text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">General Interest</h6>
                        <h5 className="card-title mb-0">
                          ${financialSummary.usd?.totalGeneralInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-danger text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Outstanding Dues</h6>
                        <h5 className="card-title mb-0">
                          ${financialSummary.usd?.outstandingDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-secondary text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Monthly Dues</h6>
                        <h5 className="card-title mb-0">
                          ${financialSummary.usd?.monthlyDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-warning text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Grand Total</h6>
                        <h5 className="card-title mb-0">
                          ${financialSummary.usd?.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-dark text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Total Loans</h6>
                        <h5 className="card-title mb-0">
                          ${financialSummary.usd?.totalLoans.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-danger text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Outstanding Loans</h6>
                        <h5 className="card-title mb-0">
                          ${financialSummary.usd?.outstandingLoans.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-info text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Outstanding Savings</h6>
                        <h5 className="card-title mb-0">
                          ${financialSummary.usd?.outstandingSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-secondary text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Total Fines</h6>
                        <h5 className="card-title mb-0">
                          ${financialSummary.usd?.totalFines.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-warning text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Clients with Dues</h6>
                        <h5 className="card-title mb-0">
                          {financialSummary.usd?.clientsWithOutstandingDues || 0}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-success text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Clients Paid Dues</h6>
                        <h5 className="card-title mb-0">
                          {financialSummary.usd?.clientsPaidDues || 0}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-12 mt-3">
                    <div className="card bg-success text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50">Grand Total Savings (USD)</h6>
                        <h2 className="card-title mb-0">
                          ${financialSummary.usd?.overallTotalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h2>
                        <small className="text-white-50">Grand Total - Outstanding Loans</small>
                      </div>
                    </div>
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
                  <>
                    {/* LRD Portfolio Summary */}
                    <div className="row mb-4">
                      <div className="col-12 mb-3">
                        <h6 className="text-primary"><i className="fas fa-coins me-2"></i>LRD Portfolio</h6>
                      </div>
                      <div className="col-6 mb-3">
                        <div className="stat-card">
                          <div className="stat-label">Total Portfolio (LRD)</div>
                          <div className="stat-value text-primary">
                            LRD {(dashboardStats.statistics.lrd?.portfolioValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                      <div className="col-6 mb-3">
                        <div className="stat-card">
                          <div className="stat-label">Outstanding Loans (LRD)</div>
                          <div className="stat-value text-danger">
                            LRD {(dashboardStats.statistics.lrd?.outstandingLoans || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                      <div className="col-6 mb-3">
                        <div className="stat-card">
                          <div className="stat-label">Total Loans (LRD)</div>
                          <div className="stat-value text-success">
                            LRD {(dashboardStats.statistics.lrd?.totalLoans || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                      <div className="col-6 mb-3">
                        <div className="stat-card">
                          <div className="stat-label">Total Collections (LRD)</div>
                          <div className="stat-value text-info">
                            LRD {(dashboardStats.statistics.lrd?.totalCollections || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* USD Portfolio Summary */}
                    <div className="row mb-4">
                      <div className="col-12 mb-3">
                        <h6 className="text-success"><i className="fas fa-dollar-sign me-2"></i>USD Portfolio</h6>
                      </div>
                      <div className="col-6 mb-3">
                        <div className="stat-card">
                          <div className="stat-label">Total Portfolio (USD)</div>
                          <div className="stat-value text-primary">
                            ${(dashboardStats.statistics.usd?.portfolioValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                      <div className="col-6 mb-3">
                        <div className="stat-card">
                          <div className="stat-label">Outstanding Loans (USD)</div>
                          <div className="stat-value text-danger">
                            ${(dashboardStats.statistics.usd?.outstandingLoans || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                      <div className="col-6 mb-3">
                        <div className="stat-card">
                          <div className="stat-label">Total Loans (USD)</div>
                          <div className="stat-value text-success">
                            ${(dashboardStats.statistics.usd?.totalLoans || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                      <div className="col-6 mb-3">
                        <div className="stat-card">
                          <div className="stat-label">Total Collections (USD)</div>
                          <div className="stat-value text-info">
                            ${(dashboardStats.statistics.usd?.totalCollections || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Overall Portfolio Summary */}
                    <div className="row">
                      <div className="col-12 mb-3">
                        <h6 className="text-secondary"><i className="fas fa-chart-line me-2"></i>Overall Portfolio</h6>
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
                  </>
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
              <>
                {/* LRD Client Reports */}
                <div className="row mb-4">
                  <div className="col-12 mb-3">
                    <h6 className="text-primary"><i className="fas fa-coins me-2"></i>LRD Client Reports</h6>
                  </div>
                  <div className="col-md-3 mb-4">
                    <div className="stat-card">
                      <div className="stat-label">Total Savings (LRD)</div>
                      <div className="stat-value text-info">
                        LRD {(dashboardStats.statistics.lrd?.totalSavings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3 mb-4">
                    <div className="stat-card">
                      <div className="stat-label">Outstanding Savings (LRD)</div>
                      <div className="stat-value text-success">
                        LRD {(dashboardStats.statistics.lrd?.outstandingSavings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3 mb-4">
                    <div className="stat-card">
                      <div className="stat-label">Total Dues (LRD)</div>
                      <div className="stat-value text-danger">
                        LRD {(dashboardStats.statistics.lrd?.totalDues || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3 mb-4">
                    <div className="stat-card">
                      <div className="stat-label">Outstanding Dues (LRD)</div>
                      <div className="stat-value text-danger">
                        LRD {(dashboardStats.statistics.lrd?.outstandingDues || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3 mb-4">
                    <div className="stat-card">
                      <div className="stat-label">Monthly Dues (LRD)</div>
                      <div className="stat-value text-warning">
                        LRD {(dashboardStats.statistics.lrd?.monthlyDues || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3 mb-4">
                    <div className="stat-card">
                      <div className="stat-label">Clients with Dues (LRD)</div>
                      <div className="stat-value text-danger">
                        {dashboardStats.statistics.lrd?.clientsWithOutstandingDues || 0}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3 mb-4">
                    <div className="stat-card">
                      <div className="stat-label">Clients Paid Dues (LRD)</div>
                      <div className="stat-value text-success">
                        {dashboardStats.statistics.lrd?.clientsPaidDues || 0}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3 mb-4">
                    <div className="stat-card">
                      <div className="stat-label">Total Fines (LRD)</div>
                      <div className="stat-value text-secondary">
                        LRD {(dashboardStats.statistics.lrd?.totalFines || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* USD Client Reports */}
                <div className="row mb-4">
                  <div className="col-12 mb-3">
                    <h6 className="text-success"><i className="fas fa-dollar-sign me-2"></i>USD Client Reports</h6>
                  </div>
                  <div className="col-md-3 mb-4">
                    <div className="stat-card">
                      <div className="stat-label">Total Savings (USD)</div>
                      <div className="stat-value text-info">
                        ${(dashboardStats.statistics.usd?.totalSavings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3 mb-4">
                    <div className="stat-card">
                      <div className="stat-label">Outstanding Savings (USD)</div>
                      <div className="stat-value text-success">
                        ${(dashboardStats.statistics.usd?.outstandingSavings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3 mb-4">
                    <div className="stat-card">
                      <div className="stat-label">Total Dues (USD)</div>
                      <div className="stat-value text-danger">
                        ${(dashboardStats.statistics.usd?.totalDues || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3 mb-4">
                    <div className="stat-card">
                      <div className="stat-label">Outstanding Dues (USD)</div>
                      <div className="stat-value text-danger">
                        ${(dashboardStats.statistics.usd?.outstandingDues || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3 mb-4">
                    <div className="stat-card">
                      <div className="stat-label">Monthly Dues (USD)</div>
                      <div className="stat-value text-warning">
                        ${(dashboardStats.statistics.usd?.monthlyDues || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3 mb-4">
                    <div className="stat-card">
                      <div className="stat-label">Clients with Dues (USD)</div>
                      <div className="stat-value text-danger">
                        {dashboardStats.statistics.usd?.clientsWithOutstandingDues || 0}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3 mb-4">
                    <div className="stat-card">
                      <div className="stat-label">Clients Paid Dues (USD)</div>
                      <div className="stat-value text-success">
                        {dashboardStats.statistics.usd?.clientsPaidDues || 0}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3 mb-4">
                    <div className="stat-card">
                      <div className="stat-label">Total Fines (USD)</div>
                      <div className="stat-value text-secondary">
                        ${(dashboardStats.statistics.usd?.totalFines || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overall Client Reports */}
                <div className="row">
                  <div className="col-12 mb-3">
                    <h6 className="text-secondary"><i className="fas fa-users me-2"></i>Overall Client Reports</h6>
                  </div>
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
                      <div className="stat-label">Total Transactions</div>
                      <div className="stat-value text-warning">
                        {dashboardStats.statistics.totalTransactions || 0}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-muted py-5">
                No data available
              </div>
            )}
          </div>
        </div>
      )}

      {/* Revenue Reports */}
      {reportType === 'revenue' && (
        <div className="row">
          {/* LRD Revenue Summary */}
          <div className="col-md-12 mb-4">
            <div className="card">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0"><i className="fas fa-coins me-2"></i>LRD Revenue Reports</h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-3">
                    <div className="card bg-primary text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50">Total Revenue (LRD)</h6>
                        <h3 className="card-title mb-0">
                          LRD {revenueData.lrd?.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card bg-success text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50">Loan Revenue (LRD)</h6>
                        <h3 className="card-title mb-0">
                          LRD {revenueData.lrd?.loanRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card bg-info text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50">Savings Revenue (LRD)</h6>
                        <h3 className="card-title mb-0">
                          LRD {revenueData.lrd?.savingsRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card bg-warning text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50">Fees Revenue (LRD)</h6>
                        <h3 className="card-title mb-0">
                          LRD {revenueData.lrd?.feesRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h3>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* USD Revenue Summary */}
          <div className="col-md-12 mb-4">
            <div className="card">
              <div className="card-header bg-success text-white">
                <h5 className="mb-0"><i className="fas fa-dollar-sign me-2"></i>USD Revenue Reports</h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-3">
                    <div className="card bg-primary text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50">Total Revenue (USD)</h6>
                        <h3 className="card-title mb-0">
                          ${revenueData.usd?.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card bg-success text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50">Loan Revenue (USD)</h6>
                        <h3 className="card-title mb-0">
                          ${revenueData.usd?.loanRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card bg-info text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50">Savings Revenue (USD)</h6>
                        <h3 className="card-title mb-0">
                          ${revenueData.usd?.savingsRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card bg-warning text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50">Fees Revenue (USD)</h6>
                        <h3 className="card-title mb-0">
                          ${revenueData.usd?.feesRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h3>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Details Table */}
          <div className="col-md-12 mb-4">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0"><i className="fas fa-list me-2"></i>Revenue Details</h5>
              </div>
              <div className="card-body">
                {revenueData.revenues.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Revenue Number</th>
                          <th>Source</th>
                          <th>Amount (Currency)</th>
                          <th>Loan Number</th>
                          <th>Transaction Number</th>
                          <th>Date</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revenueData.revenues.map((revenue) => (
                          <tr key={revenue.id}>
                            <td><strong>{revenue.revenue_number}</strong></td>
                            <td>
                              <span className="badge bg-primary">
                                {revenue.source ? revenue.source.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Other'}
                              </span>
                            </td>
                            <td>
                              {revenue.currency === 'LRD' ? 'LRD' : '$'}
                              {parseFloat(revenue.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              <small className="text-muted ms-1">({revenue.currency || 'USD'})</small>
                            </td>
                            <td>{revenue.loan?.loan_number || 'N/A'}</td>
                            <td>{revenue.transaction?.transaction_number || 'N/A'}</td>
                            <td>{new Date(revenue.revenue_date).toLocaleDateString()}</td>
                            <td>{revenue.description || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="table-primary">
                          <th colSpan="2">Total Revenue (LRD)</th>
                          <th>
                            LRD {revenueData.revenues.filter(r => (r.currency || 'USD') === 'LRD').reduce((sum, r) => sum + parseFloat(r.amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                          </th>
                          <th colSpan="4"></th>
                        </tr>
                        <tr className="table-success">
                          <th colSpan="2">Total Revenue (USD)</th>
                          <th>
                            ${revenueData.revenues.filter(r => (r.currency || 'USD') === 'USD').reduce((sum, r) => sum + parseFloat(r.amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                          </th>
                          <th colSpan="4"></th>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted text-center py-3">No revenue data available</p>
                )}
              </div>
            </div>
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
