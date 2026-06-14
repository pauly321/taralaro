import { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./components/home";
import LoginPage from "./components/auth/LoginPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";

function App() {
  return (
    <div style={{ backgroundColor: '#0D1B2A', minHeight: '100vh' }}>
      <Suspense fallback={
        <div style={{ backgroundColor: '#0D1B2A', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🏀</div>
            <p style={{ color: '#F4722B', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 900, fontSize: 24 }}>
              TARA LARO
            </p>
          </div>
        </div>
      }>
        <>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Home />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </>
      </Suspense>
    </div>
  );
}

export default App;

