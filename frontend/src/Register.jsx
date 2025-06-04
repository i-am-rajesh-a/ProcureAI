import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { User, Mail, Lock } from "lucide-react";  // Import icons
import logo from "./assets/buysmartlogoHD.png";
import clsx from "clsx";

const Register = () => {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState(""); // email
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formState, setFormState] = useState("idle"); // idle | success | error
  const [isMounted, setIsMounted] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleGoogleSuccess = async (credentialResponse) => {
    const token = credentialResponse.credential;
    try {
      const res = await fetch("http://localhost:5000/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("user", JSON.stringify(data.user));
        setFormState("success");
        setTimeout(() => navigate("/home"), 1000);
      } else {
        alert("Google authentication failed: " + (data.error || "Unknown error"));
      }
    } catch {
      alert("Error during Google authentication.");
    }
  };

  const handleGoogleError = () => {
    console.error("Google login failed");
    alert("Google login failed.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setFormState("idle");
    try {
      const res = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          full_name: fullName,
        }),
      });
      const data = await res.json();
      if (res.status === 201 && data.success) {
        localStorage.setItem("user", JSON.stringify(data.user));
        setFormState("success");
        setTimeout(() => navigate("/home"), 1000);
      } else if (res.status === 409) {
        setFormState("error");
        alert("User already exists. Please log in or use a different email.");
      } else {
        setFormState("error");
        alert(data.message || "Registration failed.");
      }
    } catch {
      setFormState("error");
      alert("Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center bg-[linear-gradient(90deg,_#667eea,_#764ba2)] animate-gradient-x px-4 overflow-hidden p-6 transition-opacity duration-700 ${
        isMounted ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="absolute inset-0 backdrop-blur-sm"></div>
      <div
        className={clsx(
          "relative z-10 w-full max-w-md bg-white/10 border border-white/30 rounded-2xl shadow-lg p-8 backdrop-blur-2xl text-white transition-all duration-500 animate-in fade-in zoom-in",
          formState === "error" && "animate-shake",
          formState === "success" && "animate-successPulse"
        )}
      >
        <img
          src={logo}
          alt="BuySmart Logo"
          className="w-48 mx-auto mb-4 drop-shadow-lg"
        />
        <p className="text-center text-gray-200 mb-8 font-medium tracking-wide">
          Create your free account
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Full Name with Icon */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
            <input
              type="text"
              id="fullName"
              placeholder=" "
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="peer w-full border border-purple-400 rounded-xl bg-white/90 text-gray-900 px-10 pt-6 pb-2 placeholder-transparent focus:border-purple-600 focus:ring-1 focus:ring-purple-600 focus:outline-none"
            />
            <label
              htmlFor="fullName"
              className="absolute left-10 top-2 text-purple-300 text-sm transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-purple-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-purple-600"
            >
              Full Name
            </label>
          </div>

          {/* Email with Icon */}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
            <input
              type="email"
              autoComplete="email"
              id="email"
              placeholder=" "
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="peer w-full border border-purple-400 rounded-xl bg-white/90 text-gray-900 px-10 pt-6 pb-2 placeholder-transparent focus:border-purple-600 focus:ring-1 focus:ring-purple-600 focus:outline-none"
            />
            <label
              htmlFor="email"
              className="absolute left-10 top-2 text-purple-300 text-sm transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-purple-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-purple-600"
            >
              Email
            </label>
          </div>

          {/* Password with Icon */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
            <input
              type="password"
              autoComplete="current-password"
              id="password"
              placeholder=" "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="peer w-full border border-purple-400 rounded-xl bg-white/90 text-gray-900 px-10 pt-6 pb-2 placeholder-transparent focus:border-purple-600 focus:ring-1 focus:ring-purple-600 focus:outline-none"
            />
            <label
              htmlFor="password"
              className="absolute left-10 top-2 text-purple-300 text-sm transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-purple-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-purple-600"
            >
              Password
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-purple-600 hover:bg-purple-700 active:scale-95 transition transform rounded-xl py-3 text-white font-semibold shadow-lg hover:shadow-purple-400/50 disabled:opacity-60"
          >
            {isLoading ? "Registering..." : formState === "success" ? "✔ Success!" : "Register"}
          </button>
        </form>

        <div className="flex items-center my-8">
          <div className="flex-grow border-t border-purple-400/50"></div>
          <span className="mx-4 text-sm text-purple-300 font-semibold">OR</span>
          <div className="flex-grow border-t border-purple-400/50"></div>
        </div>

        <div className="flex justify-center">
          <div className="cursor-pointer rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-transform duration-300">
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
          </div>
        </div>

        <p className="text-sm text-center text-purple-300 mt-10 font-light">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-purple-400 hover:underline font-medium transition-colors duration-300"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
