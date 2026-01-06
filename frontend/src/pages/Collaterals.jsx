import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';

const Collaterals = () => {
  const { user } = useAuth();
  const [collaterals, setCollaterals] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCollateral, setEditingCollateral] = useState(null);
  const [formData, setFormData] = useState({
    client_id: '',
    type: 'property',
    description: '',
    estimated_value: '',
    currency: 'USD',
    status: 'pending'
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [viewingCollateral, setViewingCollateral] = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null);

  useEffect(() => {
    fetchCollaterals();
    fetchClients();
    
    // Real-time updates every 5 seconds
    const interval = setInterval(() => {
      fetchCollaterals();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchCollaterals = async () => {
    try {
      const response = await apiClient.get('/api/collaterals');
      setCollaterals(response.data.data.collaterals || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch collaterals:', error);
      toast.error('Failed to load collaterals');
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await apiClient.get('/api/clients');
      setClients(response.data.data.clients || []);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });
      
      // Append files
      selectedFiles.forEach((file, index) => {
        formDataToSend.append('documents', file);
      });

      if (editingCollateral) {
        await apiClient.put(`/api/collaterals/${editingCollateral.id}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Collateral updated successfully!');
        setEditingCollateral(null);
      } else {
        await apiClient.post('/api/collaterals', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Collateral created successfully!');
      }
      setShowModal(false);
      setFormData({
        client_id: '',
        type: 'property',
        description: '',
        estimated_value: '',
        currency: 'USD',
        status: 'pending'
      });
      setSelectedFiles([]);
      fetchCollaterals();
    } catch (error) {
      console.error('Failed to save collateral:', error);
      toast.error(error.response?.data?.message || `Failed to ${editingCollateral ? 'update' : 'create'} collateral`);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const handleViewCollateral = (collateral) => {
    setViewingCollateral(collateral);
  };

  const handleViewDocument = (document) => {
    setViewingDocument(document);
  };

  const handleDownloadDocument = (document) => {
    window.open(document.path, '_blank');
  };

  const handlePrintDocument = (document) => {
    const printWindow = window.open(document.path, '_blank');
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const handleEdit = (collateral) => {
    setEditingCollateral(collateral);
    setFormData({
      client_id: collateral.client_id || '',
      type: collateral.type || 'property',
      description: collateral.description || '',
      estimated_value: collateral.estimated_value || '',
      currency: collateral.currency || 'USD',
      status: collateral.status || 'pending'
    });
    setSelectedFiles([]);
    setShowModal(true);
  };

  const handleDelete = async (collateralId) => {
    if (!window.confirm('Are you sure you want to delete this collateral?')) {
      return;
    }
    try {
      await apiClient.delete(`/api/collaterals/${collateralId}`);
      toast.success('Collateral deleted successfully');
      fetchCollaterals();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete collateral');
    }
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">Collaterals</h1>
          <p className="text-muted">Manage loan collaterals and security</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setEditingCollateral(null);
          setFormData({
            client_id: '',
            type: 'property',
            description: '',
            estimated_value: '',
            currency: 'USD',
            status: 'pending'
          });
          setShowModal(true);
        }}>
          <i className="fas fa-plus me-2"></i>Add Collateral
        </button>
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
                    <th>Client</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Estimated Value</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {collaterals.length > 0 ? (
                    collaterals.map((collateral) => (
                      <tr key={collateral.id} className="hover-lift">
                        <td>{collateral.client?.first_name} {collateral.client?.last_name}</td>
                        <td>{collateral.collateral_type || collateral.type}</td>
                        <td>{collateral.description || '-'}</td>
                        <td>${parseFloat(collateral.estimated_value || 0).toLocaleString()}</td>
                        <td>
                          <span className={`badge bg-${
                            collateral.status === 'verified' ? 'success' :
                            collateral.status === 'pending' ? 'warning' : 'danger'
                          }`}>
                            {collateral.status}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group">
                            <button
                              className="btn btn-sm btn-outline-primary me-1"
                              onClick={() => handleViewCollateral(collateral)}
                              title="View"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-info me-1"
                              onClick={() => handleEdit(collateral)}
                              title="Edit"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDelete(collateral.id)}
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
                      <td colSpan="6" className="text-center text-muted py-5">
                        No collaterals found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{editingCollateral ? 'Edit Collateral' : 'Add Collateral'}</h5>
                  <button type="button" className="btn-close" onClick={() => {
                    setShowModal(false);
                    setEditingCollateral(null);
                  }}></button>
                </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Client <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        value={formData.client_id}
                        onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                        required
                      >
                        <option value="">Select Client</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.first_name} {client.last_name} - {client.client_number}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Collateral Type <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        required
                      >
                        <option value="property">Property</option>
                        <option value="vehicle">Vehicle</option>
                        <option value="equipment">Equipment</option>
                        <option value="jewelry">Jewelry</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Currency</label>
                      <select
                        className="form-select"
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="NGN">NGN</option>
                        <option value="LRD">LRD</option>
                      </select>
                    </div>
                    <div className="col-md-12 mb-3">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-control"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows="3"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Estimated Value <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.estimated_value}
                        onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Status</label>
                      <select
                        className="form-select"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="pending">Pending</option>
                        <option value="verified">Verified</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                    <div className="col-md-12 mb-3">
                      <label className="form-label">Documents (Images, PDF, Word)</label>
                      <input
                        type="file"
                        className="form-control"
                        multiple
                        accept="image/*,.pdf,.doc,.docx"
                        onChange={handleFileChange}
                      />
                      <small className="text-muted">You can upload multiple files (max 10MB each)</small>
                      {selectedFiles.length > 0 && (
                        <div className="mt-2">
                          <strong>Selected files:</strong>
                          <ul className="list-unstyled">
                            {selectedFiles.map((file, index) => (
                              <li key={index} className="text-muted">
                                <i className="fas fa-file me-2"></i>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => {
                    setShowModal(false);
                    setEditingCollateral(null);
                    setSelectedFiles([]);
                  }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <i className="fas fa-save me-2"></i>{editingCollateral ? 'Update Collateral' : 'Create Collateral'}
                  </button>
                </div>
              </form>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => {
            setShowModal(false);
            setEditingCollateral(null);
            setSelectedFiles([]);
          }}></div>
        </div>
      )}

      {/* View Collateral Modal */}
      {viewingCollateral && (
        <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Collateral Details</h5>
                <button type="button" className="btn-close" onClick={() => setViewingCollateral(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <p><strong>Client:</strong> {viewingCollateral.client?.first_name} {viewingCollateral.client?.last_name}</p>
                    <p><strong>Type:</strong> {viewingCollateral.type}</p>
                    <p><strong>Estimated Value:</strong> ${parseFloat(viewingCollateral.estimated_value || 0).toLocaleString()} {viewingCollateral.currency}</p>
                    <p><strong>Status:</strong> <span className={`badge bg-${viewingCollateral.status === 'verified' ? 'success' : viewingCollateral.status === 'pending' ? 'warning' : 'danger'}`}>{viewingCollateral.status}</span></p>
                  </div>
                  <div className="col-md-6">
                    <p><strong>Description:</strong></p>
                    <p>{viewingCollateral.description || 'N/A'}</p>
                  </div>
                </div>
                {viewingCollateral.documents && (() => {
                  try {
                    const docs = typeof viewingCollateral.documents === 'string' 
                      ? JSON.parse(viewingCollateral.documents) 
                      : viewingCollateral.documents;
                    if (docs && docs.length > 0) {
                      return (
                        <div className="mt-4">
                          <h6>Documents</h6>
                          <div className="row">
                            {docs.map((doc, index) => (
                              <div key={index} className="col-md-4 mb-3">
                                <div className="card">
                                  <div className="card-body">
                                    <h6 className="card-title">{doc.originalname}</h6>
                                    <p className="card-text text-muted small">
                                      {(doc.size / 1024).toFixed(2)} KB
                                    </p>
                                    <div className="btn-group">
                                      <button
                                        className="btn btn-sm btn-outline-primary"
                                        onClick={() => window.open(doc.path, '_blank')}
                                        title="View"
                                      >
                                        <i className="fas fa-eye"></i>
                                      </button>
                                      <button
                                        className="btn btn-sm btn-outline-success"
                                        onClick={() => {
                                          const link = document.createElement('a');
                                          link.href = doc.path;
                                          link.download = doc.originalname;
                                          link.click();
                                        }}
                                        title="Download"
                                      >
                                        <i className="fas fa-download"></i>
                                      </button>
                                      <button
                                        className="btn btn-sm btn-outline-info"
                                        onClick={() => {
                                          const printWindow = window.open(doc.path, '_blank');
                                          printWindow.onload = () => printWindow.print();
                                        }}
                                        title="Print"
                                      >
                                        <i className="fas fa-print"></i>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  } catch (e) {
                    return null;
                  }
                  return null;
                })()}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setViewingCollateral(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setViewingCollateral(null)}></div>
        </div>
      )}
    </div>
  );
};

export default Collaterals;
