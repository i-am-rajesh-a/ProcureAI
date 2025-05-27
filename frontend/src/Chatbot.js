import React, { useState, useEffect, useRef } from "react";

const API_URL = "http://127.0.0.1:5000/recommend";
const QUESTION_API_URL = "http://127.0.0.1:5000/generate_questions";

const Chatbot = () => {
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hello! I'm your Procurement AI assistant. Please tell me what you need. Example: 'I need chairs' or '100 office supplies'.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationState, setConversationState] = useState({
    stage: "initial", // initial, clarifying, confirmation, timeline, ready
    productType: "",
    questions: [],
    attributes: {},
    currentQuestionIndex: 0,
    quantity: 1,
    location: "Unknown"
  });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Enhanced parser to extract item, quantity, and location
  const parseInput = (text) => {
    const qtyMatch = text.match(/(\d+)\s*(units|pcs|pieces|sets)?/i);
    const locationMatch = text.match(/(?:for|in)\s+([a-zA-Z\s]+?)(?:\s+within|\s+in\s+\d+|$)/i);
    
    // Extract the main product from the text
    let productType = text.replace(/^\d+\s*/, '').trim(); // Remove leading numbers
    productType = productType.replace(/\s*(for|in)\s+.*/i, '').trim(); // Remove location part
    productType = productType.replace(/\s*within\s+.*/i, '').trim(); // Remove timeline part

    return {
      quantity: qtyMatch ? parseInt(qtyMatch[1]) : 1,
      productType: productType,
      location: locationMatch ? locationMatch[1].trim() : "Unknown",
      originalText: text
    };
  };

  const generateQuestionsForProduct = async (productType, quantity) => {
    try {
      const response = await fetch(QUESTION_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          product: productType,
          quantity: quantity
        })
      });

      const data = await response.json();
      return data.questions || [];
    } catch (error) {
      console.error("Error generating questions:", error);
      // Fallback to generic questions if API fails
      return [
        { key: "specifications", question: `What specific requirements do you have for the ${productType}?` },
        { key: "quality", question: "What quality level do you need? (e.g., premium, standard, budget)" },
        { key: "features", question: "Any specific features or characteristics required?" },
        { key: "usage", question: "How will these be used? (e.g., office use, industrial, personal)" },
        { key: "budget_range", question: "What's your budget range per unit?" }
      ];
    }
  };

  const formatProductSummary = (productType, attributes, quantity) => {
    let summary = `📦 Product: ${quantity} ${productType}${quantity > 1 ? 's' : ''}\n`;
    summary += `🏢 Location: ${conversationState.location}\n\n`;
    summary += `📋 Specifications:\n`;
    
    Object.entries(attributes).forEach(([key, value]) => {
      const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      summary += `• ${formattedKey}: ${value}\n`;
    });
    
    return summary;
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { from: "user", text: input };
    setMessages((msgs) => [...msgs, userMessage]);
    setLoading(true);

    try {
      if (conversationState.stage === "initial") {
        const parsed = parseInput(input);
        
        if (parsed.productType) {
          // Generate dynamic questions for this product
          const questions = await generateQuestionsForProduct(parsed.productType, parsed.quantity);
          
          setConversationState({
            stage: "clarifying",
            productType: parsed.productType,
            questions: questions,
            attributes: {},
            currentQuestionIndex: 0,
            quantity: parsed.quantity,
            location: parsed.location
          });

          const firstQuestion = questions[0];
          const botReply = {
            from: "bot",
            text: `Great! I found that you need ${parsed.quantity} ${parsed.productType}${parsed.quantity > 1 ? 's' : ''}. Let me ask you a few questions to find the best options for you.\n\n${firstQuestion.question}`
          };
          setMessages((msgs) => [...msgs, botReply]);
        } else {
          // Generic product or fallback to original flow
          await handleGenericProduct(input);
        }
      } else if (conversationState.stage === "clarifying") {
        // Store the answer and ask next question
        const currentQuestion = conversationState.questions[conversationState.currentQuestionIndex];
        const updatedAttributes = {
          ...conversationState.attributes,
          [currentQuestion.key]: input
        };

        const nextQuestionIndex = conversationState.currentQuestionIndex + 1;

        if (nextQuestionIndex < conversationState.questions.length) {
          // Ask next question
          setConversationState({
            ...conversationState,
            attributes: updatedAttributes,
            currentQuestionIndex: nextQuestionIndex
          });

          const nextQuestion = conversationState.questions[nextQuestionIndex];
          const botReply = {
            from: "bot",
            text: nextQuestion.question
          };
          setMessages((msgs) => [...msgs, botReply]);
        } else {
          // All questions answered, show confirmation
          setConversationState({
            ...conversationState,
            attributes: updatedAttributes,
            stage: "confirmation"
          });

          // Format the product summary
          const productSummary = formatProductSummary(conversationState.productType, updatedAttributes, conversationState.quantity);
          
          const botReply = {
            from: "bot",
            text: `Perfect! Let me confirm your requirements:\n\n${productSummary}\n\nIs this correct? Please reply with "Yes" to confirm or "No" to make changes.`
          };
          setMessages((msgs) => [...msgs, botReply]);
        }
      } else if (conversationState.stage === "confirmation") {
        // Handle confirmation response
        const userResponse = input.toLowerCase().trim();
        
        if (userResponse.includes("yes") || userResponse.includes("confirm") || userResponse.includes("correct")) {
          // Move to timeline stage
          setConversationState({
            ...conversationState,
            stage: "timeline"
          });

          const botReply = {
            from: "bot",
            text: "Excellent! Now, what's your preferred delivery timeline? (e.g., within 7 days, within 2 weeks, within 1 month)"
          };
          setMessages((msgs) => [...msgs, botReply]);
        } else if (userResponse.includes("no") || userResponse.includes("change") || userResponse.includes("modify")) {
          // Restart the clarification process
          setConversationState({
            ...conversationState,
            stage: "clarifying",
            attributes: {},
            currentQuestionIndex: 0
          });

          const firstQuestion = conversationState.questions[0];
          const botReply = {
            from: "bot",
            text: `No problem! Let's go through the details again.\n\n${firstQuestion.question}`
          };
          setMessages((msgs) => [...msgs, botReply]);
        } else {
          // Ask for clearer confirmation
          const botReply = {
            from: "bot",
            text: "Please reply with 'Yes' to confirm these details are correct, or 'No' if you'd like to make changes."
          };
          setMessages((msgs) => [...msgs, botReply]);
        }
      } else if (conversationState.stage === "timeline") {
        // Extract timeline and make final recommendation
        const daysMatch = input.match(/(\d+)\s*(days?|weeks?|months?)/i);
        let days_needed = 30; // default
        
        if (daysMatch) {
          const num = parseInt(daysMatch[1]);
          const unit = daysMatch[2].toLowerCase();
          if (unit.includes('day')) days_needed = num;
          else if (unit.includes('week')) days_needed = num * 7;
          else if (unit.includes('month')) days_needed = num * 30;
        }

        // Prepare final request data
        const finalRequest = {
          item: `${conversationState.productType} with specifications: ${Object.entries(conversationState.attributes).map(([key, value]) => `${key}: ${value}`).join(', ')}`,
          quantity: conversationState.quantity,
          location: conversationState.location,
          days_needed: days_needed,
          product_type: conversationState.productType,
          attributes: conversationState.attributes
        };

        await makeRecommendation(finalRequest);
        
        // Reset conversation state
        setConversationState({
          stage: "initial",
          productType: "",
          questions: [],
          attributes: {},
          currentQuestionIndex: 0,
          quantity: 1,
          location: "Unknown"
        });
      }
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

  const handleGenericProduct = async (inputText) => {
    const parsed = parseInput(inputText);
    const requestData = {
      quantity: parsed.quantity,
      item: parsed.originalText,
      location: parsed.location,
      days_needed: 30
    };

    await makeRecommendation(requestData);
  };

  const makeRecommendation = async (requestData) => {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      const botReply = {
        from: "bot",
        text: data.recommendation,
        vendors: data.vendors,
      };

      setMessages((msgs) => [...msgs, botReply]);
      
      // Add follow-up message
      setTimeout(() => {
        setMessages((msgs) => [...msgs, {
          from: "bot",
          text: "Is there anything else you'd like to procure? Just let me know what you need!"
        }]);
      }, 1000);

    } catch (error) {
      console.error("Error making recommendation:", error);
      throw error;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getPlaceholderText = () => {
    switch (conversationState.stage) {
      case "clarifying":
        return "Enter your preference...";
      case "confirmation":
        return "Type 'Yes' to confirm or 'No' to make changes";
      case "timeline":
        return "e.g., within 7 days, 2 weeks, 1 month";
      default:
        return "Example: 'I need office supplies' or '100 printers for Mumbai'";
    }
  };

  return (
    <div style={styles.chatContainer}>
      <div style={styles.header}>
        Procure AI Chatbot
        {conversationState.stage !== "initial" && (
          <div style={styles.statusIndicator}>
            {conversationState.stage === "clarifying" && 
              `Clarifying ${conversationState.productType} details (${conversationState.currentQuestionIndex + 1}/${conversationState.questions.length})`
            }
            {conversationState.stage === "confirmation" && "Confirming product details"}
            {conversationState.stage === "timeline" && "Getting delivery timeline"}
          </div>
        )}
      </div>

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
              <div style={{ marginTop: 15, padding: 15, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 10 }}>
                <strong style={{ display: "block", marginBottom: 10, color: msg.from === "user" ? "white" : "#333" }}>
                  Recommended Vendors:
                </strong>
                <ul style={{ paddingLeft: 20, color: msg.from === "user" ? "white" : "#333" }}>
                  {msg.vendors.map((v, i) => (
                    <li key={i} style={{ marginBottom: 8 }}>
                      <strong>{v.name}</strong> — ₹{v.price}/unit, delivery in{" "}
                      {v.delivery_days} days, rating {v.rating}⭐
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div style={styles.inputContainer}>
        <textarea
          style={styles.textarea}
          rows={2}
          placeholder={getPlaceholderText()}
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
    width: "90vw",
    maxWidth: "800px",
    height: "90vh",
    margin: "20px auto",
    overflow: "hidden",
    border: "1px solid #ccc",
    borderRadius: "12px",
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
  statusIndicator: {
    fontSize: 12,
    fontWeight: 400,
    color: "#666",
    marginTop: 5,
    fontStyle: "italic"
  },
  messagesContainer: {
    flex: 1,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    gap: 12,
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