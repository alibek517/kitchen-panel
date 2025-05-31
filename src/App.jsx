import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Menyu from './Kitchenpanel';
import Logout from './pages/logout';
import SignIn from './pages/SingIn';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    setIsLoggedIn(role === 'KITCHEN');
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<SignIn />} />
        <Route path="/logout" element={<Logout />} />
        <Route
          path="/kitchen"
          element={<Menyu />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
