import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LockIcon, MailIcon } from "lucide-react";
import clsx from "clsx";
import logo from "./assets/buysmartlogoHD.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password }),
      });
      const data = await res.json();
      if (res.status === 200 && data.success) {
        localStorage.setItem("user", JSON.stringify(data.user));
        setError("");
        navigate("/home");
      }
    } catch {
      setError("An error occurred during login.");
      triggerShake();
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(90deg,_#667eea,_#764ba2)] animate-gradient-x px-4 overflow-hidden relative">
      <div className="absolute inset-0 backdrop-blur-sm"></div>

      <div
        className={clsx(
          "relative z-10 w-full max-w-md bg-white/10 border border-white/30 rounded-2xl shadow-lg p-8 backdrop-blur-2xl text-white transition-all duration-500 animate-in fade-in zoom-in",
          shake && "animate-shake"
        )}
      >
        <div className="text-center mb-6">
          <img
            src={logo}
            alt="BuySmart Logo"
            className="w-48 mx-auto mb-4 drop-shadow-lg"
          />
          <p className="text-gray-200 text-sm">Login to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <MailIcon className="absolute w-5 h-5 text-[#7145e0] left-3 top-3.5" />
            <input
              type="email"
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 bg-white/80 text-gray-900 border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-white transition"
            />
          </div>

          <div className="relative">
            <LockIcon className="absolute w-5 h-5 text-[#7145e0] left-3 top-3.5" />
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 bg-white/80 text-gray-900 border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-white transition"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-white text-indigo-700 py-3 rounded-xl font-semibold hover:bg-slate-100 transition duration-300"
          >
            Login
          </button>
        </form>

        {error && (
          <div className="text-red-300 text-center text-sm mt-4 animate-shake">
            {error}
          </div>
        )}

        <div className="text-center text-sm mt-6 text-white/90">
          Don’t have an account?{" "}
          <Link to="/register" className="underline font-medium hover:text-white">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
