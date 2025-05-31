import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import KitchenPanel from './Kitchenpanel';
import Login from './pages/SingIn';    
import Logout from './pages/logout';  

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/kitchen" element={<KitchenPanel />} />
        
        <Route path="/login" element={<Login />} />
        
        <Route path="/logout" element={<Logout />} />
        
        <Route path="*" element={<Navigate to="/kitchen" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
