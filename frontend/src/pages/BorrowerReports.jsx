import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';

const BorrowerReports = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    loans: [],
    savings: [],
    transactions: [],
    loanPayments: [],
    totalSavings: 0,
    totalPersonalInterest: 0,
    totalGeneralInterest: 0,
    grandTotal: 0
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

      const loans = loansRes.data.data.loans || [];
      const savings = savingsRes.data.data.savingsAccounts || [];
      const allTransactions = transactionsRes.data.data.transactions || [];
      const clients = clientsRes.data.data.clients || [];
      const client = clients.length > 0 ? clients[0] : null; // Borrower should only have one client record

      // Filter loan payment transactions
      const loanPayments = allTransactions.filter(t => 
        t.type === 'loan_payment' && t.loan_id
      );

      // Calculate totals
      const totalSavings = savings.reduce((sum, acc) => 
        sum + parseFloat(acc.balance || 0), 0
      );

      const totalPersonalInterest = allTransactions
        .filter(t => t.type === 'personal_interest_payment')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      const totalGeneralInterest = allTransactions
        .filter(t => t.type === 'general_interest')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      // Calculate dues information
      const totalDues = client ? parseFloat(client.total_dues || 0) : 0;
      const yearlyDues = Math.abs(totalDues);
      const monthlyDues = yearlyDues / 12;
      const duesPayments = allTransactions
        .filter(t => t.type === 'due_payment')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      const grandTotal = totalSavings + totalPersonalInterest + totalGeneralInterest;

      setReportData({
        loans,
        savings,
        transactions: allTransactions,
        loanPayments,
        totalSavings,
        totalPersonalInterest,
        totalGeneralInterest,
        grandTotal,
        totalDues: totalDues,
        yearlyDues: yearlyDues,
        monthlyDues: monthlyDues,
        duesPayments: duesPayments
      });
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch report data:', error);
      toast.error('Failed to load reports');
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

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-white-50">Total Savings</h6>
              <h3 className="card-title mb-0">
                ${reportData.totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-success text-white">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-white-50">Personal Interest</h6>
              <h3 className="card-title mb-0">
                ${reportData.totalPersonalInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-info text-white">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-white-50">General Interest</h6>
              <h3 className="card-title mb-0">
                ${reportData.totalGeneralInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-warning text-white">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-white-50">Grand Total</h6>
              <h3 className="card-title mb-0">
                ${reportData.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Dues Information */}
      {reportData.totalDues !== undefined && (
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div className="card bg-danger text-white">
              <div className="card-body">
                <h6 className="card-subtitle mb-2 text-white-50">Outstanding Dues</h6>
                <h3 className="card-title mb-0">
                  ${reportData.totalDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card bg-secondary text-white">
              <div className="card-body">
                <h6 className="card-subtitle mb-2 text-white-50">Total Yearly Dues</h6>
                <h3 className="card-title mb-0">
                  ${reportData.yearlyDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card bg-info text-white">
              <div className="card-body">
                <h6 className="card-subtitle mb-2 text-white-50">Monthly Dues</h6>
                <h3 className="card-title mb-0">
                  ${reportData.monthlyDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    <th>Outstanding</th>
                    <th>Total Paid</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.loans.map((loan) => (
                    <tr key={loan.id}>
                      <td><strong>{loan.loan_number}</strong></td>
                      <td>{loan.loan_type || 'N/A'}</td>
                      <td>${parseFloat(loan.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>{loan.interest_rate || 0}%</td>
                      <td>${parseFloat(loan.outstanding_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>${parseFloat(loan.total_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>
                        <span className={`badge bg-${loan.status === 'active' ? 'success' : loan.status === 'pending' ? 'warning' : 'secondary'}`}>
                          {loan.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="table-info">
                    <th colSpan="2">Total</th>
                    <th>${reportData.loans.reduce((sum, l) => sum + parseFloat(l.amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</th>
                    <th></th>
                    <th>${reportData.loans.reduce((sum, l) => sum + parseFloat(l.outstanding_balance || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</th>
                    <th>${reportData.loans.reduce((sum, l) => sum + parseFloat(l.total_paid || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</th>
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
                          ${parseFloat(account.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  <tr className="table-success">
                    <th colSpan="2">Total Savings</th>
                    <th>${reportData.totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</th>
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
                          ${parseFloat(transaction.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                          ${parseFloat(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    <th colSpan="2">Total Loan Payments</th>
                    <th>${reportData.loanPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</th>
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

