import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getImageUrl } from '../utils/imageUtils';

const Clients = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    primary_phone_country: '',
    secondary_phone: '',
    secondary_phone_country: '',
    date_of_birth: '',
    gender: '',
    marital_status: '',
    identification_type: '',
    identification_number: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: '',
    occupation: '',
    employer: '',
    employee_number: '',
    tax_number: '',
    monthly_income: '',
    income_currency: 'USD',
    branch_id: '',
    total_dues: ''
  });
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);

  useEffect(() => {
    fetchClients();
    fetchBranches();
    
    // Real-time updates every 5 seconds
    const interval = setInterval(() => {
      fetchClients();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [search, statusFilter]);

  const fetchClients = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      
      const response = await apiClient.get('/api/clients', { params });
      setClients(response.data.data.clients || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      toast.error('Failed to load clients');
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      
      // Append all form fields
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== '') {
          formDataToSend.append(key, formData[key]);
        }
      });

      // Append profile image if selected
      if (profileImage) {
        formDataToSend.append('profile_image', profileImage);
      }

      if (editingClient) {
        await apiClient.put(`/api/clients/${editingClient.id}`, formDataToSend);
        toast.success('Client updated successfully!');
        setEditingClient(null);
      } else {
        await apiClient.post('/api/clients', formDataToSend);
        toast.success('Client created successfully!');
      }
      setShowModal(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        primary_phone_country: '',
        secondary_phone: '',
        secondary_phone_country: '',
        date_of_birth: '',
        gender: '',
        marital_status: '',
        identification_type: '',
        identification_number: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        country: '',
        occupation: '',
        employer: '',
        employee_number: '',
        tax_number: '',
        monthly_income: '',
        income_currency: 'USD',
        branch_id: '',
        total_dues: ''
      });
      setProfileImage(null);
      setProfileImagePreview(null);
      fetchClients();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${editingClient ? 'update' : 'create'} client`);
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      first_name: client.first_name || '',
      last_name: client.last_name || '',
      email: client.email || '',
      phone: client.phone || '',
      primary_phone_country: client.primary_phone_country || '',
      secondary_phone: client.secondary_phone || '',
      secondary_phone_country: client.secondary_phone_country || '',
      date_of_birth: client.date_of_birth || '',
      gender: client.gender || '',
      marital_status: client.marital_status || '',
      identification_type: client.identification_type || '',
      identification_number: client.identification_number || '',
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      zip_code: client.zip_code || '',
      country: client.country || '',
      occupation: client.occupation || '',
      employer: client.employer || '',
      employee_number: client.employee_number || '',
      tax_number: client.tax_number || '',
      monthly_income: client.monthly_income || '',
      income_currency: client.income_currency || 'USD',
      branch_id: client.branch_id || '',
      total_dues: client.total_dues || '',
      status: client.status || 'active',
      kyc_status: client.kyc_status || 'pending'
    });
    // Set profile image preview if exists
    if (client.profile_image) {
      setProfileImagePreview(getImageUrl(client.profile_image));
    } else {
      setProfileImagePreview(null);
    }
    setProfileImage(null);
    setShowModal(true);
  };

  const handleDelete = async (clientId) => {
    if (!window.confirm('Are you sure you want to delete this client? This action can be undone from the recycle bin.')) {
      return;
    }
    try {
      await apiClient.delete(`/api/clients/${clientId}`);
      toast.success('Client deleted successfully');
      fetchClients();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete client');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: 'success',
      inactive: 'secondary',
      suspended: 'danger'
    };
    return badges[status] || 'secondary';
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">Clients</h1>
          <p className="text-muted">Manage all your clients</p>
        </div>
        <button
          className="btn btn-primary hover-lift"
          onClick={() => setShowModal(true)}
        >
          <i className="fas fa-plus me-2"></i>Add New Client
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-8">
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
            <div className="col-md-4">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Clients Table */}
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
                    <th>Phone</th>
                    <th>City</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.length > 0 ? (
                    clients.map((client) => (
                      <tr key={client.id} className="hover-lift">
                        <td><strong>{client.client_number}</strong></td>
                        <td>{client.first_name} {client.last_name}</td>
                        <td>{client.email}</td>
                        <td>{client.phone || '-'}</td>
                        <td>{client.city || '-'}</td>
                        <td>
                          <span className={`badge bg-${getStatusBadge(client.status)}`}>
                            {client.status}
                          </span>
                        </td>
                        <td>
                          <Link
                            to={`/clients/${client.id}`}
                            className="btn btn-sm btn-outline-primary me-1"
                            title="View Details"
                          >
                            <i className="fas fa-eye"></i>
                          </Link>
                          <button
                            className="btn btn-sm btn-outline-info me-1"
                            onClick={() => handleEdit(client)}
                            title="Edit"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          {user?.role === 'admin' && (
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDelete(client.id)}
                              title="Delete"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center text-muted py-5">
                        <i className="fas fa-users fa-3x mb-3 d-block"></i>
                        No clients found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Comprehensive Create Client Modal */}
      {showModal && (
        <>
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050, overflowY: 'auto' }} tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-xl modal-dialog-scrollable" style={{ maxHeight: 'calc(100vh - 3.5rem)' }}>
              <div className="modal-content" style={{ maxHeight: 'calc(100vh - 3.5rem)' }}>
                <div className="modal-header" style={{ flexShrink: 0 }}>
                  <h5 className="modal-title">{editingClient ? 'Edit Client' : 'Add New Client'}</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                    aria-label="Close"
                  ></button>
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div className="modal-body" style={{ overflowY: 'auto', overflowX: 'hidden', flex: '1 1 auto', minHeight: 0 }}>
                    {/* Personal Information */}
                    <h6 className="mb-3 text-primary">
                      <i className="fas fa-user me-2"></i>Personal Information
                    </h6>
                    <div className="row g-3 mb-4">
                      {/* Profile Image Upload */}
                      <div className="col-12 mb-3">
                        <label className="form-label">Profile Image</label>
                        <div className="d-flex align-items-center gap-3">
                          {profileImagePreview ? (
                            <img 
                              src={profileImagePreview} 
                              alt="Preview" 
                              className="rounded-circle"
                              style={{ width: '100px', height: '100px', objectFit: 'cover', border: '2px solid #dee2e6' }}
                            />
                          ) : (
                            <div 
                              className="rounded-circle d-flex align-items-center justify-content-center bg-light"
                              style={{ width: '100px', height: '100px', border: '2px dashed #dee2e6' }}
                            >
                              <i className="fas fa-user fa-2x text-muted"></i>
                            </div>
                          )}
                          <div className="flex-grow-1">
                            <input
                              type="file"
                              className="form-control"
                              accept="image/*"
                              onChange={handleImageChange}
                            />
                            <small className="form-text text-muted">
                              Upload a profile image (JPG, PNG, GIF - Max 10MB)
                            </small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">First Name <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Last Name <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Email <span className="text-danger">*</span></label>
                        <input
                          type="email"
                          className="form-control"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Date of Birth</label>
                        <input
                          type="date"
                          className="form-control"
                          value={formData.date_of_birth}
                          onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Gender</label>
                        <select
                          className="form-select"
                          value={formData.gender}
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
                          value={formData.marital_status}
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
                          value={formData.branch_id}
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
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Primary Phone Country</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g., +1, +234"
                          value={formData.primary_phone_country}
                          onChange={(e) => setFormData({ ...formData, primary_phone_country: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Secondary Phone</label>
                        <input
                          type="tel"
                          className="form-control"
                          value={formData.secondary_phone}
                          onChange={(e) => setFormData({ ...formData, secondary_phone: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Secondary Phone Country</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g., +1, +234"
                          value={formData.secondary_phone_country}
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
                          value={formData.identification_type}
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
                          value={formData.identification_number}
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
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">City</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">State/Province</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.state}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label">Zip Code</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.zip_code}
                          onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label">Country</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.country}
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
                          value={formData.occupation}
                          onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Employer</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.employer}
                          onChange={(e) => setFormData({ ...formData, employer: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Employee Number</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.employee_number}
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
                          value={formData.monthly_income}
                          onChange={(e) => setFormData({ ...formData, monthly_income: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Income Currency</label>
                        <select
                          className="form-select"
                          value={formData.income_currency}
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
                          value={formData.tax_number}
                          onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Dues Information */}
                    <h6 className="mb-3 text-primary">
                      <i className="fas fa-calendar-check me-2"></i>Annual Dues
                    </h6>
                    <div className="row g-3 mb-4">
                      <div className="col-md-6">
                        <label className="form-label">Total Yearly Dues</label>
                        <input
                          type="number"
                          className="form-control"
                          step="0.01"
                          min="0"
                          value={formData.total_dues}
                          onChange={(e) => setFormData({ ...formData, total_dues: e.target.value })}
                          placeholder="Enter total yearly dues amount"
                        />
                        <small className="text-muted">
                          This will be set as negative balance when client is created. Monthly payments will reduce it gradually.
                        </small>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer" style={{ flexShrink: 0, borderTop: '1px solid #e2e8f0' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      <i className="fas fa-save me-2"></i>{editingClient ? 'Update Client' : 'Create Client'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setShowModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1040 }}></div>
        </>
      )}
    </div>
  );
};

export default Clients;
