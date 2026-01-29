import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import Receipt from '../components/Receipt';
import { exportToPDF, exportToExcel, formatDate, formatCurrency } from '../utils/exportUtils';

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
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [editFormData, setEditFormData] = useState({
    total_dues: '',
    dues_currency: 'USD'
  });

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
      const params = { all: 'true' }; // Fetch all clients
      if (search) params.search = search;
      
      const response = await apiClient.get('/api/clients', { params });
      // Filter clients with dues (negative total_dues)
      const clientsWithDues = (response.data?.data?.clients ?? []).filter(
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

  const handleView = async (clientId) => {
    try {
      const response = await apiClient.get(`/api/clients/${clientId}`);
      setSelectedClient(response.data?.data?.client ?? null);
      setShowViewModal(true);
    } catch (error) {
      console.error('Failed to fetch client details:', error);
      toast.error('Failed to load client details');
    }
  };

  const handleEdit = async (clientId) => {
    try {
      const response = await apiClient.get(`/api/clients/${clientId}`);
      const client = response.data?.data?.client;
      if (!client) {
        toast.error('Client not found');
        return;
      }
      setEditingClient(client);
      setEditFormData({
        total_dues: Math.abs(parseFloat(client.total_dues || 0)),
        dues_currency: client.dues_currency || 'USD'
      });
      setShowEditModal(true);
    } catch (error) {
      console.error('Failed to fetch client details:', error);
      toast.error(error.response?.data?.message || 'Failed to load client details');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const totalDues = -Math.abs(parseFloat(editFormData.total_dues || 0)); // Make negative
      await apiClient.put(`/api/clients/${editingClient.id}`, {
        total_dues: totalDues,
        dues_currency: editFormData.dues_currency
      });
      toast.success('Dues updated successfully!');
      setShowEditModal(false);
      setEditingClient(null);
      await fetchClients();
    } catch (error) {
      console.error('Failed to update dues:', error);
      toast.error(error.response?.data?.message || 'Failed to update dues');
    }
  };

  const handleDelete = async (clientId) => {
    if (!window.confirm('Are you sure you want to delete this client? This will delete all their financial records including dues. This action can be undone from the recycle bin.')) {
      return;
    }

    try {
      await apiClient.delete(`/api/clients/${clientId}`);
      toast.success('Client and all financial records deleted successfully');
      // Immediate refresh
      await fetchClients();
    } catch (error) {
      console.error('Failed to delete client:', error);
      toast.error(error.response?.data?.message || 'Failed to delete client');
    }
  };

  const handleExportPDF = () => {
    const columns = [
      { key: 'client_number', header: 'Client Number' },
      { key: 'first_name', header: 'First Name' },
      { key: 'last_name', header: 'Last Name' },
      { key: 'email', header: 'Email' },
      { key: 'phone', header: 'Phone' },
      { key: 'total_dues', header: 'Total Dues', format: (value, row) => formatCurrency(Math.abs(value || 0), row.dues_currency || 'USD') },
      { key: 'dues_currency', header: 'Currency' },
      { key: 'status', header: 'Status' },
      { key: 'createdAt', header: 'Created At', format: formatDate }
    ];
    exportToPDF(clients.filter(c => (c.total_dues || 0) > 0), columns, 'Client Dues Report', 'dues_report');
    toast.success('Dues exported to PDF successfully!');
  };

  const handleExportExcel = () => {
    const columns = [
      { key: 'client_number', header: 'Client Number' },
      { key: 'first_name', header: 'First Name' },
      { key: 'last_name', header: 'Last Name' },
      { key: 'email', header: 'Email' },
      { key: 'phone', header: 'Phone' },
      { key: 'total_dues', header: 'Total Dues', format: (value, row) => formatCurrency(Math.abs(value || 0), row.dues_currency || 'USD') },
      { key: 'dues_currency', header: 'Currency' },
      { key: 'status', header: 'Status' },
      { key: 'createdAt', header: 'Created At', format: formatDate }
    ];
    exportToExcel(clients.filter(c => (c.total_dues || 0) > 0), columns, 'Client Dues', 'dues_report');
    toast.success('Dues exported to Excel successfully!');
  };

  const fetchDuesHistory = async (clientId) => {
    try {
      const response = await apiClient.get('/api/transactions', { 
        params: { 
          limit: 1000,
          client_id: clientId 
        } 
      });
      const duesPayments = (response.data?.data?.transactions ?? []).filter(
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
      
      const receiptData = response.data?.data?.receipt;
      if (receiptData) {
        setReceipt(receiptData);
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
                              {(client.dues_currency === 'LRD' ? 'LRD' : '$')}{totalYearlyDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </strong>
                          </td>
                          <td>
                            {(client.dues_currency === 'LRD' ? 'LRD' : '$')}{monthlyDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td>
                            <strong className={outstandingDues < 0 ? 'text-danger' : 'text-success'}>
                              {(client.dues_currency === 'LRD' ? 'LRD' : '$')}{outstandingDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                className="btn btn-sm btn-outline-info"
                                onClick={() => handleView(client.id)}
                                title="View Details"
                              >
                                <i className="fas fa-eye"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleEdit(client.id)}
                                title="Edit Dues"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-success"
                                onClick={() => {
                                  setSelectedClient(client);
                                  setShowPaymentModal(true);
                                }}
                                title="Make Payment"
                                disabled={outstandingDues >= 0}
                              >
                                <i className="fas fa-money-bill-wave"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => fetchDuesHistory(client.id)}
                                title="View Payment History"
                              >
                                <i className="fas fa-history"></i>
                              </button>
                              {user?.role === 'admin' && (
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDelete(client.id)}
                                  title="Delete Client"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              )}
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
                      <strong>Outstanding Dues:</strong> {(selectedClient.dues_currency === 'LRD' ? 'LRD' : '$')}{Math.abs(parseFloat(selectedClient.total_dues || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <br />
                      <strong>Monthly Dues:</strong> {(selectedClient.dues_currency === 'LRD' ? 'LRD' : '$')}{getMonthlyDues(selectedClient.total_dues).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                            <th>Currency</th>
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
                                  {(payment.currency === 'LRD' ? 'LRD' : '$')}{parseFloat(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </strong>
                              </td>
                              <td>{payment.currency || 'USD'}</td>
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
                              {(selectedClient.dues_currency === 'LRD' ? 'LRD' : '$')}{duesHistory.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </th>
                            <th colSpan="4"></th>
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

      {/* View Client Modal */}
      {showViewModal && selectedClient && (
        <>
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title">
                    <i className="fas fa-eye me-2"></i>Client Details - {selectedClient.first_name} {selectedClient.last_name}
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => {
                    setShowViewModal(false);
                    setSelectedClient(null);
                  }}></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-bold text-muted">Client Number</label>
                      <p className="form-control-plaintext"><strong>{selectedClient.client_number}</strong></p>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-bold text-muted">Name</label>
                      <p className="form-control-plaintext">{selectedClient.first_name} {selectedClient.last_name}</p>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-bold text-muted">Email</label>
                      <p className="form-control-plaintext">{selectedClient.email}</p>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-bold text-muted">Phone</label>
                      <p className="form-control-plaintext">{selectedClient.phone || 'N/A'}</p>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-bold text-muted">Total Yearly Dues</label>
                      <p className="form-control-plaintext">
                        <strong className="text-primary">
                          {selectedClient.dues_currency === 'LRD' ? 'LRD' : '$'}{Math.abs(parseFloat(selectedClient.total_dues || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </p>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-bold text-muted">Monthly Dues</label>
                      <p className="form-control-plaintext">
                        {selectedClient.dues_currency === 'LRD' ? 'LRD' : '$'}{getMonthlyDues(selectedClient.total_dues).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-bold text-muted">Outstanding Dues</label>
                      <p className="form-control-plaintext">
                        <strong className={parseFloat(selectedClient.total_dues || 0) < 0 ? 'text-danger' : 'text-success'}>
                          {selectedClient.dues_currency === 'LRD' ? 'LRD' : '$'}{parseFloat(selectedClient.total_dues || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </p>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-bold text-muted">Dues Currency</label>
                      <p className="form-control-plaintext">{selectedClient.dues_currency || 'USD'}</p>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-bold text-muted">Status</label>
                      <p className="form-control-plaintext">
                        <span className={`badge bg-${selectedClient.status === 'active' ? 'success' : 'secondary'}`}>
                          {selectedClient.status}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => {
                    setShowViewModal(false);
                    setSelectedClient(null);
                  }}>
                    Close
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => {
                    setShowViewModal(false);
                    handleEdit(selectedClient.id);
                  }}>
                    <i className="fas fa-edit me-2"></i>Edit Dues
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => {
            setShowViewModal(false);
            setSelectedClient(null);
          }} style={{ zIndex: 1040 }}></div>
        </>
      )}

      {/* Edit Dues Modal */}
      {showEditModal && editingClient && (
        <>
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title">
                    <i className="fas fa-edit me-2"></i>Edit Dues - {editingClient.first_name} {editingClient.last_name}
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => {
                    setShowEditModal(false);
                    setEditingClient(null);
                  }}></button>
                </div>
                <form onSubmit={handleUpdate}>
                  <div className="modal-body">
                    <div className="alert alert-info">
                      <strong>Current Outstanding Dues:</strong> {editingClient.dues_currency === 'LRD' ? 'LRD' : '$'}{Math.abs(parseFloat(editingClient.total_dues || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Total Yearly Dues <span className="text-danger">*</span></label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          value={editFormData.total_dues}
                          onChange={(e) => setEditFormData({ ...editFormData, total_dues: e.target.value })}
                          min="0"
                          required
                        />
                        <small className="text-muted">Enter the total yearly dues amount (will be stored as negative)</small>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Currency <span className="text-danger">*</span></label>
                        <select
                          className="form-select"
                          value={editFormData.dues_currency}
                          onChange={(e) => setEditFormData({ ...editFormData, dues_currency: e.target.value })}
                          required
                        >
                          <option value="USD">USD</option>
                          <option value="LRD">LRD</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => {
                      setShowEditModal(false);
                      setEditingClient(null);
                    }}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      <i className="fas fa-save me-2"></i>Update Dues
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => {
            setShowEditModal(false);
            setEditingClient(null);
          }} style={{ zIndex: 1040 }}></div>
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

