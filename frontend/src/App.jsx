import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePages.jsx";
import Chatbot from "./Chatbot";
import Register from "./Register"; 
import HeroSection from "./Herosection";
import "./App.css";
function DashboardComponent() {
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h2>Dashboard Coming Soon!</h2>
    </div>
  );
}

export default function App() {
  // Use a real MongoDB ObjectId here!
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <Routes>
      <Route path="/" element={<HeroSection />} />
      <Route path="/login" element={<Register initialForm="login" />} />
      <Route path="/register" element={<Register initialForm="register" />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/chatbot" element={user && user._id ? <Chatbot userId={user._id} /> : <div>Loading...</div>} />
      <Route path="/dashboard" element={<DashboardComponent />} />
    </Routes>
  );
}
