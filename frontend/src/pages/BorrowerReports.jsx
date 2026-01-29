import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const BorrowerReports = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    loans: [],
    savings: [],
    transactions: [],
    loanPayments: [],
    // Overall totals
    totalSavings: 0,
    totalPersonalInterest: 0,
    totalGeneralInterest: 0,
    grandTotal: 0,
    // Currency-separated data
    lrd: {
      loans: [],
      savings: [],
      transactions: [],
      loanPayments: [],
      totalSavings: 0,
      totalPersonalInterest: 0,
      totalGeneralInterest: 0,
      outstandingDues: 0,
      outstandingLoans: 0,
      grandTotal: 0,
      overallTotalSavings: 0,
      yearlyDues: 0,
      monthlyDues: 0,
      duesPayments: 0,
      totalDues: 0
    },
    usd: {
      loans: [],
      savings: [],
      transactions: [],
      loanPayments: [],
      totalSavings: 0,
      totalPersonalInterest: 0,
      totalGeneralInterest: 0,
      outstandingDues: 0,
      outstandingLoans: 0,
      grandTotal: 0,
      overallTotalSavings: 0,
      yearlyDues: 0,
      monthlyDues: 0,
      duesPayments: 0,
      totalDues: 0
    }
  });

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [loansRes, savingsRes, transactionsRes, clientsRes] = await Promise.all([
        apiClient.get('/api/loans'),
        apiClient.get('/api/savings'),
        apiClient.get('/api/transactions', { params: { limit: 1000 } }), // Get more transactions for reports
        apiClient.get('/api/clients') // Get client data for dues
      ]);

      const loans = loansRes.data?.data?.loans ?? [];
      const savings = savingsRes.data?.data?.savingsAccounts ?? [];
      const allTransactions = transactionsRes.data?.data?.transactions ?? [];
      const clients = clientsRes.data?.data?.clients ?? [];
      const client = clients.length > 0 ? clients[0] : null; // Borrower should only have one client record

      // Filter loan payment transactions
      const loanPayments = allTransactions.filter(t => 
        t.type === 'loan_payment' && t.loan_id
      );

      // Separate data by currency (LRD and USD)
      const loansLRD = loans.filter(l => (l.currency || 'USD') === 'LRD');
      const loansUSD = loans.filter(l => (l.currency || 'USD') === 'USD');
      
      const savingsLRD = savings.filter(s => (s.currency || 'USD') === 'LRD');
      const savingsUSD = savings.filter(s => (s.currency || 'USD') === 'USD');
      
      const transactionsLRD = allTransactions.filter(t => (t.currency || 'USD') === 'LRD');
      const transactionsUSD = allTransactions.filter(t => (t.currency || 'USD') === 'USD');
      
      const loanPaymentsLRD = loanPayments.filter(t => (t.currency || 'USD') === 'LRD');
      const loanPaymentsUSD = loanPayments.filter(t => (t.currency || 'USD') === 'USD');

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

      // Calculate dues information - separated by currency
      const totalDues = client ? parseFloat(client.total_dues || 0) : 0;
      const duesCurrency = client?.dues_currency || 'USD';
      
      // Calculate outstanding loans by currency
      const outstandingLoansLRD = loansLRD.reduce((sum, loan) => 
        sum + parseFloat(loan.outstanding_balance || 0), 0
      );
      
      const outstandingLoansUSD = loansUSD.reduce((sum, loan) => 
        sum + parseFloat(loan.outstanding_balance || 0), 0
      );

      // Dues are per client (client can only have one currency for dues)
      const outstandingDuesLRD = (duesCurrency === 'LRD' && totalDues < 0) ? Math.abs(totalDues) : 0;
      const outstandingDuesUSD = (duesCurrency === 'USD' && totalDues < 0) ? Math.abs(totalDues) : 0;
      const yearlyDuesLRD = outstandingDuesLRD;
      const yearlyDuesUSD = outstandingDuesUSD;
      const monthlyDuesLRD = yearlyDuesLRD / 12;
      const monthlyDuesUSD = yearlyDuesUSD / 12;
      
      const duesPaymentsLRD = transactionsLRD
        .filter(t => t.type === 'due_payment')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      
      const duesPaymentsUSD = transactionsUSD
        .filter(t => t.type === 'due_payment')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      // Grand Total (LRD) = Total Savings + Personal Interest + General Interest - Outstanding Dues
      const grandTotalLRD = totalSavingsLRD + totalPersonalInterestLRD + totalGeneralInterestLRD - outstandingDuesLRD;
      
      // Overall Total Savings (LRD) = Grand Total - Outstanding Loans
      const overallTotalSavingsLRD = grandTotalLRD - outstandingLoansLRD;

      // Grand Total (USD) = Total Savings + Personal Interest + General Interest - Outstanding Dues
      const grandTotalUSD = totalSavingsUSD + totalPersonalInterestUSD + totalGeneralInterestUSD - outstandingDuesUSD;
      
      // Overall Total Savings (USD) = Grand Total - Outstanding Loans
      const overallTotalSavingsUSD = grandTotalUSD - outstandingLoansUSD;

      // Overall totals (for backward compatibility)
      const totalSavings = totalSavingsLRD + totalSavingsUSD;
      const totalPersonalInterest = totalPersonalInterestLRD + totalPersonalInterestUSD;
      const totalGeneralInterest = totalGeneralInterestLRD + totalGeneralInterestUSD;
      const outstandingDues = outstandingDuesLRD + outstandingDuesUSD;
      const outstandingLoans = outstandingLoansLRD + outstandingLoansUSD;
      const grandTotal = grandTotalLRD + grandTotalUSD;
      const overallTotalSavings = overallTotalSavingsLRD + overallTotalSavingsUSD;

      setReportData({
        loans,
        savings,
        transactions: allTransactions,
        loanPayments,
        // Overall totals
        totalSavings,
        totalPersonalInterest,
        totalGeneralInterest,
        grandTotal,
        overallTotalSavings,
        outstandingDues,
        outstandingLoans,
        totalDues,
        yearlyDues: outstandingDues,
        monthlyDues: outstandingDues / 12,
        duesPayments: duesPaymentsLRD + duesPaymentsUSD,
        // Currency-separated data
        lrd: {
          loans: loansLRD,
          savings: savingsLRD,
          transactions: transactionsLRD,
          loanPayments: loanPaymentsLRD,
          totalSavings: totalSavingsLRD,
          totalPersonalInterest: totalPersonalInterestLRD,
          totalGeneralInterest: totalGeneralInterestLRD,
          outstandingDues: outstandingDuesLRD,
          outstandingLoans: outstandingLoansLRD,
          grandTotal: grandTotalLRD,
          overallTotalSavings: overallTotalSavingsLRD,
          yearlyDues: yearlyDuesLRD,
          monthlyDues: monthlyDuesLRD,
          duesPayments: duesPaymentsLRD,
          totalDues: duesCurrency === 'LRD' ? totalDues : 0
        },
        usd: {
          loans: loansUSD,
          savings: savingsUSD,
          transactions: transactionsUSD,
          loanPayments: loanPaymentsUSD,
          totalSavings: totalSavingsUSD,
          totalPersonalInterest: totalPersonalInterestUSD,
          totalGeneralInterest: totalGeneralInterestUSD,
          outstandingDues: outstandingDuesUSD,
          outstandingLoans: outstandingLoansUSD,
          grandTotal: grandTotalUSD,
          overallTotalSavings: overallTotalSavingsUSD,
          yearlyDues: yearlyDuesUSD,
          monthlyDues: monthlyDuesUSD,
          duesPayments: duesPaymentsUSD,
          totalDues: duesCurrency === 'USD' ? totalDues : 0
        }
      });
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch report data:', error);
      toast.error(error.response?.data?.message || 'Failed to load reports');
      setLoading(false);
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

  return (
    <div className="fade-in">
      <div className="mb-4">
        <h1 className="h3 mb-1">My Reports</h1>
        <p className="text-muted">View your financial summary and transaction history</p>
      </div>

      {/* LRD Section */}
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0"><i className="fas fa-coins me-2"></i>LRD Financial Summary</h5>
        </div>
        <div className="card-body">
          {/* Row 1: Total Savings, Personal Interest, General Interest, Outstanding Dues, Yearly Dues, Monthly Dues */}
          <div className="row g-3 mb-3">
            <div className="col-md-4 col-lg-2">
              <div className="card bg-primary text-white">
                <div className="card-body text-center">
                  <h6 className="card-subtitle mb-2 text-white-50 small">Total Savings (LRD)</h6>
                  <h5 className="card-title mb-0">
                    LRD {reportData.lrd?.totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </h5>
                </div>
              </div>
            </div>
            <div className="col-md-4 col-lg-2">
              <div className="card bg-success text-white">
                <div className="card-body text-center">
                  <h6 className="card-subtitle mb-2 text-white-50 small">Personal Interest (LRD)</h6>
                  <h5 className="card-title mb-0">
                    LRD {reportData.lrd?.totalPersonalInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </h5>
                </div>
              </div>
            </div>
            <div className="col-md-4 col-lg-2">
              <div className="card bg-info text-white">
                <div className="card-body text-center">
                  <h6 className="card-subtitle mb-2 text-white-50 small">General Interest (LRD)</h6>
                  <h5 className="card-title mb-0">
                    LRD {reportData.lrd?.totalGeneralInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </h5>
                </div>
              </div>
            </div>
            <div className="col-md-4 col-lg-2">
              <div className="card bg-danger text-white">
                <div className="card-body text-center">
                  <h6 className="card-subtitle mb-2 text-white-50 small">Outstanding Dues (LRD)</h6>
                  <h5 className="card-title mb-0">
                    LRD {reportData.lrd?.outstandingDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </h5>
                </div>
              </div>
            </div>
            <div className="col-md-4 col-lg-2">
              <div className="card bg-secondary text-white">
                <div className="card-body text-center">
                  <h6 className="card-subtitle mb-2 text-white-50 small">Yearly Dues (LRD)</h6>
                  <h5 className="card-title mb-0">
                    LRD {reportData.lrd?.yearlyDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </h5>
                </div>
              </div>
            </div>
            <div className="col-md-4 col-lg-2">
              <div className="card bg-info text-white">
                <div className="card-body text-center">
                  <h6 className="card-subtitle mb-2 text-white-50 small">Monthly Dues (LRD)</h6>
                  <h5 className="card-title mb-0">
                    LRD {reportData.lrd?.monthlyDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </h5>
                </div>
              </div>
            </div>
          </div>
          
          {/* Row 2: Grand Total */}
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <div className="card bg-warning text-white">
                <div className="card-body text-center">
                  <h6 className="card-subtitle mb-2 text-white-50">Grand Total (LRD)</h6>
                  <h3 className="card-title mb-0">
                    LRD {reportData.lrd?.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </h3>
                  <small className="text-white-50">Savings + Personal + General - Dues</small>
                </div>
              </div>
            </div>
          </div>
          
          {/* Row 3: Grand Total Savings (Take Home) - Below */}
          <div className="row g-3">
            <div className="col-md-12">
              <div className="card bg-success text-white">
                <div className="card-body text-center">
                  <h6 className="card-subtitle mb-2 text-white-50">Grand Total Savings - Take Home (LRD)</h6>
                  <h2 className="card-title mb-0">
                    LRD {reportData.lrd?.overallTotalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </h2>
                  <small className="text-white-50">Grand Total - Outstanding Loans</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* USD Section */}
      <div className="card mb-4">
        <div className="card-header bg-success text-white">
          <h5 className="mb-0"><i className="fas fa-dollar-sign me-2"></i>USD Financial Summary</h5>
        </div>
        <div className="card-body">
          {/* Row 1: Total Savings, Personal Interest, General Interest, Outstanding Dues, Yearly Dues, Monthly Dues */}
          <div className="row g-3 mb-3">
            <div className="col-md-4 col-lg-2">
              <div className="card bg-primary text-white">
                <div className="card-body text-center">
                  <h6 className="card-subtitle mb-2 text-white-50 small">Total Savings (USD)</h6>
                  <h5 className="card-title mb-0">
                    ${reportData.usd?.totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </h5>
                </div>
              </div>
            </div>
            <div className="col-md-4 col-lg-2">
              <div className="card bg-success text-white">
                <div className="card-body text-center">
                  <h6 className="card-subtitle mb-2 text-white-50 small">Personal Interest (USD)</h6>
                  <h5 className="card-title mb-0">
                    ${reportData.usd?.totalPersonalInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </h5>
                </div>
              </div>
            </div>
            <div className="col-md-4 col-lg-2">
              <div className="card bg-info text-white">
                <div className="card-body text-center">
                  <h6 className="card-subtitle mb-2 text-white-50 small">General Interest (USD)</h6>
                  <h5 className="card-title mb-0">
                    ${reportData.usd?.totalGeneralInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </h5>
                </div>
              </div>
            </div>
            <div className="col-md-4 col-lg-2">
              <div className="card bg-danger text-white">
                <div className="card-body text-center">
                  <h6 className="card-subtitle mb-2 text-white-50 small">Outstanding Dues (USD)</h6>
                  <h5 className="card-title mb-0">
                    ${reportData.usd?.outstandingDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </h5>
                </div>
              </div>
            </div>
            <div className="col-md-4 col-lg-2">
              <div className="card bg-secondary text-white">
                <div className="card-body text-center">
                  <h6 className="card-subtitle mb-2 text-white-50 small">Yearly Dues (USD)</h6>
                  <h5 className="card-title mb-0">
                    ${reportData.usd?.yearlyDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </h5>
                </div>
              </div>
            </div>
            <div className="col-md-4 col-lg-2">
              <div className="card bg-info text-white">
                <div className="card-body text-center">
                  <h6 className="card-subtitle mb-2 text-white-50 small">Monthly Dues (USD)</h6>
                  <h5 className="card-title mb-0">
                    ${reportData.usd?.monthlyDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </h5>
                </div>
              </div>
            </div>
          </div>
          
          {/* Row 2: Grand Total */}
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <div className="card bg-warning text-white">
                <div className="card-body text-center">
                  <h6 className="card-subtitle mb-2 text-white-50">Grand Total (USD)</h6>
                  <h3 className="card-title mb-0">
                    ${reportData.usd?.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </h3>
                  <small className="text-white-50">Savings + Personal + General - Dues</small>
                </div>
              </div>
            </div>
          </div>
          
          {/* Row 3: Grand Total Savings (Take Home) - Below */}
          <div className="row g-3">
            <div className="col-md-12">
              <div className="card bg-success text-white">
                <div className="card-body text-center">
                  <h6 className="card-subtitle mb-2 text-white-50">Grand Total Savings - Take Home (USD)</h6>
                  <h2 className="card-title mb-0">
                    ${reportData.usd?.overallTotalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </h2>
                  <small className="text-white-50">Grand Total - Outstanding Loans</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loans Summary */}
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0"><i className="fas fa-hand-holding-usd me-2"></i>All My Loans</h5>
        </div>
        <div className="card-body">
          {reportData.loans.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Loan Number</th>
                        <th>Loan Type</th>
                        <th>Amount</th>
                        <th>Interest Rate</th>
                        <th>Term</th>
                        <th>Monthly Payment</th>
                        <th>Outstanding</th>
                        <th>Total Paid</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.loans.map((loan) => (
                        <tr key={loan.id}>
                          <td><strong>{loan.loan_number}</strong></td>
                          <td>
                            <span className="badge bg-primary">
                              {loan.loan_type ? loan.loan_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Personal'}
                            </span>
                          </td>
                          <td>
                            {loan.currency === 'LRD' ? 'LRD' : '$'}
                            {parseFloat(loan.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <small className="text-muted ms-1">({loan.currency || 'USD'})</small>
                          </td>
                          <td>{loan.interest_rate || 0}%</td>
                          <td>{loan.term_months || 0} months</td>
                          <td>
                            {loan.currency === 'LRD' ? 'LRD' : '$'}
                            {parseFloat(loan.monthly_payment || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td>
                            <strong className="text-danger">
                              {loan.currency === 'LRD' ? 'LRD' : '$'}
                              {parseFloat(loan.outstanding_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </strong>
                          </td>
                          <td className="text-success">
                            {loan.currency === 'LRD' ? 'LRD' : '$'}
                            {parseFloat(loan.total_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td>
                            <span className={`badge bg-${
                              loan.status === 'active' ? 'success' : 
                              loan.status === 'pending' ? 'warning' : 
                              loan.status === 'completed' ? 'info' :
                              loan.status === 'overdue' ? 'danger' : 'secondary'
                            }`}>
                              {loan.status || 'pending'}
                            </span>
                          </td>
                          <td>
                            <Link to={`/loans/${loan.id}`} className="btn btn-sm btn-outline-primary" title="View Full Details & Payment Schedule">
                              <i className="fas fa-eye me-1"></i> View Details
                            </Link>
                          </td>
                        </tr>
                      ))}
                </tbody>
                <tfoot>
                  <tr className="table-info">
                    <th colSpan="2">Total (LRD)</th>
                    <th>
                      LRD {reportData.lrd?.loans.reduce((sum, l) => sum + parseFloat(l.amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </th>
                    <th></th>
                    <th></th>
                    <th>
                      LRD {reportData.lrd?.loans.reduce((sum, l) => sum + parseFloat(l.monthly_payment || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </th>
                    <th>
                      LRD {reportData.lrd?.loans.reduce((sum, l) => sum + parseFloat(l.outstanding_balance || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </th>
                    <th>
                      LRD {reportData.lrd?.loans.reduce((sum, l) => sum + parseFloat(l.total_paid || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </th>
                    <th></th>
                    <th></th>
                  </tr>
                  <tr className="table-success">
                    <th colSpan="2">Total (USD)</th>
                    <th>
                      ${reportData.usd?.loans.reduce((sum, l) => sum + parseFloat(l.amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </th>
                    <th></th>
                    <th></th>
                    <th>
                      ${reportData.usd?.loans.reduce((sum, l) => sum + parseFloat(l.monthly_payment || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </th>
                    <th>
                      ${reportData.usd?.loans.reduce((sum, l) => sum + parseFloat(l.outstanding_balance || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </th>
                    <th>
                      ${reportData.usd?.loans.reduce((sum, l) => sum + parseFloat(l.total_paid || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </th>
                    <th></th>
                    <th></th>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-muted text-center py-3">No loans found</p>
          )}
        </div>
      </div>

      {/* Savings Summary */}
      <div className="card mb-4">
        <div className="card-header bg-success text-white">
          <h5 className="mb-0"><i className="fas fa-piggy-bank me-2"></i>Total Savings</h5>
        </div>
        <div className="card-body">
          {reportData.savings.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Account Number</th>
                    <th>Account Type</th>
                    <th>Balance</th>
                    <th>Interest Rate</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.savings.map((account) => (
                    <tr key={account.id}>
                      <td><strong>{account.account_number}</strong></td>
                      <td>{account.account_type || 'regular'}</td>
                      <td>
                        <strong className="text-success">
                          {account.currency === 'LRD' ? 'LRD' : '$'}
                          {parseFloat(account.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <small className="text-muted ms-1">({account.currency || 'USD'})</small>
                        </strong>
                      </td>
                      <td>{account.interest_rate || 0}%</td>
                      <td>
                        <span className={`badge bg-${account.status === 'active' ? 'success' : 'secondary'}`}>
                          {account.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="table-primary">
                    <th colSpan="2">Total Savings (LRD)</th>
                    <th>
                      LRD {reportData.lrd?.totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </th>
                    <th></th>
                    <th></th>
                  </tr>
                  <tr className="table-success">
                    <th colSpan="2">Total Savings (USD)</th>
                    <th>
                      ${reportData.usd?.totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </th>
                    <th></th>
                    <th></th>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-muted text-center py-3">No savings accounts found</p>
          )}
        </div>
      </div>

      {/* Payment History */}
      <div className="card mb-4">
        <div className="card-header bg-info text-white">
          <h5 className="mb-0"><i className="fas fa-history me-2"></i>Payment History</h5>
        </div>
        <div className="card-body">
          {reportData.transactions.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Transaction #</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Description</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td><strong>{transaction.transaction_number}</strong></td>
                      <td>
                        <span className={`badge bg-${
                          transaction.type === 'deposit' || transaction.type === 'personal_interest_payment' || transaction.type === 'general_interest' ? 'success' :
                          transaction.type === 'withdrawal' ? 'warning' :
                          transaction.type === 'loan_payment' ? 'primary' :
                          'secondary'
                        }`}>
                          {transaction.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </td>
                      <td>
                        <strong className={
                          transaction.type === 'deposit' || transaction.type === 'personal_interest_payment' || transaction.type === 'general_interest' ? 'text-success' :
                          transaction.type === 'withdrawal' ? 'text-danger' :
                          'text-primary'
                        }>
                          {transaction.type === 'deposit' || transaction.type === 'personal_interest_payment' || transaction.type === 'general_interest' ? '+' : '-'}
                          {transaction.currency === 'LRD' ? 'LRD' : '$'}
                          {parseFloat(transaction.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <small className="text-muted ms-1">({transaction.currency || 'USD'})</small>
                        </strong>
                      </td>
                      <td>{transaction.description || 'N/A'}</td>
                      <td>{new Date(transaction.transaction_date).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge bg-${transaction.status === 'completed' ? 'success' : 'warning'}`}>
                          {transaction.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted text-center py-3">No transactions found</p>
          )}
        </div>
      </div>

      {/* Loan Payment History */}
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0"><i className="fas fa-money-bill-wave me-2"></i>Loan Payment History</h5>
        </div>
        <div className="card-body">
          {reportData.loanPayments.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Transaction #</th>
                    <th>Loan Number</th>
                    <th>Amount</th>
                    <th>Description</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.loanPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td><strong>{payment.transaction_number}</strong></td>
                      <td>
                        {payment.loan?.loan_number || 'N/A'}
                      </td>
                      <td>
                        <strong className="text-primary">
                          {payment.currency === 'LRD' ? 'LRD' : '$'}
                          {parseFloat(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <small className="text-muted ms-1">({payment.currency || 'USD'})</small>
                        </strong>
                      </td>
                      <td>{payment.description || 'Loan payment'}</td>
                      <td>{new Date(payment.transaction_date).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge bg-${payment.status === 'completed' ? 'success' : 'warning'}`}>
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="table-primary">
                    <th colSpan="2">Total Loan Payments (LRD)</th>
                    <th>
                      LRD {reportData.lrd?.loanPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </th>
                    <th colSpan="3"></th>
                  </tr>
                  <tr className="table-success">
                    <th colSpan="2">Total Loan Payments (USD)</th>
                    <th>
                      ${reportData.usd?.loanPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </th>
                    <th colSpan="3"></th>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-muted text-center py-3">No loan payments found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BorrowerReports;

