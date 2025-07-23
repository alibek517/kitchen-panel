import React, { useState } from 'react';
import { Eye, EyeOff, User, Lock, Coffee, Sparkles } from 'lucide-react';
import log from "/elipps lofo Ai-01.png"

const SignIn = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState('');
  const [errors, setErrors] = useState({
    username: '',
    password: ''
  });

  const handleSignIn = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({ username: '', password: '' }); 

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

       // First check auth status
       const authRes = await fetch('http://192.168.100.99:3000/auth-check/1');
       if (!authRes.ok) throw new Error('Auth tekshirishda xatolik');
       
       const authData = await authRes.json();
       
       if (!authData.status) {
         setErrors({
           username: 'Иш ҳали бошланмади!',
           password: 'Иш ҳали бошланмади!'
         });
         setIsLoading(false);
         return;
       }

      // Simulate API call delay for loading state
      const res = await fetch('http://192.168.100.99:3000/user');
      if (!res.ok) throw new Error('Сервердан маълумот олишда хатолик');

      const users = await res.json();

      const foundUser = users.find(
        (user) =>
          user.username === cleanUsername &&
          user.password === cleanPassword &&
          user.role === 'KITCHEN'
      );

      if (foundUser) {
        // Store user data in component state instead of localStorage
        // Navigate to menu page
        localStorage.setItem('userRole', foundUser.role);
        localStorage.setItem('username', foundUser.username);
        localStorage.setItem('user', foundUser.name);
        localStorage.setItem('password', foundUser.password);
        localStorage.setItem('userId', foundUser.id);

        window.location.href = '/kitchen';
      } else {
        // Check if username exists but password is wrong
        const usernameExists = users.find(
          (user) => user.username === cleanUsername && user.role === 'KITCHEN'
        );

        if (usernameExists) {
          setErrors({
            username: '',
            password: 'Парол нотўғри'
          });
        } else {
          setErrors({
            username: 'Фойдаланувчи номи нотўғри',
            password: ''
          });
        }
      }
    } catch (error) {
      setErrors({
        username: 'Серверга уланишда муаммо!',
        password: 'Серверга уланишда муаммо!'
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="signin-container">
      <div className="bg-element-1"></div>
      <div className="bg-element-2"></div>
      <div className="bg-element-3"></div>

      <div className="particles-container">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="particle" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`
          }}></div>
        ))}
      </div>

      <div className="signin-card">
        <div className="signin-header">
        <img style={{height:'80px'}} src={`${log}`} alt="" />
          <h1 className="kirish">Ошпаз Панели</h1>
          <p className="subtitle">
            <Sparkles className="subtitle-icon" />
            Тизимга хуш келибсиз
          </p>
        </div>

        <div className="signin-form">
          {/* Username field */}
          <div className="form-group">
            <label className="form-label">Фойдаланувчи номи</label>
            <div className="input-container">
              <User className={`input-icon ${focusedField === 'username' ? 'focused' : ''} ${errors.username ? 'error' : ''}`} />
              <input
                type="text"
                placeholder="Username киритинг"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errors.username) {
                    setErrors(prev => ({ ...prev, username: '' }));
                  }
                }}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField('')}
                required
                autoComplete="username"
                className={`form-input ${focusedField === 'username' ? 'focused' : ''} ${errors.username ? 'error' : ''}`}
              />
            </div>
            {errors.username && <span className="error-message">{errors.username}</span>}
          </div>

          {/* Password field */}
          <div className="form-group">
            <label className="form-label">Парол</label>
            <div className="password-field">
              <Lock className={`input-icon ${focusedField === 'password' ? 'focused' : ''} ${errors.password ? 'error' : ''}`} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Паролингизни киритинг"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) {
                    setErrors(prev => ({ ...prev, password: '' }));
                  }
                }}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField('')}
                required
                autoComplete="current-password"
                className={`form-input password-input ${focusedField === 'password' ? 'focused' : ''} ${errors.password ? 'error' : ''}`}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="toggle-password"
                title={showPassword ? "Паролни яшириш" : "Паролни кўрсатиш"}
                aria-label={showPassword ? "Паролни яшириш" : "Паролни кўрсатиш"}
              >
                {showPassword ? <EyeOff className="toggle-icon" /> : <Eye className="toggle-icon" />}
              </button>
            </div>
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          {/* Submit button */}
          <button
            type="button"
            onClick={handleSignIn}
            disabled={isLoading}
            className={`submit-btn ${isLoading ? 'loading' : ''}`}
          >
            {isLoading ? (
              <div className="loading-content">
                <div className="loading-spinner"></div>
                Кириш...
              </div>
            ) : (
              'Тизимга Кириш'
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="signin-footer">
          <p className="yangi">
            Янги фойдаланувчи бўлсангиз,{' '}
            <span className="admin-link">админ билан боғланинг</span>
          </p>
        </div>

        {/* Decorative elements */}
        <div className="decoration-1"></div>
        <div className="decoration-2"></div>
      </div>

      <style jsx>{`
        /* SignIn.css - Modern Bomb Style */

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow-x: hidden;
        }

        
        /* Main Container */
        .signin-container {
          min-height: 100vh;
          width: 100vw;
          background: linear-gradient(135deg, #1a0f08 0%, #8b4513 30%, #d2691e 60%, #ff6347 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          position: relative;
          overflow: hidden;
          
        }



        .bg-element-1 {
          top: -10rem;
          right: -10rem;
          background: #ff6347;
        }

        .bg-element-2 {
          bottom: -10rem;
          left: -10rem;
          background: #ffa500;
        }

        .bg-element-3 {
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #cd853f;
        }

        /* Floating Particles */
        .particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 50%;
        }



        /* Main Card */
        .signin-card {
          background: rgba(139, 69, 19, 0.2);
          backdrop-filter: blur(20px);
          border-radius: 1.5rem;
          padding: 2rem;
          box-shadow: 0 25px 50px rgba(139, 69, 19, 0.4);
          border: 1px solid rgba(255, 140, 0, 0.3);
          position: relative;
          overflow: hidden;
          width: 100%;
          max-width: 28rem;
          z-index: 10;
            margin-bottom: 300px;

        }

        /* Card Shimmer Effect */
        .signin-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,140,0,0.3), transparent);
          background-size: 200% 100%;
          pointer-events: none;
        }

        /* Header */
        .signin-header {
          text-align: center;
          margin-bottom: 2rem;
          position: relative;
          z-index: 20;
        }

        .logo-container {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 4rem;
          height: 4rem;
          background: linear-gradient(135deg, #ff6347, #ffa500);
          border-radius: 1rem;
          margin-bottom: 1rem;
          box-shadow: 0 10px 25px rgba(255, 99, 71, 0.4);
        }

        .logo-icon {
          width: 2rem;
          height: 2rem;
          color: white;
        }

        .kirish {
          font-size: 1.875rem;
          font-weight: 700;
          color: white;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #ff6347, #ffa500);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 0 2px 4px rgba(139, 69, 19, 0.3);
        }

        .subtitle {
          color: #d1d5db;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
        }

        /* Form Styles */
        .signin-form {
          position: relative;
          z-index: 20;
        }

        .form-group {
          margin-bottom: 1.5rem;
          position: relative;
        }

        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #d1d5db;
          margin-bottom: 0.5rem;
        }

        .input-container {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          width: 1.25rem;
          height: 1.25rem;
          color: #9ca3af;
          transition: color 0.2s ease;
          pointer-events: none;
        }

        .form-input {
          width: 100%;
          padding: 1rem 1rem 1rem 3rem;
          background: rgba(139, 69, 19, 0.1);
          border: 2px solid rgba(255, 140, 0, 0.3);
          border-radius: 0.75rem;
          color: white;
          font-size: 1rem;
          transition: all 0.2s ease;
          outline: none;
        }

        .form-input::placeholder {
          color: #9ca3af;
        }

        .form-input:hover {
          background: rgba(139, 69, 19, 0.15);
          border-color: rgba(255, 140, 0, 0.5);
        }

        .form-input:focus {
          background: rgba(139, 69, 19, 0.2);
          border-color: #ff6347;
          box-shadow: 0 0 0 3px rgba(255, 99, 71, 0.2);
        }

        .input-icon.focused {
          color: #ff6347;
        }

        .form-input.focused {
          background: rgba(139, 69, 19, 0.2);
          border-color: #ff6347;
        }

        /* Error States */
        .form-input.error {
          border-color: #ef4444 !important;
          background: rgba(239, 68, 68, 0.1);
        }

        .input-icon.error {
          color: #ef4444 !important;
        }

        .error-message {
          display: block;
          color: #ef4444;
          font-size: 0.75rem;
          margin-top: 0.5rem;
          margin-left: 0.5rem;
          font-weight: 500;
        }

        .password-input {
          padding-right: 3rem;
        }

        .subtitle-icon {
          width: 1rem;
          height: 1rem;
        }

        /* Password Field */
        .password-field {
          position: relative;
        }

        .password-field .form-input {
          padding-right: 3rem;
        }

        .toggle-password {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          width: 2rem;
          height: 2rem;
          color: #9ca3af;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          border-radius: 0.375rem;
          padding: 0.25rem;
        }

        .toggle-password:hover {
          color: #ff6347;
          background: rgba(255, 99, 71, 0.1);
          transform: translateY(-50%) scale(1.05);
        }

        .toggle-password:active {
          transform: translateY(-50%) scale(0.95);
        }

        .toggle-icon {
          width: 1.25rem;
          height: 1.25rem;
          transition: transform 0.2s ease;
        }


        /* Submit Button */
        .submit-btn {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #ff6347, #ffa500);
          border: none;
          border-radius: 0.75rem;
          color: white;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(255, 99, 71, 0.3);
        }

        .submit-btn:hover {
          background: linear-gradient(135deg, #ff4500, #ff8c00);
          transform: translateY(-2px);
          box-shadow: 0 15px 35px rgba(255, 99, 71, 0.4);
        }

        .submit-btn:active {
          transform: translateY(0);
        }

        .submit-btn.loading {
          background: #6b7280;
          cursor: not-allowed;
          transform: none;
        }

        /* Loading State */
        .loading-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .loading-spinner {
          width: 1.25rem;
          height: 1.25rem;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
        }

        /* Button Shine Effect */
        .submit-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s ease;
        }

        .submit-btn:hover::before {
          left: 100%;
        }

        /* Footer */
        .signin-footer {
          margin-top: 2rem;
          text-align: center;
          position: relative;
          z-index: 20;
        }

        .yangi {
          color: #9ca3af;
          font-size: 0.875rem;
        }

        .admin-link {
          color: #ff6347;
          font-weight: 500;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .admin-link:hover {
          color: #ffa500;
        }

        /* Decorative Elements */
        .decoration-1,
        .decoration-2 {
          position: absolute;
          border-radius: 50%;
          filter: blur(2rem);
          pointer-events: none;
        }

        .decoration-1 {
          top: 1rem;
          right: 1rem;
          width: 5rem;
          height: 5rem;
          background: linear-gradient(135deg, rgba(255, 99, 71, 0.2), rgba(255, 165, 0, 0.2));
        }

        .decoration-2 {
          bottom: 1rem;
          left: 1rem;
          width: 4rem;
          height: 4rem;
          background: linear-gradient(135deg, rgba(205, 133, 63, 0.2), rgba(255, 99, 71, 0.2));
        }

        /* Bottom Glow */
        .signin-container::after {
          content: '';
          position: absolute;
          bottom: -1.5rem;
          left: 50%;
          transform: translateX(-50%);
          width: 75%;
          height: 1.5rem;
          background: linear-gradient(90deg, rgba(255, 99, 71, 0.3), rgba(255, 140, 0, 0.3));
          border-radius: 50%;
          filter: blur(1rem);
          z-index: 5;
        }

        /* Responsive Design */
        @media (max-width: 640px) {
          .signin-container {
            padding: 0.5rem;
          }
          
          .signin-card {
            padding: 1.5rem;
            border-radius: 1rem;
          }
          
          .kirish {
            font-size: 1.5rem;
          }
          
          .form-input {
            padding: 0.875rem 0.875rem 0.875rem 2.5rem;
          }
          
          .submit-btn {
            padding: 0.875rem;
          }
        }

        @media (max-width: 480px) {
          .bg-element-1,
          .bg-element-2,
          .bg-element-3 {
            width: 15rem;
            height: 15rem;
          }
          
          .logo-container {
            width: 3.5rem;
            height: 3.5rem;
          }
          
          .logo-icon {
            width: 1.75rem;
            height: 1.75rem;
          }
        }

      `}</style>
    </div>
  );
};

export default SignIn;