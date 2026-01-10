import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      toast.success('Login successful!');
      navigate('/');
    } else {
      toast.error(result.message || 'Login failed');
    }
  };

  return (
    <div 
      className="d-flex justify-content-center align-items-center" 
      style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}
    >
      <div className="col-md-5 col-lg-4">
        <div className="card shadow-lg border-0" style={{ borderRadius: '20px', overflow: 'hidden' }}>
          {/* Logo Section */}
          <div className="text-center p-4" style={{ backgroundColor: '#f8f9fa' }}>
            <img 
              src="/assets/prinstine_microfinance_logo.png" 
              alt="Prinstine Microfinance Logo" 
              className="img-fluid"
              style={{ maxHeight: '120px', maxWidth: '200px', margin: '0 auto' }}
              onError={(e) => {
                // If logo fails to load, show company name as text instead of emoji
                e.target.style.display = 'none';
                if (e.target.nextElementSibling) {
                  e.target.nextElementSibling.style.display = 'block';
                }
              }}
            />
            <div style={{ display: 'none', padding: '20px 0' }}>
              <h3 className="text-primary mb-1" style={{ fontWeight: '700', fontSize: '24px' }}>Prinstine Microfinance</h3>
              <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Loans and Savings</p>
            </div>
          </div>

          {/* Form Section */}
          <div className="card-body p-5">
            <div className="text-center mb-4">
              <h2 className="mb-2" style={{ color: '#2d3748', fontWeight: '700' }}>
                Welcome Back
              </h2>
              <p className="text-muted mb-0">
                Sign in to access your account
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="email" className="form-label fw-semibold" style={{ color: '#4a5568' }}>
                  <i className="fas fa-envelope me-2 text-primary"></i>
                  Email Address
                </label>
                <input
                  type="email"
                  className="form-control form-control-lg"
                  id="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ 
                    borderRadius: '10px',
                    border: '2px solid #e2e8f0',
                    padding: '12px 15px'
                  }}
                />
              </div>

              <div className="mb-4">
                <label htmlFor="password" className="form-label fw-semibold" style={{ color: '#4a5568' }}>
                  <i className="fas fa-lock me-2 text-primary"></i>
                  Password
                </label>
                <div className="input-group">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control form-control-lg"
                    id="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ 
                      borderRadius: '10px 0 0 10px',
                      border: '2px solid #e2e8f0',
                      padding: '12px 15px'
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ 
                      borderRadius: '0 10px 10px 0',
                      border: '2px solid #e2e8f0',
                      borderLeft: 'none',
                      padding: '12px 15px'
                    }}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 btn-lg fw-semibold"
                disabled={loading}
                style={{
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '16px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 10px 20px rgba(102, 126, 234, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Logging in...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-in-alt me-2"></i>
                    Sign In
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="text-center mt-4">
              <small className="text-muted">
                <i className="fas fa-shield-alt me-1"></i>
                Secure Login Portal
              </small>
            </div>
          </div>
        </div>

        {/* Company Name Footer */}
        <div className="text-center mt-4">
          <p className="text-white mb-0" style={{ fontSize: '18px', fontWeight: '600' }}>
            Prinstine Microfinance Loans and Savings
          </p>
          <small className="text-white-50">
            Empowering Financial Growth
          </small>
        </div>
      </div>
    </div>
  );
};

export default Login;
