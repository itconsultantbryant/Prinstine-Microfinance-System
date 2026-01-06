import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';

const KYC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [formData, setFormData] = useState({
    client_id: '',
    document_type: 'national_id',
    document_number: '',
    issue_date: '',
    expiry_date: '',
    issuing_authority: '',
    status: 'pending'
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null);

  useEffect(() => {
    fetchDocuments();
    fetchClients();
    
    // Real-time updates every 5 seconds
    const interval = setInterval(() => {
      fetchDocuments();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await apiClient.get('/api/kyc');
      setDocuments(response.data.data.documents || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch KYC documents:', error);
      toast.error('Failed to load KYC documents');
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
      
      // Append file if selected
      if (selectedFile) {
        formDataToSend.append('document', selectedFile);
      }

      if (editingDocument) {
        await apiClient.put(`/api/kyc/${editingDocument.id}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('KYC document updated successfully!');
        setEditingDocument(null);
      } else {
        await apiClient.post('/api/kyc', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('KYC document created successfully!');
      }
      setShowModal(false);
      setFormData({
        client_id: '',
        document_type: 'national_id',
        document_number: '',
        issue_date: '',
        expiry_date: '',
        issuing_authority: '',
        status: 'pending'
      });
      setSelectedFile(null);
      fetchDocuments();
    } catch (error) {
      console.error('Failed to save KYC document:', error);
      toast.error(error.response?.data?.message || `Failed to ${editingDocument ? 'update' : 'create'} KYC document`);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleViewDocument = (doc) => {
    setViewingDocument(doc);
  };

  const handleEdit = (document) => {
    setEditingDocument(document);
    setFormData({
      client_id: document.client_id || '',
      document_type: document.document_type || 'national_id',
      document_number: document.document_number || '',
      issue_date: document.issue_date || '',
      expiry_date: document.expiry_date || '',
      issuing_authority: document.issuing_authority || '',
      status: document.status || 'pending'
    });
    setSelectedFile(null);
    setShowModal(true);
  };

  const handleApprove = async (documentId, status) => {
    try {
      await apiClient.post(`/api/kyc/${documentId}/approve`, { status });
      toast.success(`KYC document ${status === 'verified' ? 'approved' : 'rejected'} successfully!`);
      fetchDocuments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update KYC document status');
    }
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this KYC document?')) {
      return;
    }
    try {
      await apiClient.delete(`/api/kyc/${documentId}`);
      toast.success('KYC document deleted successfully');
      fetchDocuments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete KYC document');
    }
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">KYC Documents</h1>
          <p className="text-muted">Manage client KYC verification</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setEditingDocument(null);
          setFormData({
            client_id: '',
            document_type: 'national_id',
            document_number: '',
            issue_date: '',
            expiry_date: '',
            issuing_authority: '',
            status: 'pending'
          });
          setShowModal(true);
        }}>
          <i className="fas fa-plus me-2"></i>Add KYC Document
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
                    <th>Document Type</th>
                    <th>Document Number</th>
                    <th>Status</th>
                    <th>Verified By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.length > 0 ? (
                    documents.map((doc) => (
                      <tr key={doc.id} className="hover-lift">
                        <td>{doc.client?.first_name} {doc.client?.last_name}</td>
                        <td>{doc.document_type?.replace('_', ' ')}</td>
                        <td>{doc.document_number || '-'}</td>
                        <td>
                          <span className={`badge bg-${
                            doc.status === 'verified' ? 'success' :
                            doc.status === 'pending' ? 'warning' : 'danger'
                          }`}>
                            {doc.status}
                          </span>
                        </td>
                        <td>{doc.verified_by ? 'User' : '-'}</td>
                        <td>
                          <div className="btn-group">
                            {doc.file_path && (
                              <button
                                className="btn btn-sm btn-outline-primary me-1"
                                onClick={() => handleViewDocument(doc)}
                                title="View Document"
                              >
                                <i className="fas fa-eye"></i>
                              </button>
                            )}
                            <button
                              className="btn btn-sm btn-outline-info me-1"
                              onClick={() => handleEdit(doc)}
                              title="Edit"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            {doc.status === 'pending' && (
                              <>
                                <button
                                  className="btn btn-sm btn-outline-success me-1"
                                  onClick={() => handleApprove(doc.id, 'verified')}
                                  title="Approve"
                                >
                                  <i className="fas fa-check"></i>
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger me-1"
                                  onClick={() => handleApprove(doc.id, 'rejected')}
                                  title="Reject"
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              </>
                            )}
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDelete(doc.id)}
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
                        No KYC documents found
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
                  <h5 className="modal-title">{editingDocument ? 'Edit KYC Document' : 'Add KYC Document'}</h5>
                  <button type="button" className="btn-close" onClick={() => {
                    setShowModal(false);
                    setEditingDocument(null);
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
                      <label className="form-label">Document Type <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        value={formData.document_type}
                        onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                        required
                      >
                        <option value="national_id">National ID</option>
                        <option value="passport">Passport</option>
                        <option value="drivers_license">Driver's License</option>
                        <option value="voters_card">Voter's Card</option>
                        <option value="birth_certificate">Birth Certificate</option>
                        <option value="utility_bill">Utility Bill</option>
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Document Number <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.document_number}
                        onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Issuing Authority</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.issuing_authority}
                        onChange={(e) => setFormData({ ...formData, issuing_authority: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Issue Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.issue_date}
                        onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Expiry Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.expiry_date}
                        onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                      />
                    </div>
                    <div className="col-md-12 mb-3">
                      <label className="form-label">Document File (Image, PDF, Word)</label>
                      <input
                        type="file"
                        className="form-control"
                        accept="image/*,.pdf,.doc,.docx"
                        onChange={handleFileChange}
                      />
                      <small className="text-muted">Upload document file (max 10MB)</small>
                      {selectedFile && (
                        <div className="mt-2">
                          <strong>Selected file:</strong> {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </div>
                      )}
                      {editingDocument && editingDocument.file_path && !selectedFile && (
                        <div className="mt-2">
                          <small className="text-muted">Current file: {editingDocument.file_path.split('/').pop()}</small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => {
                    setShowModal(false);
                    setEditingDocument(null);
                    setSelectedFile(null);
                  }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <i className="fas fa-save me-2"></i>{editingDocument ? 'Update Document' : 'Create Document'}
                  </button>
                </div>
              </form>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => {
            setShowModal(false);
            setEditingDocument(null);
            setSelectedFile(null);
          }}></div>
        </div>
      )}

      {/* View Document Modal */}
      {viewingDocument && viewingDocument.file_path && (
        <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">KYC Document - {viewingDocument.document_type?.replace('_', ' ')}</h5>
                <button type="button" className="btn-close" onClick={() => setViewingDocument(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <p><strong>Client:</strong> {viewingDocument.client?.first_name} {viewingDocument.client?.last_name}</p>
                    <p><strong>Document Type:</strong> {viewingDocument.document_type?.replace('_', ' ')}</p>
                    <p><strong>Document Number:</strong> {viewingDocument.document_number || 'N/A'}</p>
                    <p><strong>Status:</strong> <span className={`badge bg-${viewingDocument.status === 'verified' ? 'success' : viewingDocument.status === 'pending' ? 'warning' : 'danger'}`}>{viewingDocument.status}</span></p>
                  </div>
                  <div className="col-md-6">
                    <p><strong>Issue Date:</strong> {viewingDocument.issue_date || 'N/A'}</p>
                    <p><strong>Expiry Date:</strong> {viewingDocument.expiry_date || 'N/A'}</p>
                    <p><strong>Issuing Authority:</strong> {viewingDocument.issuing_authority || 'N/A'}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <h6>Document Preview</h6>
                  <div className="border p-3 text-center" style={{ minHeight: '400px' }}>
                    {viewingDocument.file_path.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img 
                        src={viewingDocument.file_path} 
                        alt="Document" 
                        className="img-fluid"
                        style={{ maxHeight: '500px' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                    ) : null}
                    <div style={{ display: viewingDocument.file_path.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'none' : 'block' }}>
                      <i className="fas fa-file fa-5x text-muted mb-3"></i>
                      <p className="text-muted">Document preview not available for this file type</p>
                      <p className="text-muted">File: {viewingDocument.file_path.split('/').pop()}</p>
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <button
                      className="btn btn-primary me-2"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = viewingDocument.file_path;
                        link.download = viewingDocument.file_path.split('/').pop();
                        link.click();
                      }}
                    >
                      <i className="fas fa-download me-2"></i>Download
                    </button>
                    <button
                      className="btn btn-info"
                      onClick={() => {
                        const printWindow = window.open(viewingDocument.file_path, '_blank');
                        printWindow.onload = () => printWindow.print();
                      }}
                    >
                      <i className="fas fa-print me-2"></i>Print
                    </button>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setViewingDocument(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setViewingDocument(null)}></div>
        </div>
      )}
    </div>
  );
};

export default KYC;
