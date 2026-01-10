import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { toast } from 'react-toastify';
import { formatRoleName } from '../utils/permissions';
import { exportToPDF, exportToExcel, formatDate, formatDateTime } from '../utils/exportUtils';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [branches, setBranches] = useState([]);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    username: '',
    role: '',
    branch_id: '',
    phone: '',
    is_active: true,
    password: '',
    confirmPassword: ''
  });
  const [editFormErrors, setEditFormErrors] = useState({});
  const [editingPassword, setEditingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditConfirmPassword, setShowEditConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'micro_loan_officer',
    branch_id: '',
    phone: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const roles = [
    { value: 'admin', label: 'Admin' },
    { value: 'micro_loan_officer', label: 'Micro Loan Officer' },
    { value: 'head_micro_loan', label: 'Head Micro Loan' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'finance', label: 'Finance' },
    { value: 'general_manager', label: 'General Manager' },
    { value: 'branch_manager', label: 'Branch Manager' },
    { value: 'loan_officer', label: 'Loan Officer' },
    { value: 'accountant', label: 'Accountant' },
    { value: 'hr', label: 'HR' },
    { value: 'teller', label: 'Teller' },
    { value: 'customer_service', label: 'Customer Service' },
    { value: 'borrower', label: 'Client (Borrower)' },
  ];

  useEffect(() => {
    fetchUsers();
    fetchBranches();
    
    // Real-time updates every 5 seconds
    const interval = setInterval(() => {
      fetchUsers();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/api/users');
      setUsers(response.data.data.users || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
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

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.role) {
      errors.role = 'Role is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    setSubmitting(true);
    try {
      const { confirmPassword, ...userData } = formData;
      const response = await apiClient.post('/api/users', userData);
      
      toast.success('User created successfully!');
      setShowModal(false);
      setFormData({
        name: '',
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        role: 'micro_loan_officer',
        branch_id: '',
        phone: ''
      });
      setFormErrors({});
      fetchUsers(); // Refresh users list
    } catch (error) {
      console.error('Failed to create user:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create user';
      toast.error(errorMessage);
      
      // Set field-specific errors if available
      if (error.response?.data?.errors) {
        const fieldErrors = {};
        error.response.data.errors.forEach(err => {
          fieldErrors[err.param] = err.msg;
        });
        setFormErrors(fieldErrors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleView = async (userId) => {
    try {
      const response = await apiClient.get(`/api/users/${userId}`);
      setSelectedUser(response.data.data.user);
      setShowViewModal(true);
    } catch (error) {
      console.error('Failed to fetch user details:', error);
      toast.error('Failed to load user details');
    }
  };

  const handleEdit = async (userId) => {
    try {
      const response = await apiClient.get(`/api/users/${userId}`);
      const user = response.data.data.user;
      setSelectedUser(user);
      setEditFormData({
        name: user.name || '',
        email: user.email || '',
        username: user.username || '',
        role: user.role || '',
        branch_id: user.branch_id || '',
        phone: user.phone || '',
        is_active: user.is_active !== undefined ? user.is_active : true,
        password: '',
        confirmPassword: ''
      });
      setEditingPassword(false);
      setEditFormErrors({});
      setShowEditModal(true);
    } catch (error) {
      console.error('Failed to fetch user details:', error);
      toast.error('Failed to load user details');
    }
  };

  const validateEditForm = () => {
    const errors = {};
    
    if (!editFormData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!editFormData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editFormData.email)) {
      errors.email = 'Invalid email format';
    }
    
    if (!editFormData.username.trim()) {
      errors.username = 'Username is required';
    }
    
    if (editingPassword) {
      if (!editFormData.password) {
        errors.password = 'Password is required';
      } else if (editFormData.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
      
      if (editFormData.password !== editFormData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateEditForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    setSubmitting(true);
    try {
      const updateData = {
        name: editFormData.name,
        email: editFormData.email,
        username: editFormData.username,
        role: editFormData.role,
        branch_id: editFormData.branch_id || null,
        phone: editFormData.phone || null,
        is_active: editFormData.is_active
      };

      // Only include password if editing password
      if (editingPassword && editFormData.password) {
        updateData.password = editFormData.password;
      }

      const response = await apiClient.put(`/api/users/${selectedUser.id}`, updateData);
      
      toast.success('User updated successfully!');
      setShowEditModal(false);
      setSelectedUser(null);
      setEditFormData({
        name: '',
        email: '',
        username: '',
        role: '',
        branch_id: '',
        phone: '',
        is_active: true,
        password: '',
        confirmPassword: ''
      });
      setEditFormErrors({});
      setEditingPassword(false);
      fetchUsers(); // Refresh users list
    } catch (error) {
      console.error('Failed to update user:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update user';
      toast.error(errorMessage);
      
      if (error.response?.data?.errors) {
        const fieldErrors = {};
        error.response.data.errors.forEach(err => {
          fieldErrors[err.param] = err.msg;
        });
        setEditFormErrors(fieldErrors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error when user starts typing
    if (editFormErrors[name]) {
      setEditFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This will also delete their associated client if they have one. This action can be undone from the recycle bin.')) {
      return;
    }

    try {
      await apiClient.delete(`/api/users/${userId}`);
      toast.success('User deleted successfully');
      // Immediate refresh
      await fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleExportPDF = () => {
    const columns = [
      { key: 'name', header: 'Name' },
      { key: 'username', header: 'Username' },
      { key: 'email', header: 'Email' },
      { key: 'role', header: 'Role', format: (value) => formatRoleName(value) },
      { key: 'phone', header: 'Phone' },
      { key: 'branch', header: 'Branch', format: (value) => value?.name || '-' },
      { key: 'is_active', header: 'Status', format: (value) => value ? 'Active' : 'Inactive' },
      { key: 'createdAt', header: 'Created At', format: formatDateTime }
    ];
    exportToPDF(users, columns, 'Users Report', 'users_report');
    toast.success('Users exported to PDF successfully!');
  };

  const handleExportExcel = () => {
    const columns = [
      { key: 'name', header: 'Name' },
      { key: 'username', header: 'Username' },
      { key: 'email', header: 'Email' },
      { key: 'role', header: 'Role', format: (value) => formatRoleName(value) },
      { key: 'phone', header: 'Phone' },
      { key: 'branch', header: 'Branch', format: (value) => value?.name || '-' },
      { key: 'is_active', header: 'Status', format: (value) => value ? 'Active' : 'Inactive' },
      { key: 'createdAt', header: 'Created At', format: formatDateTime }
    ];
    exportToExcel(users, columns, 'Users', 'users_report');
    toast.success('Users exported to Excel successfully!');
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">User Management</h1>
          <p className="text-muted">Manage system users and permissions</p>
        </div>
        <div className="d-flex gap-2">
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
          <button 
            className="btn btn-primary hover-lift"
            onClick={() => setShowModal(true)}
          >
            <i className="fas fa-plus me-2"></i>Add User
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive" style={{ overflowX: 'auto', width: '100%' }}>
              <table className="table table-hover mb-0" style={{ minWidth: '800px', width: '100%' }}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Branch</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length > 0 ? (
                    users.map((user) => (
                      <tr key={user.id} className="hover-lift">
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>{user.username}</td>
                        <td>
                          <span className="badge bg-info">
                            {formatRoleName(user.role)}
                          </span>
                        </td>
                        <td>{user.branch?.name || '-'}</td>
                        <td>{user.phone || '-'}</td>
                        <td>
                          <span className={`badge bg-${user.is_active ? 'success' : 'danger'}`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group">
                            <button 
                              className="btn btn-sm btn-outline-info"
                              onClick={() => handleView(user.id)}
                              title="View"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleEdit(user.id)}
                              title="Edit"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDelete(user.id)}
                              title="Delete"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center text-muted py-5">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div 
          className="modal fade show" 
          style={{ display: 'block', zIndex: 1050 }} 
          tabIndex="-1"
          onClick={(e) => {
            if (e.target.classList.contains('modal')) {
              setShowModal(false);
            }
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h5 className="modal-title">Add New User</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowModal(false);
                    setFormData({
                      name: '',
                      email: '',
                      username: '',
                      password: '',
                      confirmPassword: '',
                      role: 'micro_loan_officer',
                      branch_id: '',
                      phone: ''
                    });
                    setFormErrors({});
                  }}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Full Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                      {formErrors.name && (
                        <div className="invalid-feedback">{formErrors.name}</div>
                      )}
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Email <span className="text-danger">*</span></label>
                      <input
                        type="email"
                        className={`form-control ${formErrors.email ? 'is-invalid' : ''}`}
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                      {formErrors.email && (
                        <div className="invalid-feedback">{formErrors.email}</div>
                      )}
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Username <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className={`form-control ${formErrors.username ? 'is-invalid' : ''}`}
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                      />
                      {formErrors.username && (
                        <div className="invalid-feedback">{formErrors.username}</div>
                      )}
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Password <span className="text-danger">*</span></label>
                      <div className="input-group">
                        <input
                          type={showPassword ? "text" : "password"}
                          className={`form-control ${formErrors.password ? 'is-invalid' : ''}`}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          required
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setShowPassword(!showPassword)}
                          title={showPassword ? "Hide password" : "Show password"}
                        >
                          <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>
                      {formErrors.password && (
                        <div className="invalid-feedback">{formErrors.password}</div>
                      )}
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Confirm Password <span className="text-danger">*</span></label>
                      <div className="input-group">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          className={`form-control ${formErrors.confirmPassword ? 'is-invalid' : ''}`}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          required
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          title={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>
                      {formErrors.confirmPassword && (
                        <div className="invalid-feedback">{formErrors.confirmPassword}</div>
                      )}
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Role <span className="text-danger">*</span></label>
                      <select
                        className={`form-select ${formErrors.role ? 'is-invalid' : ''}`}
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select Role</option>
                        {roles.map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                      {formErrors.role && (
                        <div className="invalid-feedback">{formErrors.role}</div>
                      )}
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Branch</label>
                      <select
                        className="form-select"
                        name="branch_id"
                        value={formData.branch_id}
                        onChange={handleChange}
                      >
                        <option value="">Select Branch (Optional)</option>
                        {branches.map(branch => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowModal(false);
                      setFormData({
                        name: '',
                        email: '',
                        username: '',
                        password: '',
                        confirmPassword: '',
                        role: 'micro_loan_officer',
                        branch_id: '',
                        phone: ''
                      });
                      setFormErrors({});
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-2"></i>Create User
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {showViewModal && selectedUser && (
        <div 
          className="modal fade show" 
          style={{ display: 'block', zIndex: 1050 }} 
          tabIndex="-1"
          onClick={(e) => {
            if (e.target.classList.contains('modal')) {
              setShowViewModal(false);
              setSelectedUser(null);
            }
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="fas fa-user me-2"></i>User Details
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedUser(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-muted">Full Name</label>
                    <p className="form-control-plaintext">{selectedUser.name}</p>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-muted">Email</label>
                    <p className="form-control-plaintext">
                      <a href={`mailto:${selectedUser.email}`}>{selectedUser.email}</a>
                    </p>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-muted">Username</label>
                    <p className="form-control-plaintext">{selectedUser.username}</p>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-muted">Phone</label>
                    <p className="form-control-plaintext">
                      {selectedUser.phone ? (
                        <a href={`tel:${selectedUser.phone}`}>{selectedUser.phone}</a>
                      ) : (
                        <span className="text-muted">Not provided</span>
                      )}
                    </p>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-muted">Role</label>
                    <p className="form-control-plaintext">
                      <span className="badge bg-info">
                        {formatRoleName(selectedUser.role)}
                      </span>
                    </p>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-muted">Branch</label>
                    <p className="form-control-plaintext">
                      {selectedUser.branch?.name || <span className="text-muted">Not assigned</span>}
                    </p>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-muted">Status</label>
                    <p className="form-control-plaintext">
                      <span className={`badge bg-${selectedUser.is_active ? 'success' : 'danger'}`}>
                        {selectedUser.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-muted">Email Verified</label>
                    <p className="form-control-plaintext">
                      {selectedUser.email_verified_at ? (
                        <span className="badge bg-success">
                          <i className="fas fa-check me-1"></i>
                          Verified {new Date(selectedUser.email_verified_at).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="badge bg-warning">
                          <i className="fas fa-times me-1"></i>Not Verified
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-muted">Created At</label>
                    <p className="form-control-plaintext">
                      {new Date(selectedUser.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-muted">Last Updated</label>
                    <p className="form-control-plaintext">
                      {new Date(selectedUser.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {selectedUser.avatar && (
                  <div className="mb-3">
                    <label className="form-label fw-bold text-muted">Avatar</label>
                    <div>
                      <img 
                        src={selectedUser.avatar} 
                        alt={selectedUser.name}
                        className="img-thumbnail"
                        style={{ maxWidth: '150px', maxHeight: '150px' }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedUser(null);
                  }}
                >
                  <i className="fas fa-times me-2"></i>Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setShowViewModal(false);
                    handleEdit(selectedUser.id);
                  }}
                >
                  <i className="fas fa-edit me-2"></i>Edit User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div 
          className="modal fade show" 
          style={{ display: 'block', zIndex: 1050 }} 
          tabIndex="-1"
          onClick={(e) => {
            if (e.target.classList.contains('modal')) {
              setShowEditModal(false);
              setSelectedUser(null);
            }
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="fas fa-edit me-2"></i>Edit User
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                    setEditFormData({
                      name: '',
                      email: '',
                      username: '',
                      role: '',
                      branch_id: '',
                      phone: '',
                      is_active: true,
                      password: '',
                      confirmPassword: ''
                    });
                    setEditFormErrors({});
                    setEditingPassword(false);
                  }}
                ></button>
              </div>
              <form onSubmit={handleEditSubmit}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Full Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className={`form-control ${editFormErrors.name ? 'is-invalid' : ''}`}
                        name="name"
                        value={editFormData.name}
                        onChange={handleEditChange}
                        required
                      />
                      {editFormErrors.name && (
                        <div className="invalid-feedback">{editFormErrors.name}</div>
                      )}
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Email <span className="text-danger">*</span></label>
                      <input
                        type="email"
                        className={`form-control ${editFormErrors.email ? 'is-invalid' : ''}`}
                        name="email"
                        value={editFormData.email}
                        onChange={handleEditChange}
                        required
                      />
                      {editFormErrors.email && (
                        <div className="invalid-feedback">{editFormErrors.email}</div>
                      )}
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Username <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className={`form-control ${editFormErrors.username ? 'is-invalid' : ''}`}
                        name="username"
                        value={editFormData.username}
                        onChange={handleEditChange}
                        required
                      />
                      {editFormErrors.username && (
                        <div className="invalid-feedback">{editFormErrors.username}</div>
                      )}
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        name="phone"
                        value={editFormData.phone}
                        onChange={handleEditChange}
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Role <span className="text-danger">*</span></label>
                      <select
                        className={`form-select ${editFormErrors.role ? 'is-invalid' : ''}`}
                        name="role"
                        value={editFormData.role}
                        onChange={handleEditChange}
                        required
                      >
                        <option value="">Select Role</option>
                        {roles.map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                      {editFormErrors.role && (
                        <div className="invalid-feedback">{editFormErrors.role}</div>
                      )}
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Branch</label>
                      <select
                        className="form-select"
                        name="branch_id"
                        value={editFormData.branch_id}
                        onChange={handleEditChange}
                      >
                        <option value="">Select Branch (Optional)</option>
                        {branches.map(branch => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Status</label>
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          name="is_active"
                          checked={editFormData.is_active}
                          onChange={handleEditChange}
                        />
                        <label className="form-check-label">
                          {editFormData.is_active ? 'Active' : 'Inactive'}
                        </label>
                      </div>
                    </div>

                    <div className="col-12 mb-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={editingPassword}
                          onChange={(e) => setEditingPassword(e.target.checked)}
                        />
                        <label className="form-check-label">
                          Update Password
                        </label>
                      </div>
                    </div>

                    {editingPassword && (
                      <>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">New Password <span className="text-danger">*</span></label>
                          <div className="input-group">
                            <input
                              type={showEditPassword ? "text" : "password"}
                              className={`form-control ${editFormErrors.password ? 'is-invalid' : ''}`}
                              name="password"
                              value={editFormData.password}
                              onChange={handleEditChange}
                              required={editingPassword}
                            />
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={() => setShowEditPassword(!showEditPassword)}
                              title={showEditPassword ? "Hide password" : "Show password"}
                            >
                              <i className={`fas ${showEditPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                          </div>
                          {editFormErrors.password && (
                            <div className="invalid-feedback">{editFormErrors.password}</div>
                          )}
                        </div>

                        <div className="col-md-6 mb-3">
                          <label className="form-label">Confirm Password <span className="text-danger">*</span></label>
                          <div className="input-group">
                            <input
                              type={showEditConfirmPassword ? "text" : "password"}
                              className={`form-control ${editFormErrors.confirmPassword ? 'is-invalid' : ''}`}
                              name="confirmPassword"
                              value={editFormData.confirmPassword}
                              onChange={handleEditChange}
                              required={editingPassword}
                            />
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={() => setShowEditConfirmPassword(!showEditConfirmPassword)}
                              title={showEditConfirmPassword ? "Hide password" : "Show password"}
                            >
                              <i className={`fas ${showEditConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                          </div>
                          {editFormErrors.confirmPassword && (
                            <div className="invalid-feedback">{editFormErrors.confirmPassword}</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedUser(null);
                      setEditFormData({
                        name: '',
                        email: '',
                        username: '',
                        role: '',
                        branch_id: '',
                        phone: '',
                        is_active: true,
                        password: '',
                        confirmPassword: ''
                      });
                      setEditFormErrors({});
                      setEditingPassword(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-2"></i>Update User
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Backdrop */}
      {(showModal || showViewModal || showEditModal) && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default Users;
