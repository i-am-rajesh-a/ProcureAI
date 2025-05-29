// HomePage.jsx
import { Link } from "react-router-dom";
import "./HomePages.css";
export default function HomePage() {
  return (
    <main className="main">
      {/* Hero Section */}
      <section className="hero">
        <h1 className="hero-title">
          Empowering Smarter Procurement with AI
        </h1>
        <p className="hero-subtitle">
          Discover vendors, analyze contracts, manage inventory, and optimize purchasing—all in one intelligent platform.
        </p>
        <div className="button-group">
          <Link to="/dashboard" className="button button-primary">
            Go to Dashboard
          </Link>
          <Link to="/chatbot" className="button button-secondary">
            Try Vendor Agent
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        {[
          {
            title: "Vendor Recommendation",
            desc: "Find the best suppliers quickly using AI-powered insights.",
            emoji: "🔍"
          },
          {
            title: "Contract Analysis",
            desc: "Instantly review and optimize procurement contracts.",
            emoji: "📄"
          },
          {
            title: "Inventory Optimization",
            desc: "Monitor stock levels and get smart reorder suggestions.",
            emoji: "📦"
          },
          {
            title: "Negotiation Support",
            desc: "Receive counter-offer strategies from your AI agent.",
            emoji: "🤝"
          },
          {
            title: "Quantity Flexibility",
            desc: "Adapt procurement volumes dynamically to market demand.",
            emoji: "⚖️"
          },
          {
            title: "Invoice Validation",
            desc: "Verify invoices for accuracy and compliance in real-time.",
            emoji: "🧾"
          },
        ].map((item, index) => (
          <div key={index} className="feature-card">
            <div className="feature-emoji">{item.emoji}</div>
            <h3 className="feature-title">{item.title}</h3>
            <p className="feature-desc">{item.desc}</p>
          </div>
        ))}
      </section>

      {/* Footer CTA */}
      <section className="footer">
        <p className="footer-text">Ready to transform procurement?</p>
        <Link to="/dashboard" className="cta-button">
          Launch AI Dashboard →
        </Link>
      </section>
    </main>
  );
}
