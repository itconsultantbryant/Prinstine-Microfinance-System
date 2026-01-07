import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import Receipt from '../components/Receipt';

const Dues = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0]
  });
  const [receipt, setReceipt] = useState(null);
  const [duesHistory, setDuesHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    fetchClients();
    
    // Real-time updates every 5 seconds
    const interval = setInterval(() => {
      fetchClients();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [search]);

  const fetchClients = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      
      const response = await apiClient.get('/api/clients', { params });
      // Filter clients with dues (negative total_dues)
      const clientsWithDues = (response.data.data.clients || []).filter(
        client => parseFloat(client.total_dues || 0) < 0
      );
      setClients(clientsWithDues);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      toast.error('Failed to load clients');
      setLoading(false);
    }
  };

  const fetchDuesHistory = async (clientId) => {
    try {
      const response = await apiClient.get('/api/transactions', { 
        params: { 
          limit: 1000,
          client_id: clientId 
        } 
      });
      const duesPayments = (response.data.data.transactions || []).filter(
        t => t.type === 'due_payment'
      );
      setDuesHistory(duesPayments);
      setShowHistoryModal(true);
    } catch (error) {
      console.error('Failed to fetch dues history:', error);
      toast.error('Failed to load dues payment history');
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      const paymentAmount = parseFloat(paymentData.amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        toast.error('Please enter a valid payment amount');
        return;
      }

      const currentDues = parseFloat(selectedClient.total_dues || 0);
      if (paymentAmount > Math.abs(currentDues)) {
        toast.error('Payment amount cannot exceed outstanding dues');
        return;
      }

      const response = await apiClient.post('/api/transactions', {
        client_id: selectedClient.id,
        type: 'due_payment',
        amount: paymentAmount,
        description: paymentData.description || `Monthly dues payment for ${selectedClient.first_name} ${selectedClient.last_name}`,
        transaction_date: paymentData.transaction_date
      });

      toast.success('Dues payment processed successfully!');
      setShowPaymentModal(false);
      setPaymentData({
        amount: '',
        description: '',
        transaction_date: new Date().toISOString().split('T')[0]
      });
      
      if (response.data.data.receipt) {
        setReceipt(response.data.data.receipt);
      }
      
      fetchClients();
    } catch (error) {
      console.error('Failed to process dues payment:', error);
      toast.error(error.response?.data?.message || 'Failed to process dues payment');
    }
  };

  const getMonthlyDues = (totalDues) => {
    // Calculate monthly dues (total yearly dues / 12)
    const yearlyDues = Math.abs(parseFloat(totalDues || 0));
    return yearlyDues / 12;
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">Client Dues Management</h1>
          <p className="text-muted">View and manage client annual dues payments</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-12">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search clients by name, email, or client number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clients with Dues Table */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Client Number</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Total Yearly Dues</th>
                    <th>Monthly Dues</th>
                    <th>Outstanding Dues</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.length > 0 ? (
                    clients.map((client) => {
                      const totalYearlyDues = Math.abs(parseFloat(client.total_dues || 0));
                      const monthlyDues = getMonthlyDues(client.total_dues);
                      const outstandingDues = parseFloat(client.total_dues || 0);
                      
                      return (
                        <tr key={client.id} className="hover-lift">
                          <td><strong>{client.client_number}</strong></td>
                          <td>{client.first_name} {client.last_name}</td>
                          <td>{client.email}</td>
                          <td>
                            <strong className="text-primary">
                              ${totalYearlyDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </strong>
                          </td>
                          <td>
                            ${monthlyDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td>
                            <strong className={outstandingDues < 0 ? 'text-danger' : 'text-success'}>
                              ${outstandingDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </strong>
                          </td>
                          <td>
                            <span className={`badge bg-${outstandingDues < 0 ? 'warning' : 'success'}`}>
                              {outstandingDues < 0 ? 'Outstanding' : 'Paid'}
                            </span>
                          </td>
                          <td>
                            <div className="btn-group">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => {
                                  setSelectedClient(client);
                                  setShowPaymentModal(true);
                                }}
                                title="Make Payment"
                                disabled={outstandingDues >= 0}
                              >
                                <i className="fas fa-money-bill-wave"></i> Pay
                              </button>
                              <button
                                className="btn btn-sm btn-outline-info"
                                onClick={() => fetchDuesHistory(client.id)}
                                title="View Payment History"
                              >
                                <i className="fas fa-history"></i> History
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center text-muted py-5">
                        <i className="fas fa-users fa-3x mb-3 d-block"></i>
                        No clients with outstanding dues found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedClient && (
        <>
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Pay Dues - {selectedClient.first_name} {selectedClient.last_name}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowPaymentModal(false)}></button>
                </div>
                <form onSubmit={handlePayment}>
                  <div className="modal-body">
                    <div className="alert alert-info">
                      <strong>Outstanding Dues:</strong> ${Math.abs(parseFloat(selectedClient.total_dues || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <br />
                      <strong>Monthly Dues:</strong> ${getMonthlyDues(selectedClient.total_dues).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Payment Amount <span className="text-danger">*</span></label>
                        <input
                          type="number"
                          className="form-control"
                          value={paymentData.amount}
                          onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                          min="0.01"
                          step="0.01"
                          max={Math.abs(parseFloat(selectedClient.total_dues || 0))}
                          required
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Payment Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={paymentData.transaction_date}
                          onChange={(e) => setPaymentData({ ...paymentData, transaction_date: e.target.value })}
                        />
                      </div>
                      <div className="col-md-12 mb-3">
                        <label className="form-label">Description</label>
                        <textarea
                          className="form-control"
                          value={paymentData.description}
                          onChange={(e) => setPaymentData({ ...paymentData, description: e.target.value })}
                          rows="3"
                          placeholder="Monthly dues payment..."
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      <i className="fas fa-money-bill-wave me-2"></i>Process Payment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setShowPaymentModal(false)} style={{ zIndex: 1040 }}></div>
        </>
      )}

      {/* Payment History Modal */}
      {showHistoryModal && selectedClient && (
        <>
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-xl">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Dues Payment History - {selectedClient.first_name} {selectedClient.last_name}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowHistoryModal(false)}></button>
                </div>
                <div className="modal-body">
                  {duesHistory.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Transaction #</th>
                            <th>Amount</th>
                            <th>Description</th>
                            <th>Date</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {duesHistory.map((payment) => (
                            <tr key={payment.id}>
                              <td><strong>{payment.transaction_number}</strong></td>
                              <td>
                                <strong className="text-success">
                                  ${parseFloat(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </strong>
                              </td>
                              <td>{payment.description || 'Dues payment'}</td>
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
                          <tr className="table-success">
                            <th>Total Paid</th>
                            <th>
                              ${duesHistory.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </th>
                            <th colSpan="3"></th>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <p className="text-muted text-center py-3">No dues payment history found</p>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowHistoryModal(false)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setShowHistoryModal(false)} style={{ zIndex: 1040 }}></div>
        </>
      )}

      {/* Receipt Modal */}
      {receipt && (
        <Receipt
          receipt={receipt}
          onClose={() => setReceipt(null)}
          onPrint={() => toast.success('Receipt printed!')}
          onDownload={() => toast.success('Receipt downloaded!')}
        />
      )}
    </div>
  );
};

export default Dues;

