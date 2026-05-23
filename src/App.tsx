import { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./components/home";

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
            <Route path="/" element={<Home />} />
          </Routes>
        </>
      </Suspense>
    </div>
  );
}

export default App;

