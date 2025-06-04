// HomePage.jsx
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRightIcon,
  RocketIcon,
  FileTextIcon,
  PackageIcon,
  HandshakeIcon,
  ScaleIcon,
  ReceiptIcon,
} from "lucide-react";

export default function HomePage() {
  const features = [
    {
      icon: <RocketIcon className="h-6 w-6 text-purple-600" />,
      title: "Vendor Recommendation",
      desc: "Find the best suppliers quickly using AI-powered insights.",
    },
    {
      icon: <FileTextIcon className="h-6 w-6 text-purple-600" />,
      title: "Contract Analysis",
      desc: "Instantly review and optimize procurement contracts.",
    },
    {
      icon: <PackageIcon className="h-6 w-6 text-purple-600" />,
      title: "Inventory Optimization",
      desc: "Monitor stock levels and get smart reorder suggestions.",
    },
    {
      icon: <HandshakeIcon className="h-6 w-6 text-purple-600" />,
      title: "Negotiation Support",
      desc: "Receive counter-offer strategies from your AI agent.",
    },
    {
      icon: <ScaleIcon className="h-6 w-6 text-purple-600" />,
      title: "Quantity Flexibility",
      desc: "Adapt procurement volumes dynamically to market demand.",
    },
    {
      icon: <ReceiptIcon className="h-6 w-6 text-purple-600" />,
      title: "Invoice Validation",
      desc: "Verify invoices for accuracy and compliance in real-time.",
    },
  ];

  return (
    <main className="bg-gradient-to-br from-indigo-100 to-purple-200 min-h-screen py-20 px-4">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="text-center max-w-4xl mx-auto mb-20"
      >
        <h1 className="text-4xl md:text-6xl font-extrabold text-gray-800 leading-tight">
          Empowering Smarter Procurement with AI
        </h1>
        <p className="mt-6 text-lg md:text-xl text-gray-600">
          Discover vendors, analyze contracts, manage inventory, and optimize purchasing—all in one intelligent platform.
        </p>
        <div className="mt-8 flex justify-center gap-4 flex-wrap">
          <Link
            to="/dashboard"
            className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-xl shadow-lg font-semibold transition transform hover:scale-105"
          >
            Go to Dashboard
          </Link>
          <Link
            to="/chatbot"
            className="bg-white text-purple-700 border border-purple-500 hover:bg-purple-100 py-3 px-6 rounded-xl font-semibold transition transform hover:scale-105"
          >
            Try Vendor Agent
          </Link>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={{
          hidden: { opacity: 0, y: 30 },
          visible: {
            opacity: 1,
            y: 0,
            transition: {
              staggerChildren: 0.1,
            },
          },
        }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto"
      >
        {features.map((item, idx) => (
          <motion.div
            key={idx}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition duration-300 hover:scale-[1.02]"
          >
            <div className="flex items-center gap-3 mb-4">
              {item.icon}
              <h3 className="text-lg font-bold text-gray-800">
                {item.title}
              </h3>
            </div>
            <p className="text-gray-600 text-sm">{item.desc}</p>
          </motion.div>
        ))}
      </motion.section>

      {/* Footer CTA */}
      <motion.section
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center mt-24"
      >
        <p className="text-lg text-gray-700 font-medium mb-4">
          Ready to transform procurement?
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-white bg-purple-600 hover:bg-purple-700 py-3 px-6 rounded-xl font-semibold shadow-lg transition transform hover:scale-105"
        >
          Launch AI Dashboard <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </motion.section>
    </main>
  );
}
