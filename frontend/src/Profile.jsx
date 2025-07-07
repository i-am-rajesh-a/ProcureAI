import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MailIcon, UserIcon, LockIcon } from "lucide-react";
import clsx from "clsx";
import logo from "./assets/buysmartlogoHD.png";

export default function Profile() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [shake, setShake] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user._id) {
      navigate("/login");
      return;
    }
    setEmail(user.email || "");
    setFullName(user.full_name || "");
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword && newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      triggerShake();
      return;
    }
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await fetch("http://localhost:5000/api/update-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id,
          email,
          fullName,
          newPassword: newPassword || undefined,
          currentPassword: currentPassword || undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 200 && data.success) {
        localStorage.setItem("user", JSON.stringify({ ...user, email, full_name: fullName }));
        setSuccess("Profile updated successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => navigate("/home"), 3000);
      } else {
        setError(data.message || "Failed to update profile.");
        triggerShake();
      }
    } catch {
      setError("An error occurred while updating the profile.");
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
          <p className="text-gray-200 text-sm">Update Your Profile</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <MailIcon className="absolute w-5 h-5 text-[#7145e0] left-3 top-3.5" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 bg-white/80 text-gray-900 border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-white transition"
            />
          </div>

          <div className="relative">
            <UserIcon className="absolute w-5 h-5 text-[#7145e0] left-3 top-3.5" />
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 bg-white/80 text-gray-900 border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-white transition"
            />
          </div>

          <div className="relative">
            <LockIcon className="absolute w-5 h-5 text-[#7145e0] left-3 top-3.5" />
            <input
              type="password"
              placeholder="Current Password (if changing password)"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/80 text-gray-900 border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-white transition"
            />
          </div>

          <div className="relative">
            <LockIcon className="absolute w-5 h-5 text-[#7145e0] left-3 top-3.5" />
            <input
              type="password"
              placeholder="New Password (optional)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/80 text-gray-900 border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-white transition"
            />
          </div>

          <div className="relative">
            <LockIcon className="absolute w-5 h-5 text-[#7145e0] left-3 top-3.5" />
            <input
              type="password"
              placeholder="Confirm New Password (optional)"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/80 text-gray-900 border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-white transition"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-white text-indigo-700 py-3 rounded-xl font-semibold hover:bg-slate-100 transition duration-300"
          >
            Update Profile
          </button>
        </form>

        {success && (
          <div className="text-green-300 text-center text-sm mt-4">
            {success}
          </div>
        )}
        {error && (
          <div className="text-red-300 text-center text-sm mt-4 animate-shake">
            {error}
          </div>
        )}

        <div className="text-center text-sm mt-6 text-white/90">
          Back to{" "}
          <Link to="/home" className="underline font-medium hover:text-white">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}