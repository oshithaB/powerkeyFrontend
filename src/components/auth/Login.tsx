import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState('email'); // 'email', 'otp', 'reset', 'success'
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { login, requestPasswordReset, verifyOtp, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/companies');
      navigate(0);
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');

    try {
      if (forgotStep === 'email') {
        await requestPasswordReset(forgotEmail);
        setForgotStep('otp');
      } else if (forgotStep === 'otp') {
        await verifyOtp(forgotEmail, otp);
        setForgotStep('reset');
      } else if (forgotStep === 'reset') {
        // Validate passwords match
        if (newPassword !== confirmNewPassword) {
          setForgotError('Passwords do not match');
          return;
        }
        
        // Validate password strength
        if (newPassword.length < 6) {
          setForgotError('Password must be at least 6 characters long');
          return;
        }

        await resetPassword(forgotEmail, newPassword);
        setForgotStep('success');
      }
    } catch (err) {
      setForgotError(err.message || 'An error occurred');
    } finally {
      setForgotLoading(false);
    }
  };

  const resetForgotPasswordForm = () => {
    setShowForgotPassword(false);
    setForgotStep('email');
    setForgotEmail('');
    setOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
    setForgotError('');
    setForgotLoading(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const getStepTitle = () => {
    switch (forgotStep) {
      case 'email':
        return 'Reset Password';
      case 'otp':
        return 'Enter Verification Code';
      case 'reset':
        return 'Set New Password';
      case 'success':
        return 'Password Reset Successful';
      default:
        return 'Reset Password';
    }
  };

  const getStepDescription = () => {
    switch (forgotStep) {
      case 'email':
        return 'Enter your email address and we\'ll send you a verification code to reset your password.';
      case 'otp':
        return `We've sent a 6-digit verification code to ${forgotEmail}. Please enter it below.`;
      case 'reset':
        return 'Please enter your new password. Make sure it\'s strong and secure.';
      case 'success':
        return 'Your password has been successfully reset. You can now sign in with your new password.';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
      
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-600 rounded-full flex items-center justify-center">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Access your ERP dashboard and manage your business
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input pl-10"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="input pl-10 pr-10"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              className="text-sm text-primary-600 hover:text-primary-500 transition-colors"
              onClick={() => setShowForgotPassword(true)}
            >
              Forgot password?
            </button>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg w-full"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {getStepTitle()}
              </h3>
              <button
                onClick={resetForgotPasswordForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              {getStepDescription()}
            </p>
            
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {forgotError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                  {forgotError}
                </div>
              )}

              {forgotStep === 'email' && (
                <div>
                  <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="forgot-email"
                      name="forgot-email"
                      type="email"
                      required
                      className="input pl-10"
                      placeholder="Enter your email address"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {forgotStep === 'otp' && (
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Code
                  </label>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    maxLength={6}
                    className="input text-center text-lg tracking-widest"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Didn't receive the code?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep('email');
                        setOtp('');
                        setForgotError('');
                      }}
                      className="text-primary-600 hover:text-primary-500"
                    >
                      Try again
                    </button>
                  </p>
                </div>
              )}

              {forgotStep === 'reset' && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="new-password"
                        name="new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        className="input pl-10 pr-10"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirm-new-password" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="confirm-new-password"
                        name="confirm-new-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        className="input pl-10 pr-10"
                        placeholder="Confirm new password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {newPassword && confirmNewPassword && newPassword !== confirmNewPassword && (
                    <p className="text-sm text-red-600">Passwords do not match</p>
                  )}
                  
                  {newPassword && newPassword.length < 6 && (
                    <p className="text-sm text-red-600">Password must be at least 6 characters long</p>
                  )}
                </div>
              )}

              {forgotStep === 'success' && (
                <div className="text-center py-4">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    You can now sign in with your new password.
                  </p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                {forgotStep !== 'success' && (
                  <>
                    {forgotStep !== 'email' && (
                      <button
                        type="button"
                        className="btn btn-secondary w-full"
                        onClick={() => {
                          if (forgotStep === 'otp') {
                            setForgotStep('email');
                            setOtp('');
                          } else if (forgotStep === 'reset') {
                            setForgotStep('otp');
                            setNewPassword('');
                            setConfirmNewPassword('');
                          }
                          setForgotError('');
                        }}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={forgotLoading || (forgotStep === 'reset' && (newPassword !== confirmNewPassword || newPassword.length < 6))}
                      className="btn btn-primary w-full"
                    >
                      {forgotLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </div>
                      ) : (
                        forgotStep === 'email' ? 'Send Code' :
                        forgotStep === 'otp' ? 'Verify Code' : 'Reset Password'
                      )}
                    </button>
                  </>
                )}
                
                {forgotStep === 'success' && (
                  <button
                    type="button"
                    className="btn btn-primary w-full"
                    onClick={resetForgotPasswordForm}
                  >
                    Sign In Now
                  </button>
                )}
              </div>

              {forgotStep === 'email' && (
                <div className="text-center">
                  <button
                    type="button"
                    className="text-sm text-gray-600 hover:text-gray-800"
                    onClick={resetForgotPasswordForm}
                  >
                    Remember your password? Sign in
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

    </div>
  );
}