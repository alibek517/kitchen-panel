import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Menyu from './Kitchenpanel';
import Logout from './pages/logout';
import SignIn from './pages/SingIn';
import Arxiv from './pages/Arxiv';
import Maxsulotlar from './pages/Maxsulotlar';

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
        <Route path="/archive" element={<Arxiv />} />
        <Route path="/maxsulotlar" element={<Maxsulotlar />} />
        <Route
          path="/kitchen"
          element={<Menyu />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
