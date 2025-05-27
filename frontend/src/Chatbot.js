import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const API_URL = "http://127.0.0.1:5000/recommend";


const Chatbot = () => {
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hello! I'm your Procurement AI assistant. Please tell me what you need. Example: '100 office chairs for Mumbai within 10 days'.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Simple parser to extract item, quantity, location, days_needed from user text
  // (This is very basic, you can improve NLP parsing later)
  const parseInput = (text) => {
    const qtyMatch = text.match(/(\d+)\s*(units|pcs|pieces|sets)?/i);
    const locationMatch = text.match(/in\s+([a-zA-Z\s]+)/i);
    const daysMatch = text.match(/within\s+(\d+)\s*days?/i);
    const itemMatch = text.match(/\d+\s*([a-zA-Z\s]+?)\s*(for|in|within|$)/i);

    return {
      quantity: qtyMatch ? parseInt(qtyMatch[1]) : 1,
      item: itemMatch ? itemMatch[1].trim() : text,
      location: locationMatch ? locationMatch[1].trim() : "Unknown",
      days_needed: daysMatch ? parseInt(daysMatch[1]) : 30,
    };
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { from: "user", text: input };
    setMessages((msgs) => [...msgs, userMessage]);
    setLoading(true);

    try {
      const parsed = parseInput(input);

      // Use axios POST request
      const res = await axios.post(API_URL, parsed, {
        headers: { "Content-Type": "application/json" },
      });

      const data = res.data;

      const botReply = {
        from: "bot",
        text: data.recommendation,
        vendors: data.vendors,
      };

      setMessages((msgs) => [...msgs, botReply]);
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages((msgs) => [
        ...msgs,
        { from: "bot", text: "Sorry, there was an error. Please try again." },
      ]);
    } finally {
      setLoading(false);
      setInput("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={styles.chatContainer}>
      <div style={styles.header}>Procure AI Chatbot</div>

      <div style={styles.messagesContainer}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              ...styles.message,
              alignSelf: msg.from === "user" ? "flex-end" : "flex-start",
              backgroundColor: msg.from === "user" ? "#0b93f6" : "#e5e5ea",
              color: msg.from === "user" ? "white" : "black",
              borderTopLeftRadius: msg.from === "user" ? 20 : 0,
              borderTopRightRadius: msg.from === "user" ? 0 : 20,
              maxWidth: "75%",
              whiteSpace: "pre-wrap",
            }}
          >
            {msg.text}

            {msg.vendors && (
              <ul style={{ marginTop: 10, paddingLeft: 20, color: "#333" }}>
                {msg.vendors.map((v, i) => (
                  <li key={i}>
                    <strong>{v.name}</strong> — ₹{v.price}/unit, delivery in{" "}
                    {v.delivery_days} days, rating {v.rating}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div style={styles.inputContainer}>
        <textarea
          style={styles.textarea}
          rows={2}
          placeholder="Example: 100 office chairs for Mumbai within 10 days"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          style={{
            ...styles.sendButton,
            opacity: loading ? 0.6 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
          onClick={sendMessage}
          disabled={loading}
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
};

const styles = {
  chatContainer: {
    display: "flex",
  flexDirection: "column",
  width: "50vw",              // Full screen width
  height: "100vh",             // Full screen height
  overflow: "hidden",          // Prevent scrollbars
  border: "1px solid #ccc",
  borderRadius: "10px",        // Make sure to use 'px'
  fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
  boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
  backgroundColor: "#f9f9f9",
  },
  header: {
    padding: 20,
    fontWeight: 700,
    fontSize: 20,
    borderBottom: "1px solid #ddd",
    backgroundColor: "#fff",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    color: "#333",
    userSelect: "none",
  },
  messagesContainer: {
    flex: 1,
    padding: 30,
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    gap: 10,
  },
  message: {
    padding: "12px 18px",
    borderRadius: 20,
    fontSize: 16,
    lineHeight: 1.4,
    wordBreak: "break-word",
    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
  },
  inputContainer: {
    display: "flex",
    padding: 12,
    borderTop: "1px solid #ddd",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  textarea: {
    flex: 1,
    resize: "none",
    padding: 12,
    fontSize: 16,
    borderRadius: 20,
    border: "1px solid #ccc",
    outline: "none",
    fontFamily: "inherit",
  },
  sendButton: {
    marginLeft: 15,
    padding: "12px 28px",
    borderRadius: 20,
    border: "none",
    backgroundColor: "#0b93f6",
    color: "white",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 16,
    transition: "background-color 0.3s ease",
  },
};

export default Chatbot;
