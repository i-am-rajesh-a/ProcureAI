import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon, LogInIcon } from 'lucide-react';
import logo from './assets/buysmartlogoHD.png';

export default function HeroSection() {
  const navigate = useNavigate();

  return (
    <div className="relative min-w-screen min-h-screen flex items-center justify-center bg-gradient-to-br from-[#6b7cff] via-[#a855f7] to-[#6b7cff] bg-[length:200%_200%] animate-[gradientShift_10s_ease_infinite] px-6 sm:px-12">
      {/* Background Blur Circles with subtle animation */}
      <div className="absolute w-[700px] h-[700px] rounded-full bg-[#3b82f6] blur-[120px] opacity-30 top-[-100px] left-[-100px] animate-pulse"></div>
      <div className="absolute w-[700px] h-[700px] rounded-full bg-[#8b5cf6] blur-[120px] opacity-30 bottom-[-100px] right-[-100px] animate-pulse delay-1000"></div>

      {/* Hero Content */}
      <div className="relative z-10 text-center text-white max-w-4xl">
        {/* Tagline badge */}
        <div className="inline-block mb-4 px-4 py-1 text-sm font-medium bg-white text-[#1d4ed8] rounded-full shadow-md">
          #1 AI Solution for Procurement Teams
        </div>

        {/* Branding */}
        <div className="mb-4">
          <img
            src={logo}
            alt="BuySmart Logo"
            className="w-[90%] sm:w-[50%] max-w-[600px] mx-auto h-auto drop-shadow-lg"
          />
        </div>

        {/* Headline */}
        <h2 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
          Supercharge Your{' '}
          <span className="bg-gradient-to-r from-[#2f6bcc] via-[#4200dc] to-[#4d00d1] bg-clip-text text-transparent animate-text">
            Procurement Workflow
          </span>
        </h2>

        {/* Subtext */}
        <p className="text-lg sm:text-xl text-[#ddd] mb-8">
          Automate vendor discovery, quote analysis, and strategic sourcing with next-gen AI.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={() => navigate("/login")}
            className="bg-white text-[#1d4ed8] font-semibold px-6 py-3 rounded-xl shadow-md flex items-center gap-2 hover:bg-[#f9fafb] hover:shadow-[0_0_15px_rgba(59,130,246,0.4)] transition"
          >
            <LogInIcon className="w-5 h-5" /> Login
          </button>
          <button
            onClick={() => navigate("/register")}
            className="bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white font-semibold px-6 py-3 rounded-xl shadow-md flex items-center gap-2 hover:from-[#1d4ed8] hover:to-[#7c3aed] hover:shadow-[0_0_15px_rgba(139,92,246,0.4)] transition"
          >
            Get Started <ArrowRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}