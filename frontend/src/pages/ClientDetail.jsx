import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../config/axios';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { getImageUrl } from '../utils/imageUtils';

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [branches, setBranches] = useState([]);
  const [loans, setLoans] = useState([]);
  const [savings, setSavings] = useState([]);

  useEffect(() => {
    fetchClient();
    fetchBranches();
    fetchClientLoans();
    fetchClientSavings();
  }, [id]);

  const fetchClient = async () => {
    try {
      const response = await apiClient.get(`/api/clients/${id}`);
      setClient(response.data.data.client);
      setFormData(response.data.data.client);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch client:', error);
      toast.error('Failed to load client details');
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await apiClient.get('/api/branches');
      setBranches(response.data.data.branches || []);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    }
  };

  const fetchClientLoans = async () => {
    try {
      const response = await apiClient.get(`/api/clients/${id}/loans`);
      setLoans(response.data.data.loans || []);
    } catch (error) {
      console.error('Failed to fetch client loans:', error);
    }
  };

  const fetchClientSavings = async () => {
    try {
      const response = await apiClient.get(`/api/clients/${id}/savings`);
      setSavings(response.data.data.savingsAccounts || []);
    } catch (error) {
      console.error('Failed to fetch client savings:', error);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await apiClient.put(`/api/clients/${id}`, formData);
      toast.success('Client updated successfully!');
      setShowEditModal(false);
      fetchClient();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update client');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this client? This action can be undone from the recycle bin.')) {
      return;
    }
    try {
      await apiClient.delete(`/api/clients/${id}`);
      toast.success('Client deleted successfully');
      navigate('/clients');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete client');
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

  if (!client) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">Client not found</p>
        <Link to="/clients" className="btn btn-primary">Back to Clients</Link>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link to="/clients" className="btn btn-outline-secondary btn-sm mb-2">
            <i className="fas fa-arrow-left me-2"></i>Back to Clients
          </Link>
          <h1 className="h3 mb-1">{client.first_name} {client.last_name}</h1>
          <p className="text-muted">Client Number: {client.client_number}</p>
        </div>
        <div>
          <button
            className="btn btn-primary me-2"
            onClick={() => setShowEditModal(true)}
          >
            <i className="fas fa-edit me-2"></i>Edit Client
          </button>
          {isAdmin && (
            <button
              className="btn btn-danger"
              onClick={handleDelete}
            >
              <i className="fas fa-trash me-2"></i>Delete
            </button>
          )}
        </div>
      </div>

      <div className="row">
        {/* Profile Image Section */}
        {client.profile_image && (
          <div className="col-12 mb-4">
            <div className="card">
              <div className="card-body text-center">
                <img 
                  src={getImageUrl(client.profile_image)}
                  alt={`${client.first_name} ${client.last_name}`}
                  className="rounded-circle mb-3"
                  style={{ width: '200px', height: '200px', objectFit: 'cover', border: '4px solid #dee2e6' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    // Show fallback icon
                    const fallback = e.target.nextElementSibling;
                    if (fallback) fallback.classList.remove('d-none');
                  }}
                />
                <div className="rounded-circle mx-auto mb-3 d-none d-flex align-items-center justify-content-center bg-light" style={{ width: '200px', height: '200px', border: '4px solid #dee2e6' }}>
                  <i className="fas fa-user fa-4x text-muted"></i>
                </div>
                <h4 className="mb-0">{client.first_name} {client.last_name}</h4>
                <p className="text-muted mb-0">Client Number: {client.client_number}</p>
              </div>
            </div>
          </div>
        )}

        {/* Personal Information */}
        <div className="col-md-6 mb-4">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0"><i className="fas fa-user me-2"></i>Personal Information</h5>
            </div>
            <div className="card-body">
              {!client.profile_image && (
                <div className="text-center mb-3">
                  <div className="rounded-circle mx-auto mb-2 d-inline-flex align-items-center justify-content-center bg-light" style={{ width: '100px', height: '100px', border: '2px solid #dee2e6' }}>
                    <i className="fas fa-user fa-2x text-muted"></i>
                  </div>
                </div>
              )}
              <table className="table table-borderless">
                <tbody>
                  <tr>
                    <th width="40%">Full Name:</th>
                    <td>{client.first_name} {client.last_name}</td>
                  </tr>
                  <tr>
                    <th>Email:</th>
                    <td>{client.email}</td>
                  </tr>
                  <tr>
                    <th>Phone:</th>
                    <td>{client.phone || '-'}</td>
                  </tr>
                  <tr>
                    <th>Date of Birth:</th>
                    <td>{client.date_of_birth ? new Date(client.date_of_birth).toLocaleDateString() : '-'}</td>
                  </tr>
                  <tr>
                    <th>Gender:</th>
                    <td>{client.gender ? client.gender.charAt(0).toUpperCase() + client.gender.slice(1) : '-'}</td>
                  </tr>
                  <tr>
                    <th>Marital Status:</th>
                    <td>{client.marital_status ? client.marital_status.replace('_', ' ').charAt(0).toUpperCase() + client.marital_status.replace('_', ' ').slice(1) : '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Contact & Address */}
        <div className="col-md-6 mb-4">
          <div className="card">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0"><i className="fas fa-map-marker-alt me-2"></i>Contact & Address</h5>
            </div>
            <div className="card-body">
              <table className="table table-borderless">
                <tbody>
                  <tr>
                    <th width="40%">Address:</th>
                    <td>{client.address || '-'}</td>
                  </tr>
                  <tr>
                    <th>City:</th>
                    <td>{client.city || '-'}</td>
                  </tr>
                  <tr>
                    <th>State:</th>
                    <td>{client.state || '-'}</td>
                  </tr>
                  <tr>
                    <th>Zip Code:</th>
                    <td>{client.zip_code || '-'}</td>
                  </tr>
                  <tr>
                    <th>Country:</th>
                    <td>{client.country || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Employment Information */}
        <div className="col-md-6 mb-4">
          <div className="card">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0"><i className="fas fa-briefcase me-2"></i>Employment</h5>
            </div>
            <div className="card-body">
              <table className="table table-borderless">
                <tbody>
                  <tr>
                    <th width="40%">Occupation:</th>
                    <td>{client.occupation || '-'}</td>
                  </tr>
                  <tr>
                    <th>Employer:</th>
                    <td>{client.employer || '-'}</td>
                  </tr>
                  <tr>
                    <th>Employee Number:</th>
                    <td>{client.employee_number || '-'}</td>
                  </tr>
                  <tr>
                    <th>Monthly Income:</th>
                    <td>{client.monthly_income ? `${client.income_currency || 'USD'} ${parseFloat(client.monthly_income).toLocaleString()}` : '-'}</td>
                  </tr>
                  <tr>
                    <th>Tax Number:</th>
                    <td>{client.tax_number || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Identification & Status */}
        <div className="col-md-6 mb-4">
          <div className="card">
            <div className="card-header bg-warning text-white">
              <h5 className="mb-0"><i className="fas fa-id-card me-2"></i>Identification & Status</h5>
            </div>
            <div className="card-body">
              <table className="table table-borderless">
                <tbody>
                  <tr>
                    <th width="40%">ID Type:</th>
                    <td>{client.identification_type ? client.identification_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : '-'}</td>
                  </tr>
                  <tr>
                    <th>ID Number:</th>
                    <td>{client.identification_number || '-'}</td>
                  </tr>
                  <tr>
                    <th>KYC Status:</th>
                    <td>
                      <span className={`badge bg-${client.kyc_status === 'verified' ? 'success' : client.kyc_status === 'rejected' ? 'danger' : 'warning'}`}>
                        {client.kyc_status || 'pending'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th>Status:</th>
                    <td>
                      <span className={`badge bg-${client.status === 'active' ? 'success' : client.status === 'suspended' ? 'danger' : 'secondary'}`}>
                        {client.status || 'active'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th>Branch:</th>
                    <td>{client.branch?.name || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Loans */}
        <div className="col-12 mb-4">
          <div className="card">
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0"><i className="fas fa-hand-holding-usd me-2"></i>Loans</h5>
              <Link to={`/loans?client_id=${id}`} className="btn btn-sm btn-light">
                View All
              </Link>
            </div>
            <div className="card-body">
              {loans.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Loan Number</th>
                        <th>Loan Type</th>
                        <th>Amount</th>
                        <th>Interest Rate</th>
                        <th>Term</th>
                        <th>Outstanding</th>
                        <th>Total Paid</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loans.map((loan) => (
                        <tr key={loan.id}>
                          <td><strong>{loan.loan_number}</strong></td>
                          <td>
                            <span className="badge bg-primary">
                              {loan.loan_type ? loan.loan_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Personal'}
                            </span>
                          </td>
                          <td>${parseFloat(loan.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td>{loan.interest_rate || 0}%</td>
                          <td>{loan.term_months || 0} months</td>
                          <td><strong className="text-danger">${parseFloat(loan.outstanding_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                          <td className="text-success">${parseFloat(loan.total_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
                            <div className="btn-group" role="group">
                              <Link to={`/loans/${loan.id}`} className="btn btn-sm btn-outline-primary" title="View Full Details">
                                <i className="fas fa-eye me-1"></i> View
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted text-center py-3">No loans found</p>
              )}
            </div>
          </div>
        </div>

        {/* Savings Accounts */}
        <div className="col-12 mb-4">
          <div className="card">
            <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0"><i className="fas fa-piggy-bank me-2"></i>Savings Accounts</h5>
              <Link to={`/savings?client_id=${id}`} className="btn btn-sm btn-light">
                View All
              </Link>
            </div>
            <div className="card-body">
              {savings.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Account Number</th>
                        <th>Type</th>
                        <th>Balance</th>
                        <th>Interest Rate</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savings.map((account) => (
                        <tr key={account.id}>
                          <td><strong>{account.account_number}</strong></td>
                          <td>{account.account_type}</td>
                          <td>${parseFloat(account.balance || 0).toLocaleString()}</td>
                          <td>{account.interest_rate || 0}%</td>
                          <td>
                            <span className={`badge bg-${account.status === 'active' ? 'success' : 'secondary'}`}>
                              {account.status}
                            </span>
                          </td>
                          <td>
                            <Link to={`/savings/${account.id}`} className="btn btn-sm btn-outline-primary">
                              <i className="fas fa-eye"></i>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted text-center py-3">No savings accounts found</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <>
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-xl modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Edit Client</h5>
                  <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
                </div>
                <form onSubmit={handleUpdate}>
                  <div className="modal-body">
                    {/* Same form fields as create modal */}
                    <h6 className="mb-3 text-primary">
                      <i className="fas fa-user me-2"></i>Personal Information
                    </h6>
                    <div className="row g-3 mb-4">
                      <div className="col-md-4">
                        <label className="form-label">First Name <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={formData.first_name || ''}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Last Name <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={formData.last_name || ''}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Email <span className="text-danger">*</span></label>
                        <input
                          type="email"
                          className="form-control"
                          required
                          value={formData.email || ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Date of Birth</label>
                        <input
                          type="date"
                          className="form-control"
                          value={formData.date_of_birth || ''}
                          onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Gender</label>
                        <select
                          className="form-select"
                          value={formData.gender || ''}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        >
                          <option value="">Select Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Marital Status</label>
                        <select
                          className="form-select"
                          value={formData.marital_status || ''}
                          onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                        >
                          <option value="">Select Status</option>
                          <option value="single">Single</option>
                          <option value="married">Married</option>
                          <option value="divorced">Divorced</option>
                          <option value="widowed">Widowed</option>
                          <option value="separated">Separated</option>
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Branch</label>
                        <select
                          className="form-select"
                          value={formData.branch_id || ''}
                          onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                        >
                          <option value="">Select Branch</option>
                          {branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                              {branch.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <h6 className="mb-3 text-primary">
                      <i className="fas fa-phone me-2"></i>Contact Information
                    </h6>
                    <div className="row g-3 mb-4">
                      <div className="col-md-4">
                        <label className="form-label">Primary Phone</label>
                        <input
                          type="tel"
                          className="form-control"
                          value={formData.phone || ''}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Primary Phone Country</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g., +1, +234"
                          value={formData.primary_phone_country || ''}
                          onChange={(e) => setFormData({ ...formData, primary_phone_country: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Secondary Phone</label>
                        <input
                          type="tel"
                          className="form-control"
                          value={formData.secondary_phone || ''}
                          onChange={(e) => setFormData({ ...formData, secondary_phone: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Secondary Phone Country</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g., +1, +234"
                          value={formData.secondary_phone_country || ''}
                          onChange={(e) => setFormData({ ...formData, secondary_phone_country: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Identification */}
                    <h6 className="mb-3 text-primary">
                      <i className="fas fa-id-card me-2"></i>Identification
                    </h6>
                    <div className="row g-3 mb-4">
                      <div className="col-md-6">
                        <label className="form-label">Identification Type</label>
                        <select
                          className="form-select"
                          value={formData.identification_type || ''}
                          onChange={(e) => setFormData({ ...formData, identification_type: e.target.value })}
                        >
                          <option value="">Select Type</option>
                          <option value="national_id">National ID</option>
                          <option value="passport">Passport</option>
                          <option value="drivers_license">Driver's License</option>
                          <option value="voters_card">Voter's Card</option>
                          <option value="birth_certificate">Birth Certificate</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Identification Number</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.identification_number || ''}
                          onChange={(e) => setFormData({ ...formData, identification_number: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Address Information */}
                    <h6 className="mb-3 text-primary">
                      <i className="fas fa-map-marker-alt me-2"></i>Address Information
                    </h6>
                    <div className="row g-3 mb-4">
                      <div className="col-12">
                        <label className="form-label">Street Address</label>
                        <textarea
                          className="form-control"
                          rows="2"
                          value={formData.address || ''}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">City</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.city || ''}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">State/Province</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.state || ''}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label">Zip Code</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.zip_code || ''}
                          onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label">Country</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.country || ''}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Employment Information */}
                    <h6 className="mb-3 text-primary">
                      <i className="fas fa-briefcase me-2"></i>Employment Information
                    </h6>
                    <div className="row g-3 mb-4">
                      <div className="col-md-4">
                        <label className="form-label">Occupation</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.occupation || ''}
                          onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Employer</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.employer || ''}
                          onChange={(e) => setFormData({ ...formData, employer: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Employee Number</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.employee_number || ''}
                          onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Monthly Income</label>
                        <input
                          type="number"
                          className="form-control"
                          step="0.01"
                          min="0"
                          value={formData.monthly_income || ''}
                          onChange={(e) => setFormData({ ...formData, monthly_income: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Income Currency</label>
                        <select
                          className="form-select"
                          value={formData.income_currency || 'USD'}
                          onChange={(e) => setFormData({ ...formData, income_currency: e.target.value })}
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                          <option value="NGN">NGN</option>
                          <option value="LRD">LRD</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Tax Number</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.tax_number || ''}
                          onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Status</label>
                        <select
                          className="form-select"
                          value={formData.status || 'active'}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">KYC Status</label>
                        <select
                          className="form-select"
                          value={formData.kyc_status || 'pending'}
                          onChange={(e) => setFormData({ ...formData, kyc_status: e.target.value })}
                        >
                          <option value="pending">Pending</option>
                          <option value="verified">Verified</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      <i className="fas fa-save me-2"></i>Update Client
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setShowEditModal(false)} style={{ zIndex: 1040 }}></div>
        </>
      )}
    </div>
  );
};

export default ClientDetail;

