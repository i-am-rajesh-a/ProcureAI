import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { LockIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import clsx from "clsx";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token.");
      triggerShake();
    }
    setTimeout(() => setIsMounted(true), 0);
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      triggerShake();
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch("http://localhost:5000/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await res.json();
      if (res.status === 200 && data.success) {
        setSuccess("Password reset successfully. Redirecting to login...");
        setTimeout(() => navigate("/login"), 3000);
      } else {
        setError(data.message || "Failed to reset password.");
        triggerShake();
      }
    } catch {
      setError("An error occurred while resetting the password.");
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  // This function is kept for compatibility, but does nothing now.
  const triggerShake = () => {};

  return (
    <div
      className={clsx(
        "min-h-screen flex items-center justify-center px-4 transition-opacity duration-700",
        isMounted ? "opacity-100" : "opacity-0"
      )}
    >
      <style>
        {`
          @import url("https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap");

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: "Poppins", sans-serif;
            text-decoration: none;
            list-style: none;
          }

          body {
            min-height: 100vh;
            background: linear-gradient(45deg, #6b7cff, #a855f7, #6b7cff);
            background-size: 200% 200%;
            animation: gradientShift 10s ease infinite;
          }

          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }

          @keyframes fadeInText {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }

          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
          }

          .animate-shake {
            animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
          }

          .container {
            position: relative;
            width: 100%;
            max-width: 400px;
            min-height: 500px;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            box-shadow: 0 0 30px rgba(0, 0, 0, 0.3), inset 0 0 10px rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: clamp(20px, 4vw, 30px);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            transition: transform 0.5s ease-in-out, opacity 0.5s ease-in-out;
          }

          .container h1 {
            color: #1e40af;
            font-size: clamp(24px, 4vw, 32px);
            margin-bottom: 20px;
            font-weight: 700;
            text-align: center;
            animation: fadeInText 1s ease-in-out;
          }

          .container p {
            color: #3b82f6;
            font-size: clamp(12px, 2.5vw, 14px);
            margin-bottom: 20px;
            font-weight: 500;
            text-align: center;
            animation: fadeInText 1s ease-in-out;
          }

          .input-box {
            position: relative;
            margin: clamp(15px, 3vw, 20px) 0;
            width: 100%;
          }

          .input-box input {
            width: 100%;
            padding: clamp(10px, 2vw, 13px) clamp(35px, 7vw, 50px) clamp(10px, 2vw, 13px) clamp(30px, 6vw, 40px);
            background: rgba(255, 255, 255, 0.8);
            border-radius: 8px;
            border: 2px solid rgba(0, 0, 0, 0.1);
            outline: none;
            font-size: clamp(14px, 2.5vw, 16px);
            color: #1f2937;
            font-weight: 500;
            transition: all 0.3s ease;
          }

          .input-box input:focus {
            background: rgba(255, 255, 255, 0.95);
            box-shadow: 0 0 15px rgba(59, 130, 246, 0.3);
            border-color: #3b82f6;
          }

          .input-box input::placeholder {
            color: #6b7280;
            font-weight: 400;
            font-size: clamp(12px, 2vw, 14px);
          }

          .input-box svg {
            position: absolute;
            left: clamp(8px, 2vw, 12px);
            top: 50%;
            transform: translateY(-50%);
            width: clamp(16px, 3vw, 20px);
            height: clamp(16px, 3vw, 20px);
            color: #3b82f6;
            
          }

          .input-box .toggle-password {
            position: absolute;
            right: clamp(8px, 2vw, 12px);
            top: 50%;
            transform: translateY(-50%);
            width: clamp(16px, 3vw, 20px);
            height: clamp(16px, 3vw, 20px);
            cursor: pointer;
            border:none;
            background: transparent;
            transition: color 0.3s ease;
          }

          .input-box .toggle-password:hover {
            color: #3b82f6;
            border:none;
            background: transparent;
          }

          .btn {
            width: 100%;
            height: clamp(40px, 8vw, 48px);
            border-radius: 8px;
            border: none;
            cursor: pointer;
            font-size: clamp(14px, 2.5vw, 16px);
            color: #fff;
            font-weight: 600;
            background: linear-gradient(90deg, #3b82f6, #1d4ed8);
            box-shadow: 0 0 15px rgba(59, 130, 246, 0.4);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-top: 10px;
          }

          .btn:hover {
            background: linear-gradient(90deg, #1d4ed8, #3b82f6);
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.6);
            transform: translateY(-2px);
          }

          .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            box-shadow: none;
            transform: none;
          }

          .error-message {
            color: #ef4444;
            text-align: center;
            font-size: clamp(12px, 2vw, 14px);
            margin-top: 10px;
            font-weight: 500;
            background: rgba(254, 226, 226, 0.8);
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid rgba(248, 113, 113, 0.3);
          }

          .success-message {
            color: #10b981;
            text-align: center;
            font-size: clamp(12px, 2vw, 14px);
            margin-top: 10px;
            font-weight: 500;
            background: rgba(209, 250, 229, 0.8);
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid rgba(52, 211, 153, 0.3);
          }

          .back-to-login {
            color: #3b82f6;
            font-size: clamp(12px, 2.5vw, 14px);
            font-weight: 500;
            text-align: center;
            margin-top: 20px;
            transition: color 0.3s ease;
          }

          .back-to-login:hover {
            color: #1d4ed8;
          }

          @media screen and (max-width: 768px) {
            .container {
              max-width: 500px;
              min-height: 450px;
              border-radius: 15px;
            }
          }

          @media screen and (max-width: 480px) {
            .container {
              max-width: calc(100vw - 40px);
              min-height: 400px;
              border-radius: 12px;
              padding: clamp(15px, 3vw, 20px);
            }

            .container h1 {
              font-size: clamp(20px, 5vw, 28px);
            }

            .container p {
              font-size: clamp(11px, 3vw, 13px);
            }

            .input-box {
              margin: clamp(12px, 2.5vw, 15px) 0;
            }

            .btn {
              height: clamp(36px, 7vw, 44px);
              font-size: clamp(13px, 2.5vw, 15px);
            }
          }

          @media screen and (max-width: 320px) {
            .container {
              max-width: calc(100vw - 20px);
              min-height: 380px;
              border-radius: 10px;
              padding: clamp(12px, 2.5vw, 15px);
            }

            .container h1 {
              font-size: clamp(18px, 5vw, 24px);
            }

            .container p {
              font-size: clamp(10px, 3vw, 12px);
            }

            .input-box {
              margin: clamp(10px, 2vw, 12px) 0;
            }

            .btn {
              height: clamp(34px, 7vw, 40px);
              font-size: clamp(12px, 2.5vw, 14px);
            }
          }
        `}
      </style>
      <div className="container">
        
        <h1>Reset Your Password</h1>
        <p>Enter a new password for your BuySmart account.</p>
        <form onSubmit={handleSubmit} className="w-full space-y-5">
          <div className="input-box">
            <LockIcon />
            <input
              type={showNewPassword ? "text" : "password"}
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="toggle-password"
            >
              {showNewPassword ? <EyeIcon /> : <EyeOffIcon />}
            </button>
          </div>
          <div className="input-box">
            <LockIcon />
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="toggle-password"
            >
              {showConfirmPassword ? <EyeIcon /> : <EyeOffIcon />}
            </button>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="btn"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 mr-2 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </button>
        </form>
        {success && (
          <div className="success-message">{success}</div>
        )}
        {error && (
          <div className="error-message animate-shake">{error}</div>
        )}
        <Link to="/login" className="back-to-login">
          Back to Login
        </Link>
      </div>
    </div>
  );
}