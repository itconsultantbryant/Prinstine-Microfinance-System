import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../config/axios';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import moment from 'moment';
import Receipt from '../components/Receipt';

const SavingsDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [savingsAccount, setSavingsAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [depositData, setDepositData] = useState({
    amount: '',
    description: '',
    purpose: ''
  });
  const [withdrawData, setWithdrawData] = useState({
    amount: '',
    description: '',
    purpose: ''
  });

  useEffect(() => {
    fetchSavingsAccount();
    // Real-time updates every 10 seconds
    const interval = setInterval(() => {
      fetchSavingsAccount();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [id]);

  const fetchSavingsAccount = async () => {
    try {
      const response = await apiClient.get(`/api/savings/${id}`);
      setSavingsAccount(response.data.data.savingsAccount);
      setTransactions(response.data.data.transactions || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch savings account:', error);
      toast.error('Failed to load savings account details');
      setLoading(false);
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    try {
      // Validate purpose
      if (!depositData.purpose || depositData.purpose.trim() === '') {
        toast.error('Please provide the purpose of this deposit');
        return;
      }
      
      const response = await apiClient.post(`/api/savings/${id}/deposit`, {
        ...depositData,
        purpose: depositData.purpose.trim()
      });
      toast.success('Deposit processed successfully!');
      setShowDepositModal(false);
      setDepositData({ amount: '', description: '', purpose: '' });
      setReceipt(response.data.data.receipt);
      fetchSavingsAccount();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process deposit');
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    try {
      // Validate purpose
      if (!withdrawData.purpose || withdrawData.purpose.trim() === '') {
        toast.error('Please provide the purpose of this withdrawal');
        return;
      }
      
      const response = await apiClient.post(`/api/savings/${id}/withdraw`, {
        ...withdrawData,
        purpose: withdrawData.purpose.trim()
      });
      toast.success('Withdrawal processed successfully!');
      setShowWithdrawModal(false);
      setWithdrawData({ amount: '', description: '', purpose: '' });
      setReceipt(response.data.data.receipt);
      fetchSavingsAccount();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process withdrawal');
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

  if (!savingsAccount) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">Savings account not found</p>
        <Link to="/savings" className="btn btn-primary">Back to Savings</Link>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link to="/savings" className="btn btn-outline-secondary btn-sm mb-2">
            <i className="fas fa-arrow-left me-2"></i>Back to Savings
          </Link>
          <h1 className="h3 mb-1">Savings Account {savingsAccount.account_number}</h1>
          <p className="text-muted">
            Client: <Link to={`/clients/${savingsAccount.client_id}`}>
              {savingsAccount.client?.first_name} {savingsAccount.client?.last_name}
            </Link>
          </p>
        </div>
        <div>
          {savingsAccount.status === 'active' && (
            <>
              <button
                className="btn btn-success me-2"
                onClick={() => setShowDepositModal(true)}
              >
                <i className="fas fa-plus me-2"></i>Deposit
              </button>
              <button
                className="btn btn-warning"
                onClick={() => setShowWithdrawModal(true)}
              >
                <i className="fas fa-minus me-2"></i>Withdraw
              </button>
            </>
          )}
        </div>
      </div>

      <div className="row">
        {/* Account Information */}
        <div className="col-md-6 mb-4">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0"><i className="fas fa-info-circle me-2"></i>Account Information</h5>
            </div>
            <div className="card-body">
              <table className="table table-borderless">
                <tbody>
                  <tr>
                    <th width="40%">Account Number:</th>
                    <td><strong>{savingsAccount.account_number}</strong></td>
                  </tr>
                  <tr>
                    <th>Client:</th>
                    <td>
                      <Link to={`/clients/${savingsAccount.client_id}`}>
                        {savingsAccount.client?.first_name} {savingsAccount.client?.last_name}
                      </Link>
                    </td>
                  </tr>
                  <tr>
                    <th>Account Type:</th>
                    <td>
                      <span className="badge bg-info">
                        {savingsAccount.account_type ? savingsAccount.account_type.replace('_', ' ').charAt(0).toUpperCase() + savingsAccount.account_type.replace('_', ' ').slice(1) : 'Regular'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th>Status:</th>
                    <td>
                      <span className={`badge bg-${savingsAccount.status === 'active' ? 'success' : 'secondary'}`}>
                        {savingsAccount.status}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th>Interest Rate:</th>
                    <td>{savingsAccount.interest_rate || 0}%</td>
                  </tr>
                  <tr>
                    <th>Branch:</th>
                    <td>{savingsAccount.branch?.name || '-'}</td>
                  </tr>
                  <tr>
                    <th>Opened Date:</th>
                    <td>{moment(savingsAccount.createdAt).format('YYYY-MM-DD')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Balance Information */}
        <div className="col-md-6 mb-4">
          <div className="card">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0"><i className="fas fa-wallet me-2"></i>Balance Information</h5>
            </div>
            <div className="card-body text-center">
              <div className="mb-4">
                <h2 className="text-primary mb-0">
                  ${parseFloat(savingsAccount.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
                <p className="text-muted mb-0">Current Balance</p>
              </div>
              <div className="row">
                <div className="col-6">
                  <div className="border-end">
                    <h5 className="text-success">
                      ${transactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h5>
                    <small className="text-muted">Total Deposits</small>
                  </div>
                </div>
                <div className="col-6">
                  <h5 className="text-danger">
                    ${transactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h5>
                  <small className="text-muted">Total Withdrawals</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="col-12 mb-4">
          <div className="card">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0"><i className="fas fa-history me-2"></i>Transaction History</h5>
            </div>
            <div className="card-body p-0">
              {transactions.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Transaction Number</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction) => (
                        <tr key={transaction.id}>
                          <td>{moment(transaction.transaction_date || transaction.createdAt).format('YYYY-MM-DD HH:mm')}</td>
                          <td><strong>{transaction.transaction_number}</strong></td>
                          <td>
                            <span className={`badge bg-${transaction.type === 'deposit' ? 'success' : 'warning'}`}>
                              {transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                            </span>
                          </td>
                          <td>
                            <strong className={transaction.type === 'deposit' ? 'text-success' : 'text-danger'}>
                              {transaction.type === 'deposit' ? '+' : '-'}${parseFloat(transaction.amount).toLocaleString()}
                            </strong>
                          </td>
                          <td>{transaction.description || '-'}</td>
                          <td>
                            <span className={`badge bg-${transaction.status === 'completed' ? 'success' : 'secondary'}`}>
                              {transaction.status}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => setReceipt({
                                transaction_number: transaction.transaction_number,
                                account_number: savingsAccount.account_number,
                                client_name: `${savingsAccount.client?.first_name} ${savingsAccount.client?.last_name}`,
                                type: transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal',
                                amount: transaction.amount,
                                date: transaction.transaction_date || transaction.createdAt,
                                description: transaction.description
                              })}
                            >
                              <i className="fas fa-receipt"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-5">
                  <i className="fas fa-history fa-3x text-muted mb-3 d-block"></i>
                  <p className="text-muted">No transactions found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <>
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Deposit to {savingsAccount.account_number}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowDepositModal(false)}></button>
                </div>
                <form onSubmit={handleDeposit}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Current Balance</label>
                      <div className="form-control-plaintext">
                        <strong className="text-primary">${parseFloat(savingsAccount.balance || 0).toLocaleString()}</strong>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Deposit Amount <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        className="form-control"
                        required
                        step="0.01"
                        min="0.01"
                        value={depositData.amount}
                        onChange={(e) => setDepositData({ ...depositData, amount: e.target.value })}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Purpose of Deposit <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={depositData.purpose}
                        onChange={(e) => setDepositData({ ...depositData, purpose: e.target.value })}
                        placeholder="e.g., Monthly savings, Business proceeds, etc."
                        required
                      />
                      <small className="text-muted">Please state the purpose of this deposit</small>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Additional Description (Optional)</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={depositData.description}
                        onChange={(e) => setDepositData({ ...depositData, description: e.target.value })}
                        placeholder="Any additional notes or details..."
                      />
                    </div>
                    {depositData.amount && (
                      <div className="alert alert-info">
                        <strong>New Balance:</strong> ${(parseFloat(savingsAccount.balance || 0) + parseFloat(depositData.amount || 0)).toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowDepositModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-success">
                      <i className="fas fa-plus me-2"></i>Process Deposit
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setShowDepositModal(false)} style={{ zIndex: 1040 }}></div>
        </>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <>
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Withdraw from {savingsAccount.account_number}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowWithdrawModal(false)}></button>
                </div>
                <form onSubmit={handleWithdraw}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Current Balance</label>
                      <div className="form-control-plaintext">
                        <strong className="text-primary">${parseFloat(savingsAccount.balance || 0).toLocaleString()}</strong>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Withdrawal Amount <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        className="form-control"
                        required
                        step="0.01"
                        min="0.01"
                        max={savingsAccount.balance || 0}
                        value={withdrawData.amount}
                        onChange={(e) => setWithdrawData({ ...withdrawData, amount: e.target.value })}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Purpose of Withdrawal <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={withdrawData.purpose}
                        onChange={(e) => setWithdrawData({ ...withdrawData, purpose: e.target.value })}
                        placeholder="e.g., Emergency funds, Business expenses, Personal use, etc."
                        required
                      />
                      <small className="text-muted">Please state the purpose of this withdrawal</small>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Additional Description (Optional)</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={withdrawData.description}
                        onChange={(e) => setWithdrawData({ ...withdrawData, description: e.target.value })}
                        placeholder="Any additional notes or details..."
                      />
                    </div>
                    {withdrawData.amount && (
                      <div className="alert alert-info">
                        <strong>New Balance:</strong> ${Math.max(0, parseFloat(savingsAccount.balance || 0) - parseFloat(withdrawData.amount || 0)).toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowWithdrawModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-warning">
                      <i className="fas fa-minus me-2"></i>Process Withdrawal
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setShowWithdrawModal(false)} style={{ zIndex: 1040 }}></div>
        </>
      )}

      {/* Receipt Modal */}
      {receipt && (
        <Receipt transaction={receipt} onClose={() => setReceipt(null)} />
      )}
    </div>
  );
};

export default SavingsDetail;

