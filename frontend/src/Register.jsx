import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { LockIcon, MailIcon, UserIcon } from "lucide-react";
import PropTypes from "prop-types";

const Register = ({ initialForm = "login" }) => {
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [formState, setFormState] = useState("idle");
  const [isMounted, setIsMounted] = useState(false);
  const [isActive, setIsActive] = useState(initialForm === "login");// Start with true to show login form first
  const navigate = useNavigate();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await fetch("http://localhost:5000/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credentialResponse.credential })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("user", JSON.stringify(data.user));
        setFormState("success");
        setTimeout(() => navigate("/home"), 1000);
      } else {
        setFormState("error");
        alert(`Google authentication failed: ${data.error || "Unknown error"}`);
      }
    } catch {
      setFormState("error");
      alert("Error during Google authentication.");
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setFormState("idle");
    try {
      const res = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          full_name: formData.fullName
        })
      });
      const data = await res.json();
      if (res.status === 201 && data.success) {
        localStorage.setItem("user", JSON.stringify(data.user));
        setFormState("success");
        setTimeout(() => navigate("/home"), 1000);
      } else {
        setFormState("error");
        alert(
          res.status === 409
            ? "An account with this email already exists. Please sign in or use a different email address."
            : data.message || "Registration was unsuccessful. Please try again."
        );
      }
    } catch {
      setFormState("error");
      alert("Unable to complete registration. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setFormState("idle");
    try {
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      });
      const data = await res.json();
      if (res.status === 200 && data.success) {
        localStorage.setItem("user", JSON.stringify(data.user));
        setFormState("success");
        setTimeout(() => navigate("/home"), 1000);
      } else {
        setFormState("error");
        alert(data.message || "Sign in was unsuccessful. Please check your credentials and try again.");
      }
    } catch {
      setFormState("error");
      alert("Unable to complete sign in. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleForm = () => setIsActive(!isActive);

  return (
    <div
      className={`min-h-screen flex items-center justify-center px-4 transition-opacity duration-700 ${
        isMounted ? "opacity-100" : "opacity-0"
      }`}
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

          .container {
            position: relative;
            width: 100%;
            max-width: 850px;
            height: auto;
            min-height: 550px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            box-shadow: 0 0 30px rgba(0, 0, 0, 0.3), inset 0 0 10px rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            overflow: hidden;
            display: flex;
          }

          .container h1 {
            font-size: clamp(24px, 5vw, 36px);
            margin: -10px 0;
            color: #fff;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }

          .container p {
            font-size: clamp(12px, 2.5vw, 14.5px);
            margin: 15px 0;
            color: #ddd;
            line-height: 1.4;
            text-align: center;
          }

          form {
            width: 100%;
          }

          .form-box {
            position: absolute;
            width: 50%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: clamp(20px, 4vw, 40px);
            z-index: 1;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(5px);
            transition: transform 1s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-in-out;
          }

          .form-box.login {
            right: 0;
            transform: translateX(${isActive ? "0" : "100%"});
            opacity: ${isActive ? "1" : "0"};
            border-top-right-radius: 20px;
            border-bottom-right-radius: 20px;
          }

          .form-box.register {
            left: 0;
            transform: translateX(${isActive ? "-100%" : "0"});
            opacity: ${isActive ? "0" : "1"};
            border-top-left-radius: 20px;
            border-bottom-left-radius: 20px;
          }

          /* Login form styling with blue theme */
          .form-box.login h1 {
            color: #1e40af;
            font-size: clamp(24px, 4vw, 32px);
            margin-bottom: 20px;
            font-weight: 700;
            text-shadow: none;
            text-align: center;
          }

          .form-box.login p {
            color: #3b82f6;
            font-weight: 500;
            text-shadow: none;
          }

          /* Register form styling with purple theme */
          .form-box.register h1 {
            color: #7c3aed;
            font-size: clamp(24px, 4vw, 32px);
            margin-bottom: 20px;
            font-weight: 700;
            text-shadow: none;
            text-align: center;
          }

          .form-box.register p {
            color: #8b5cf6;
            font-weight: 500;
            text-shadow: none;
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

          .form-box.login .input-box input:focus {
            background: rgba(255, 255, 255, 0.95);
            box-shadow: 0 0 15px rgba(59, 130, 246, 0.3);
            border-color: #3b82f6;
          }

          .form-box.register .input-box input:focus {
            background: rgba(255, 255, 255, 0.95);
            box-shadow: 0 0 15px rgba(139, 92, 246, 0.3);
            border-color: #8b5cf6;
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
            color: #6b7280;
          }

          .form-box.login .input-box svg {
            color: #3b82f6;
          }

          .form-box.register .input-box svg {
            color: #8b5cf6;
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
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
            margin-top: 10px;
          }

          .form-box.login .btn {
            background: linear-gradient(90deg, #3b82f6, #1d4ed8);
            box-shadow: 0 0 15px rgba(59, 130, 246, 0.4);
          }

          .form-box.login .btn:hover {
            background: linear-gradient(90deg, #1d4ed8, #3b82f6);
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.6);
            transform: translateY(-2px);
          }

          .form-box.register .btn {
            background: linear-gradient(90deg, #8b5cf6, #7c3aed);
            box-shadow: 0 0 15px rgba(139, 92, 246, 0.4);
          }

          .form-box.register .btn:hover {
            background: linear-gradient(90deg, #7c3aed, #8b5cf6);
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.6);
            transform: translateY(-2px);
          }

          .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            box-shadow: none;
            transform: none;
          }

          .social-icons {
            display: flex;
            justify-content: center;
            margin: 20px 0;
          }

          .social-icons .google-btn {
            width: 100%;
            display: flex;
            justify-content: center;
          }

          .google-mock-btn {
            width: 100%;
            height: clamp(40px, 8vw, 48px);
            background: #fff;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-size: clamp(12px, 2.5vw, 16px);
            font-weight: 500;
            color: #374151;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .google-mock-btn:hover {
            background: #f9fafb;
            border-color: #d1d5db;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }

          .google-mock-btn svg {
            width: clamp(16px, 3vw, 20px);
            height: clamp(16px, 3vw, 20px);
          }

          .toggle-box {
            position: absolute;
            width: 100%;
            height: 100%;
            z-index: 0;
          }

          .toggle-box::before {
            content: "";
            position: absolute;
            left: ${isActive ? "0" : "50%"};
            width: 50%;
            height: 100%;
            background: linear-gradient(45deg, rgba(59, 130, 246, 0.4), rgba(139, 92, 246, 0.4));
            backdrop-filter: blur(8px);
            border-top-left-radius: ${isActive ? "20px" : "0"};
            border-bottom-left-radius: ${isActive ? "20px" : "0"};
            border-top-right-radius: ${isActive ? "0" : "20px"};
            border-bottom-right-radius: ${isActive ? "0" : "20px"};
            transition: left 1s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 0 20px rgba(116, 148, 236, 0.4);
          }

          .toggle-panel {
            position: absolute;
            width: 50%;
            height: 100%;
            color: #fff;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 1;
            padding: clamp(15px, 3vw, 30px);
            transition: opacity 0.5s ease-in-out, transform 1s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .toggle-panel.toggle-left {
            left: 0;
            opacity: ${isActive ? "1" : "0"};
            transform: translateX(${isActive ? "0" : "-20%"});
          }

          .toggle-panel.toggle-right {
            right: 0;
            opacity: ${isActive ? "0" : "1"};
            transform: translateX(${isActive ? "20%" : "0"});
          }

          .toggle-panel h1 {
            font-size: clamp(24px, 5vw, 36px);
            margin: -10px 0;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            animation: fadeInText 1s ease-in-out;
            text-align: center;
          }

          .toggle-panel p {
            font-size: clamp(12px, 2.5vw, 14.5px);
            margin: 15px 0;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            text-align: center;
            line-height: 1.4;
          }

          .toggle-panel .btn {
            width: clamp(120px, 25vw, 160px);
            height: clamp(40px, 7vw, 46px);
            background: transparent;
            border: 2px solid #fff;
            box-shadow: 0 0 15px rgba(255, 255, 255, 0.5);
            color: #fff;
            transition: all 0.3s ease;
            font-size: clamp(12px, 2.5vw, 14px);
          }

          .toggle-panel .btn:hover {
            background: rgba(255, 255, 255, 0.2);
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.8);
            transform: translateY(-2px);
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

          @keyframes fadeInText {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }

          /* Tablet styles */
          @media screen and (max-width: 1024px) {
            .container {
              max-width: 750px;
              min-height: 500px;
              border-radius: 18px;
            }
          }

          /* Small tablet / Large phone styles */
          @media screen and (max-width: 768px) {
            .container {
              height: calc(100vh - 20px);
              max-width: 500px;
              flex-direction: column;
              border-radius: 15px;
            }

            .form-box {
              width: 100%;
              height: 65%;
              bottom: 0;
              padding: clamp(15px, 4vw, 25px);
            }

            .form-box.login {
              transform: translateY(${isActive ? "0" : "100%"});
              opacity: ${isActive ? "1" : "0"};
              border-radius: 0;
              border-bottom-left-radius: 15px;
              border-bottom-right-radius: 15px;
            }

            .form-box.register {
              transform: translateY(${isActive ? "-100%" : "0"});
              opacity: ${isActive ? "0" : "1"};
              border-radius: 0;
              border-bottom-left-radius: 15px;
              border-bottom-right-radius: 15px;
            }

            .toggle-box::before {
              left: 0;
              top: ${isActive ? "0" : "65%"};
              width: 100%;
              height: 35%;
              border-radius: 0;
              border-top-left-radius: ${isActive ? "15px" : "0"};
              border-top-right-radius: ${isActive ? "15px" : "0"};
              border-bottom-left-radius: ${isActive ? "0" : "15px"};
              border-bottom-right-radius: ${isActive ? "0" : "15px"};
              transition: top 1s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .toggle-panel {
              width: 100%;
              height: 35%;
            }

            .toggle-panel.toggle-left {
              top: 0;
              opacity: ${isActive ? "1" : "0"};
              transform: translateY(${isActive ? "0" : "-20%"});
            }

            .toggle-panel.toggle-right {
              bottom: 0;
              opacity: ${isActive ? "0" : "1"};
              transform: translateY(${isActive ? "20%" : "0"});
            }
          }

          /* Mobile phone styles */
          @media screen and (max-width: 480px) {
            .container {
              height: calc(100vh - 10px);
              max-width: calc(100vw - 20px);
              min-height: 600px;
              border-radius: 12px;
            }

            .form-box {
              height: 70%;
              padding: clamp(12px, 3vw, 20px);
            }

            .toggle-box::before {
              top: ${isActive ? "0" : "70%"};
              height: 30%;
            }

            .toggle-panel {
              height: 30%;
              padding: clamp(10px, 2vw, 15px);
            }

            .toggle-panel h1 {
              font-size: clamp(20px, 6vw, 28px);
            }

            .toggle-panel p {
              font-size: clamp(11px, 3vw, 13px);
              margin: 10px 0;
            }

            .input-box {
              margin: clamp(12px, 2.5vw, 15px) 0;
            }

            .google-mock-btn {
              font-size: clamp(11px, 3vw, 13px);
              gap: 6px;
            }
          }

          /* Extra small devices */
          @media screen and (max-width: 320px) {
            .container {
              height: calc(100vh - 5px);
              border-radius: 10px;
              min-height: 550px;
            }

            .form-box {
              padding: 10px;
            }

            .toggle-panel {
              padding: 8px;
            }

            .toggle-panel h1 {
              font-size: 18px;
              margin: -5px 0;
            }

            .toggle-panel p {
              font-size: 10px;
              margin: 8px 0;
            }

            .toggle-panel .btn {
              width: 100px;
              height: 35px;
              font-size: 11px;
            }

            .input-box {
              margin: 10px 0;
            }

            .btn {
              height: 40px;
              font-size: 13px;
            }

            .google-mock-btn {
              height: 40px;
              font-size: 11px;
            }
          }

          /* Landscape orientation for mobile */
          @media screen and (max-height: 500px) and (orientation: landscape) {
            .container {
              flex-direction: row;
              height: calc(100vh - 10px);
              max-width: calc(100vw - 20px);
            }

            .form-box {
              width: 50%;
              height: 100%;
              padding: 15px;
            }

            .form-box.login {
              transform: translateX(${isActive ? "0" : "100%"});
              opacity: ${isActive ? "1" : "0"};
              border-radius: 0;
              border-top-right-radius: 12px;
              border-bottom-right-radius: 12px;
            }

            .form-box.register {
              transform: translateX(${isActive ? "-100%" : "0"});
              opacity: ${isActive ? "0" : "1"};
              border-radius: 0;
              border-top-left-radius: 12px;
              border-bottom-left-radius: 12px;
            }

            .toggle-box::before {
              left: ${isActive ? "0" : "50%"};
              top: 0;
              width: 50%;
              height: 100%;
              border-radius: 0;
              border-top-left-radius: ${isActive ? "12px" : "0"};
              border-bottom-left-radius: ${isActive ? "12px" : "0"};
              border-top-right-radius: ${isActive ? "0" : "12px"};
              border-bottom-right-radius: ${isActive ? "0" : "12px"};
              transition: left 1s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .toggle-panel {
              width: 50%;
              height: 100%;
            }

            .toggle-panel.toggle-left {
              left: 0;
              top: 0;
              opacity: ${isActive ? "1" : "0"};
              transform: translateX(${isActive ? "0" : "-20%"});
            }

            .toggle-panel.toggle-right {
              right: 0;
              bottom: auto;
              opacity: ${isActive ? "0" : "1"};
              transform: translateX(${isActive ? "20%" : "0"});
            }

            .toggle-panel h1 {
              font-size: 20px;
            }

            .toggle-panel p {
              font-size: 11px;
            }

            .form-box h1 {
              font-size: 22px;
            }

            .input-box {
              margin: 8px 0;
            }

            .btn {
              height: 35px;
              font-size: 13px;
            }

            .google-mock-btn {
              height: 35px;
              font-size: 12px;
            }
          }
        `}
      </style>
      <div className={`container ${isActive ? "active" : ""}`}>
        <div className="toggle-box">
          <div className="toggle-panel toggle-left">
            <h1>Welcome Back!</h1>
            <p>New to our platform? Create your account to get started.</p>
            <button className="btn" onClick={toggleForm}>
              Create Account
            </button>
          </div>
          <div className="toggle-panel toggle-right">
            <h1>Join Our Community</h1>
            <p>Already have an account? Sign in to continue your journey.</p>
            <button className="btn" onClick={toggleForm}>
              Sign In
            </button>
          </div>
        </div>
        <div className="form-box login">
          <form onSubmit={handleLoginSubmit}>
            <h1>Sign In</h1>
            <div className="input-box">
              <MailIcon />
              <input
                type="email"
                name="username"
                autoComplete="email"
                placeholder="Enter your email address"
                value={formData.username}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="input-box">
              <LockIcon />
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>
            <button type="submit" disabled={isLoading} className="btn">
              {isLoading
                ? "Signing In..."
                : formState === "success"
                ? "✓ Welcome Back!"
                : "Sign In"}
            </button>
            {formState === "error" && (
              <div className="error-message">
                Unable to sign in. Please verify your credentials and try again.
              </div>
            )}
          </form>
        </div>
        <div className="form-box register">
          <form onSubmit={handleRegisterSubmit}>
            <h1>Create Account</h1>
            <div className="input-box">
              <UserIcon />
              <input
                type="text"
                name="fullName"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="input-box">
              <MailIcon />
              <input
                type="email"
                name="username"
                autoComplete="email"
                placeholder="Enter your email address"
                value={formData.username}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="input-box">
              <LockIcon />
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                placeholder="Create a secure password"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>
            <button type="submit" disabled={isLoading} className="btn">
              {isLoading
                ? "Creating Account..."
                : formState === "success"
                ? "✓ Account Created!"
                : "Create Account"}
            </button>
            <p>or continue with</p>
            <div className="social-icons">
              <div className="google-btn">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => {
                    setFormState("error");
                    alert("Google authentication failed. Please try again.");
                  }}
                />
              </div>
            </div>
            {formState === "error" && (
              <div className="error-message">
                Unable to create account. Please check your information and try again.
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
Register.propTypes = {
  initialForm: PropTypes.string
};

export default Register;