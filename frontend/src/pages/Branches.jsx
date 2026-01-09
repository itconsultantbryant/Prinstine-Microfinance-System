import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';

const Branches = () => {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    country: '',
    phone: '',
    email: '',
    manager_name: '',
    is_active: true
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await apiClient.get('/api/branches');
      setBranches(response.data.data.branches || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      toast.error('Failed to load branches');
      setLoading(false);
    }
  };

  const handleView = async (branchId) => {
    try {
      const response = await apiClient.get(`/api/branches/${branchId}`);
      setSelectedBranch(response.data.data.branch);
      setShowViewModal(true);
    } catch (error) {
      console.error('Failed to fetch branch details:', error);
      toast.error('Failed to load branch details');
    }
  };

  const handleEdit = async (branchId) => {
    try {
      const response = await apiClient.get(`/api/branches/${branchId}`);
      const branch = response.data.data.branch;
      setSelectedBranch(branch);
      setFormData({
        name: branch.name || '',
        code: branch.code || '',
        address: branch.address || '',
        city: branch.city || '',
        state: branch.state || '',
        country: branch.country || '',
        phone: branch.phone || '',
        email: branch.email || '',
        manager_name: branch.manager_name || '',
        is_active: branch.is_active !== undefined ? branch.is_active : true
      });
      setShowEditModal(true);
    } catch (error) {
      console.error('Failed to fetch branch details:', error);
      toast.error('Failed to load branch details');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedBranch) {
        await apiClient.put(`/api/branches/${selectedBranch.id}`, formData);
        toast.success('Branch updated successfully!');
        setShowEditModal(false);
      } else {
        await apiClient.post('/api/branches', formData);
        toast.success('Branch created successfully!');
        setShowModal(false);
      }
      setSelectedBranch(null);
      setFormData({
        name: '',
        code: '',
        address: '',
        city: '',
        state: '',
        country: '',
        phone: '',
        email: '',
        manager_name: '',
        is_active: true
      });
      fetchBranches();
    } catch (error) {
      console.error('Failed to save branch:', error);
      toast.error(error.response?.data?.message || 'Failed to save branch');
    }
  };

  const handleDelete = async (branchId) => {
    if (!window.confirm('Are you sure you want to delete this branch? It will be moved to the Recycle Bin.')) {
      return;
    }

    try {
      await apiClient.delete(`/api/branches/${branchId}`);
      toast.success('Branch deleted successfully');
      fetchBranches();
    } catch (error) {
      console.error('Failed to delete branch:', error);
      toast.error(error.response?.data?.message || 'Failed to delete branch');
    }
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">Branches</h1>
          <p className="text-muted">Manage branch locations</p>
        </div>
        {user?.role === 'admin' && (
          <button className="btn btn-primary hover-lift" onClick={() => {
            setSelectedBranch(null);
            setFormData({
              name: '',
              code: '',
              address: '',
              city: '',
              state: '',
              country: '',
              phone: '',
              email: '',
              manager_name: '',
              is_active: true
            });
            setShowModal(true);
          }}>
            <i className="fas fa-plus me-2"></i>Add Branch
          </button>
        )}
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
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Code</th>
                    <th>City</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Manager</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.length > 0 ? (
                    branches.map((branch) => (
                      <tr key={branch.id} className="hover-lift">
                        <td><strong>{branch.name}</strong></td>
                        <td>{branch.code}</td>
                        <td>{branch.city || '-'}</td>
                        <td>{branch.phone || '-'}</td>
                        <td>{branch.email || '-'}</td>
                        <td>{branch.manager_name || '-'}</td>
                        <td>
                          <span className={`badge bg-${branch.is_active ? 'success' : 'secondary'}`}>
                            {branch.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group">
                            <button
                              className="btn btn-sm btn-outline-info"
                              onClick={() => handleView(branch.id)}
                              title="View"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            {user?.role === 'admin' && (
                              <>
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => handleEdit(branch.id)}
                                  title="Edit"
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDelete(branch.id)}
                                  title="Delete"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center text-muted py-5">
                        No branches found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Branch Modal */}
      {(showModal || showEditModal) && (
        <div 
          className="modal fade show" 
          style={{ display: 'block', zIndex: 1050 }} 
          tabIndex="-1"
          onClick={(e) => {
            if (e.target.classList.contains('modal')) {
              setShowModal(false);
              setShowEditModal(false);
              setSelectedBranch(null);
            }
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="fas fa-building me-2"></i>
                  {selectedBranch ? 'Edit Branch' : 'Add Branch'}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowModal(false);
                    setShowEditModal(false);
                    setSelectedBranch(null);
                  }}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Branch Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        name="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Branch Code <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        name="code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        required
                      />
                    </div>
                    <div className="col-12 mb-3">
                      <label className="form-label">Address</label>
                      <textarea
                        className="form-control"
                        name="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        rows="2"
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">City</label>
                      <input
                        type="text"
                        className="form-control"
                        name="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">State</label>
                      <input
                        type="text"
                        className="form-control"
                        name="state"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Country</label>
                      <input
                        type="text"
                        className="form-control"
                        name="country"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        name="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        name="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Manager Name</label>
                      <input
                        type="text"
                        className="form-control"
                        name="manager_name"
                        value={formData.manager_name}
                        onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Status</label>
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          name="is_active"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        />
                        <label className="form-check-label">
                          {formData.is_active ? 'Active' : 'Inactive'}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowModal(false);
                      setShowEditModal(false);
                      setSelectedBranch(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <i className="fas fa-save me-2"></i>
                    {selectedBranch ? 'Update Branch' : 'Create Branch'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Branch Modal */}
      {showViewModal && selectedBranch && (
        <div 
          className="modal fade show" 
          style={{ display: 'block', zIndex: 1050 }} 
          tabIndex="-1"
          onClick={(e) => {
            if (e.target.classList.contains('modal')) {
              setShowViewModal(false);
              setSelectedBranch(null);
            }
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="fas fa-building me-2"></i>Branch Details
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedBranch(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-muted">Branch Name</label>
                    <p className="form-control-plaintext"><strong>{selectedBranch.name}</strong></p>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-muted">Branch Code</label>
                    <p className="form-control-plaintext">{selectedBranch.code}</p>
                  </div>
                  {selectedBranch.address && (
                    <div className="col-12 mb-3">
                      <label className="form-label fw-bold text-muted">Address</label>
                      <p className="form-control-plaintext">{selectedBranch.address}</p>
                    </div>
                  )}
                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-bold text-muted">City</label>
                    <p className="form-control-plaintext">{selectedBranch.city || '-'}</p>
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-bold text-muted">State</label>
                    <p className="form-control-plaintext">{selectedBranch.state || '-'}</p>
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-bold text-muted">Country</label>
                    <p className="form-control-plaintext">{selectedBranch.country || '-'}</p>
                  </div>
                  {selectedBranch.phone && (
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-bold text-muted">Phone</label>
                      <p className="form-control-plaintext">
                        <a href={`tel:${selectedBranch.phone}`}>{selectedBranch.phone}</a>
                      </p>
                    </div>
                  )}
                  {selectedBranch.email && (
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-bold text-muted">Email</label>
                      <p className="form-control-plaintext">
                        <a href={`mailto:${selectedBranch.email}`}>{selectedBranch.email}</a>
                      </p>
                    </div>
                  )}
                  {selectedBranch.manager_name && (
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-bold text-muted">Manager</label>
                      <p className="form-control-plaintext">{selectedBranch.manager_name}</p>
                    </div>
                  )}
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-muted">Status</label>
                    <p className="form-control-plaintext">
                      <span className={`badge bg-${selectedBranch.is_active ? 'success' : 'secondary'}`}>
                        {selectedBranch.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedBranch(null);
                  }}
                >
                  Close
                </button>
                {user?.role === 'admin' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setShowViewModal(false);
                      handleEdit(selectedBranch.id);
                    }}
                  >
                    <i className="fas fa-edit me-2"></i>Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Backdrop */}
      {(showModal || showViewModal || showEditModal) && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default Branches;

