import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon, LogInIcon } from 'lucide-react';

export default function HeroSection() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-700 to-slate-900 px-6 sm:px-12">
      {/* Background Blur Circles with subtle animation */}
      <div className="absolute w-[400px] h-[400px] rounded-full bg-cyan-400 blur-[120px] opacity-20 top-[-100px] left-[-100px] animate-pulse"></div>
      <div className="absolute w-[400px] h-[400px] rounded-full bg-purple-500 blur-[120px] opacity-20 bottom-[-100px] right-[-100px] animate-pulse delay-1000"></div>

      {/* Hero Content */}
      <div className="relative z-10 text-center text-white max-w-4xl">
        {/* Tagline badge */}
        <div className="inline-block mb-4 px-4 py-1 text-sm font-medium bg-white text-indigo-900 rounded-full shadow-md">
          #1 AI Solution for Procurement Teams
        </div>

        {/* Branding */}
        <div className="flex justify-center items-center gap-4 mb-6">
          <div className="bg-gradient-to-r from-cyan-400 to-purple-500 p-3 rounded-xl shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold">
            <span className="bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-text">
              Procure
            </span>
            AI
          </h1>
        </div>

        {/* Headline */}
        <h2 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
          Supercharge Your{' '}
          <span className="bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-600 bg-clip-text text-transparent animate-text">
            Procurement Workflow
          </span>
        </h2>

        {/* Subtext */}
        <p className="text-lg sm:text-xl text-slate-300 mb-8">
          Automate vendor discovery, quote analysis, and strategic sourcing with next-gen AI.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={() => navigate("/login")}
            className="bg-white text-indigo-900 font-semibold px-6 py-3 rounded-xl shadow-md flex items-center gap-2 hover:bg-slate-100 transition"
          >
            <LogInIcon className="w-5 h-5" /> Login
          </button>
          <button
            onClick={() => navigate("/register")}
            className="bg-gradient-to-r from-cyan-400 to-purple-500 text-white font-semibold px-6 py-3 rounded-xl shadow-md flex items-center gap-2 hover:from-cyan-500 hover:to-purple-600 transition"
          >
            Get Started <ArrowRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
