import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Logout.css';

function Logout() {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogoutClick = () => {
    setShowConfirm(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    navigate('/login');
  };

  const cancelLogout = () => {
    setShowConfirm(false);
  };

  return (
    <div className="logout-page">
      <div className="logout-container">
        <h2>Ростан ҳам чиқиб кетмоқчимисиз?</h2>
        <div className="btn-group">
          <button className="btn cancel" onClick={() => navigate(-1)}>
            Йўқ, ортга
          </button>
          <button className="btn confirm" onClick={handleLogoutClick}>
            Ҳа, албатта
          </button>
        </div>

        {showConfirm && (
          <div className="modal-overlay">
            <div className="modal">
              <p>Аниқ тарк этмоқчимисиз?</p>
              <div className="modal-buttons">
                <button className="btn cancel" onClick={cancelLogout}>
                  Йўқ
                </button>
                <button className="btn confirm" onClick={confirmLogout}>
                  Ҳа
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default Logout;