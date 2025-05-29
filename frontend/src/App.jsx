import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePages.jsx";
import Chatbot from "./Chatbot";
import Login from "./Login";
import Register from "./Register"; 
import HeroSection from "./Herosection";
import"./App.css";
function DashboardComponent() {
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h2>Dashboard Coming Soon!</h2>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HeroSection />} />
      {/* ⬅️ Home route */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} /> {/* ⬅️ Register route */}
      <Route path="/home" element={<HomePage />} />
      <Route path="/chatbot" element={<Chatbot />} />
      <Route path="/dashboard" element={<DashboardComponent />} />
    </Routes>
  );
}
