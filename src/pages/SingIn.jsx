import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SingIn.css';

function generateToken(length = 40) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

const SignIn = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // 👁️🙈 toggle holati
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    try {
      const res = await fetch('https://suddocs.uz/user');
      const users = await res.json();

      const foundUser = users.find(
        (user) =>
          user.username === cleanUsername &&
          user.password === cleanPassword &&
          user.role === 'KITCHEN'
      );

      if (foundUser) {
        const token = generateToken();
        localStorage.setItem('authToken', token);
        localStorage.setItem('userRole', foundUser.role);
        localStorage.setItem('user', JSON.stringify(foundUser));

        navigate(`/menyu?token=${encodeURIComponent(token)}`);
      } else {
        alert('Foydalanuvchi topilmadi yoki parol noto‘g‘ri!');
      }
    } catch (error) {
      alert('Serverga ulanishda muammo!');
      console.error(error);
    }
  };

  return (
    <div className="signin-container">
      <h1>Oshpaz sifatida tizimga kirish</h1>
      <form onSubmit={handleSignIn}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
        
        <div className="password-field">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Parol"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <span
            className="toggle-password"
            onClick={() => setShowPassword(!showPassword)}
            style={{ cursor: 'pointer' }}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? '🙈' : '👁️'}
          </span>
        </div>

        <button type="submit">Sign In</button>
      </form>
    </div>
  );
};

export default SignIn;
