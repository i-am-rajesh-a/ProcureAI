import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LockIcon, MailIcon } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email === "user@example.com" && password === "password123") {
      setError("");
      navigate("/home");
    } else {
      setError("Invalid email or password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-100 to-slate-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-indigo-900">ProcureAI</h1>
          <p className="text-gray-500 text-sm mt-2">Login to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <MailIcon className="absolute w-5 h-5 text-gray-400 left-3 top-3.5" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            />
          </div>

          <div className="relative">
            <LockIcon className="absolute w-5 h-5 text-gray-400 left-3 top-3.5" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition"
          >
            Login
          </button>
        </form>

        {error && (
          <div className="text-red-500 text-center text-sm mt-4">{error}</div>
        )}

        <div className="text-center text-sm mt-6 text-gray-600">
          Don’t have an account?{" "}
          <Link to="/register" className="text-indigo-600 font-medium hover:underline">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
