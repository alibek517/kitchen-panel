import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import KitchenPanel from './Kitchenpanel';
import SignIn from './pages/SingIn';

function App() {
  const role = localStorage.getItem('userRole'); // userRole deb olamiz

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<SignIn />} />
        <Route
          path="/menyu"
          element={role === 'KITCHEN' ? <KitchenPanel /> : <Navigate to="/login" />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
