import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SingIn.css';

const SignIn = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        localStorage.setItem('userRole', foundUser.role);
        localStorage.setItem('user', JSON.stringify(foundUser));

        navigate('/menyu');
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
      <h1 className='kirish'>Oshpaz sifatida tizimga kirish</h1>
      <form onSubmit={handleSignIn}>
        <label htmlFor="username">Username</label>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
        
        <label htmlFor="password">Parol</label>
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

        <button type="submit">Kirish</button>
      </form>
    </div>
  );
};

export default SignIn;
