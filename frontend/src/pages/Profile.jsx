import React, { useState } from 'react';
import apiClient from '../config/axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await apiClient.put(`/api/users/${user.id}`, formData);
      toast.success('Profile updated successfully!');
      const updatedUser = response.data?.data?.user;
      if (updateUser && updatedUser) {
        updateUser(updatedUser);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="mb-4">
        <h1 className="h3 mb-1">Profile</h1>
        <p className="text-muted">Manage your account information</p>
      </div>

      <div className="row">
        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Personal Information</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Role</label>
                    <input
                      type="text"
                      className="form-control"
                      value={user?.role?.replace('_', ' ') || ''}
                      disabled
                    />
                  </div>
                  <div className="col-12">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Updating...
                        </>
                      ) : (
                        'Update Profile'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card">
            <div className="card-body text-center">
              <div className="rounded-circle bg-primary d-inline-flex align-items-center justify-content-center text-white mb-3" style={{ width: '100px', height: '100px', fontSize: '2.5rem' }}>
                {user?.name?.charAt(0)}
              </div>
              <h5>{user?.name}</h5>
              <p className="text-muted">{user?.email}</p>
              <span className="badge bg-info">{user?.role?.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

