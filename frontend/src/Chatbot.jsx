import { useState, useEffect, useRef } from "react";

const API_URL = "http://127.0.0.1:5000/recommend";
const QUESTION_API_URL = "http://127.0.0.1:5000/generate_questions";

const Chatbot = () => {
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hello! 👋 I'm your Procurement AI assistant. I can help you find products, compare prices, and connect with vendors. Type 'Hi' to start a conversation or tell me what you need to buy!",
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationState, setConversationState] = useState({
    stage: "initial", // initial, clarifying, confirmation, timeline, procurement_value, approach, woc_criteria, suppliers, woc_finalize, ready
    productType: "",
    questions: [],
    attributes: {},
    currentQuestionIndex: 0,
    quantity: 1,
    location: "Unknown",
    timeline: "",
    procurementValue: "",
    approach: "",
    wocCriteria: "",
    suppliers: "",
    finalWocJustification: ""
  });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset function to clear chat and restart conversation
  const resetChat = () => {
    setMessages([
      {
        from: "bot",
        text: "Hello! 👋 I'm your Procurement AI assistant. I can help you find products, compare prices, and connect with vendors. Type 'Hi' to start a conversation or tell me what you need to buy!",
      }
    ]);
    setInput("");
    setLoading(false);
    setConversationState({
      stage: "initial",
      productType: "",
      questions: [],
      attributes: {},
      currentQuestionIndex: 0,
      quantity: 1,
      location: "Unknown",
      timeline: "",
      procurementValue: "",
      approach: "",
      wocCriteria: "",
      suppliers: "",
      finalWocJustification: ""
    });
  };

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

  // Function to handle general/casual inputs
  const handleGeneralInput = (inputText) => {
    const lowerInput = inputText.toLowerCase().trim();
    
    // Greetings
    if (lowerInput.match(/^(hi|hello|hey|hii|helo|good morning|good afternoon|good evening)$/)) {
      return "Hello there! 👋 Welcome to Procure AI! I'm here to help you find the best procurement solutions. What would you like to purchase today? You can tell me something like 'I need office chairs' or '50 laptops for our company'.";
    }
    
    // How are you / status questions
    if (lowerInput.match(/(how are you|how're you|what's up|whats up|how do you do)/)) {
      return "I'm doing great, thank you for asking! 😊 I'm ready to help you with all your procurement needs. What products or services are you looking to purchase?";
    }
    
    // Help requests
    if (lowerInput.match(/(help|what can you do|what do you do|capabilities)/)) {
      return "I'm your AI procurement assistant! Here's how I can help you:\n\n🛒 Find products and services for your business\n💰 Compare prices from multiple vendors\n📅 Check delivery timelines\n⭐ Provide vendor ratings and reviews\n📍 Find suppliers in your location\n\nJust tell me what you need! For example:\n• 'I need 100 office chairs'\n• 'Looking for laptops under ₹50,000'\n• 'Need printing services in Mumbai'";
    }
    
    // Thank you
    if (lowerInput.match(/(thank you|thanks|thank u|thx)/)) {
      return "You're very welcome! 😊 I'm always here to help with your procurement needs. Is there anything else you'd like to purchase or any other way I can assist you?";
    }
    
    // Goodbye
    if (lowerInput.match(/(bye|goodbye|see you|see ya|take care)/)) {
      return "Goodbye! 👋 It was great helping you today. Feel free to come back anytime you need procurement assistance. Have a wonderful day!";
    }
    
    // Who are you / about
    if (lowerInput.match(/(who are you|what are you|about you|your name)/)) {
      return "I'm Procure AI, your intelligent procurement assistant! 🤖 I specialize in helping businesses and individuals find the best products, compare prices, and connect with reliable vendors. I can help you procure everything from office supplies to industrial equipment. What would you like to buy today?";
    }
    
    // General conversation
    if (lowerInput.match(/(nice|cool|awesome|great|ok|okay)/)) {
      return "Great! I'm glad you're here. What can I help you procure today? Whether it's office supplies, equipment, or services, just let me know what you need and I'll find the best options for you! 🛍️";
    }
    
    return null; // Return null if no general response matches
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { from: "user", text: input };
    setMessages((msgs) => [...msgs, userMessage]);
    setLoading(true);

    try {
      if (conversationState.stage === "initial") {
        // First check for general/casual inputs
        const generalResponse = handleGeneralInput(input);
        if (generalResponse) {
          const botReply = {
            from: "bot",
            text: generalResponse
          };
          setMessages((msgs) => [...msgs, botReply]);
          setLoading(false);
          setInput("");
          return;
        }

        // If not a general input, proceed with procurement logic
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
        // Handle timeline and move to procurement value stage
        setConversationState({
          ...conversationState,
          timeline: input,
          stage: "procurement_value"
        });

        const daysMatch = input.match(/(\d+)\s*(days?|weeks?|months?)/i);
        let days_needed = 30; // default
        
        if (daysMatch) {
          const num = parseInt(daysMatch[1]);
          const unit = daysMatch[2].toLowerCase();
          if (unit.includes('day')) days_needed = num;
          else if (unit.includes('week')) days_needed = num * 7;
          else if (unit.includes('month')) days_needed = num * 30;
        }

        // Make initial recommendation
        const initialRequest = {
          item: `${conversationState.productType} with specifications: ${Object.entries(conversationState.attributes).map(([key, value]) => `${key}: ${value}`).join(', ')}`,
          quantity: conversationState.quantity,
          location: conversationState.location,
          days_needed: days_needed,
          product_type: conversationState.productType,
          attributes: conversationState.attributes
        };

        await makeRecommendation(initialRequest);

        const botReply = {
          from: "bot",
          text: "Great! Now let's proceed with the procurement process.\n\n💰 **Step 2: Estimate Procurement Value**\n\nWhat is your estimated budget or cost range for this procurement? Please provide:\n• Total budget amount (e.g., ₹50,000 - ₹1,00,000)\n• Or budget per unit if you prefer\n• Any budget constraints or considerations"
        };
        setMessages((msgs) => [...msgs, botReply]);

      } else if (conversationState.stage === "procurement_value") {
        // Handle procurement value input and move to approach stage
        setConversationState({
          ...conversationState,
          procurementValue: input,
          stage: "approach"
        });

        const botReply = {
          from: "bot",
          text: "Perfect! Budget information recorded.\n\n🎯 **Step 3: Determine Best Fit Approach**\n\nBased on your requirements, I need to understand your preferred procurement method. Please select or describe:\n\n• **Open Tendering** - Public competitive bidding\n• **Limited tendering** - Invite selected suppliers\n• **Direct procurement** - Single supplier\n• **Framework agreement** - Pre-qualified suppliers\n• **Emergency procurement** - Urgent requirements\n\nWhich approach would you prefer, or do you need guidance on which method suits your needs best?"
        };
        setMessages((msgs) => [...msgs, botReply]);

      } else if (conversationState.stage === "approach") {
        // Handle approach selection and move to WOC criteria
        setConversationState({
          ...conversationState,
          approach: input,
          stage: "woc_criteria"
        });

        const botReply = {
          from: "bot",
          text: "Excellent choice! Procurement approach noted.\n\n📋 **Step 4: Justify Waiver of Competition (WOC)**\n\nFor your procurement approach, I need to understand the justification criteria. Please provide details about:\n\n• **Urgency** - Is this time-sensitive?\n• **Specialized requirements** - Unique specifications?\n• **Single source availability** - Only one supplier available?\n• **Compatibility** - Must match existing systems?\n• **Emergency situation** - Critical operational need?\n• **Other reasons** - Any specific justifications?\n\nPlease describe the main reasons that support your procurement approach."
        };
        setMessages((msgs) => [...msgs, botReply]);

      } else if (conversationState.stage === "woc_criteria") {
        // Handle WOC criteria and move to suppliers stage
        setConversationState({
          ...conversationState,
          wocCriteria: input,
          stage: "suppliers"
        });

        const botReply = {
          from: "bot",
          text: "Great! WOC criteria documented.\n\n🏢 **Step 5: Invite Suppliers**\n\nNow I need to identify potential suppliers for your procurement. Please provide:\n\n• **Preferred suppliers** - Any specific vendors you want to include?\n• **Supplier requirements** - Certifications, experience, location preferences?\n• **Exclusions** - Any suppliers to avoid?\n• **Number of suppliers** - How many suppliers should be invited?\n\nOr would you like me to recommend suppliers based on your requirements?"
        };
        setMessages((msgs) => [...msgs, botReply]);

      } else if (conversationState.stage === "suppliers") {
        // Handle suppliers input and move to final WOC stage
        setConversationState({
          ...conversationState,
          suppliers: input,
          stage: "woc_finalize"
        });

        const botReply = {
          from: "bot",
          text: "Perfect! Supplier information captured.\n\n✅ **Step 6: Finalise WOC Justification**\n\nLet me prepare your final Waiver of Competition justification. Please review and confirm:\n\n**Procurement Summary:**\n" +
          `📦 Product: ${conversationState.quantity} ${conversationState.productType}\n` +
          `📍 Location: ${conversationState.location}\n` +
          `⏰ Timeline: ${conversationState.timeline}\n` +
          `💰 Budget: ${conversationState.procurementValue}\n` +
          `🎯 Approach: ${conversationState.approach}\n` +
          `📋 WOC Criteria: ${conversationState.wocCriteria}\n` +
          `🏢 Suppliers: ${conversationState.suppliers}\n\n` +
          "Does this summary look correct? Type 'Yes' to finalize and get your procurement recommendations, or 'No' to make changes."
        };
        setMessages((msgs) => [...msgs, botReply]);

      } else if (conversationState.stage === "woc_finalize") {
        // Handle final confirmation
        const userResponse = input.toLowerCase().trim();
        
        if (userResponse.includes("yes") || userResponse.includes("confirm") || userResponse.includes("correct")) {
          // Prepare comprehensive final request
          const finalRequest = {
            item: `${conversationState.productType} with specifications: ${Object.entries(conversationState.attributes).map(([key, value]) => `${key}: ${value}`).join(', ')}`,
            quantity: conversationState.quantity,
            location: conversationState.location,
            days_needed: extractDaysFromTimeline(conversationState.timeline),
            product_type: conversationState.productType,
            attributes: conversationState.attributes,
            procurement_value: conversationState.procurementValue,
            approach: conversationState.approach,
            woc_criteria: conversationState.wocCriteria,
            suppliers: conversationState.suppliers
          };

          await makeComprehensiveRecommendation(finalRequest);
          
          // Reset conversation state after completion
          setConversationState({
            stage: "initial",
            productType: "",
            questions: [],
            attributes: {},
            currentQuestionIndex: 0,
            quantity: 1,
            location: "Unknown",
            timeline: "",
            procurementValue: "",
            approach: "",
            wocCriteria: "",
            suppliers: "",
            finalWocJustification: ""
          });
        } else if (userResponse.includes("no") || userResponse.includes("change") || userResponse.includes("modify")) {
          // Go back to timeline stage to restart the procurement process
          setConversationState({
            ...conversationState,
            stage: "timeline"
          });

          const botReply = {
            from: "bot",
            text: "No problem! Let's restart the procurement process. What's your preferred delivery timeline? (e.g., within 7 days, within 2 weeks, within 1 month)"
          };
          setMessages((msgs) => [...msgs, botReply]);
        } else {
          // Ask for clearer confirmation
          const botReply = {
            from: "bot",
            text: "Please reply with 'Yes' to finalize your procurement plan, or 'No' if you'd like to make changes to any step."
          };
          setMessages((msgs) => [...msgs, botReply]);
        }
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

  // Helper function to extract days from timeline text
  const extractDaysFromTimeline = (timelineText) => {
    const daysMatch = timelineText.match(/(\d+)\s*(days?|weeks?|months?)/i);
    if (daysMatch) {
      const num = parseInt(daysMatch[1]);
      const unit = daysMatch[2].toLowerCase();
      if (unit.includes('day')) return num;
      else if (unit.includes('week')) return num * 7;
      else if (unit.includes('month')) return num * 30;
    }
    return 30; // default
  };

  // Enhanced recommendation function for comprehensive procurement
  const makeComprehensiveRecommendation = async (requestData) => {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      const botReply = {
        from: "bot",
        text: `🎉 **Complete Procurement Plan Ready!**\n\n${data.recommendation}\n\n📋 **WOC Justification Summary:**\n• Approach: ${requestData.approach}\n• Criteria: ${requestData.woc_criteria}\n• Suppliers: ${requestData.suppliers}\n• Budget: ${requestData.procurement_value}\n\nYour procurement process is now ready to proceed with proper justification and supplier engagement!`,
        vendors: data.vendors,
      };

      setMessages((msgs) => [...msgs, botReply]);
      
      // Add follow-up message
      setTimeout(() => {
        setMessages((msgs) => [...msgs, {
          from: "bot",
          text: "🌟 Procurement plan completed successfully! Is there anything else you'd like to procure or any other assistance you need?"
        }]);
      }, 1000);

    } catch (error) {
      console.error("Error making comprehensive recommendation:", error);
      const errorReply = {
        from: "bot",
        text: "I apologize, but there was an error generating your procurement plan. However, I have all your requirements documented. Please try again or contact support if the issue persists."
      };
      setMessages((msgs) => [...msgs, errorReply]);
    }
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
      case "procurement_value":
        return "e.g., ₹50,000 - ₹1,00,000 or ₹500 per unit";
      case "approach":
        return "e.g., Open tendering, Direct procurement, Limited tendering";
      case "woc_criteria":
        return "Describe justification reasons (urgency, specialized requirements, etc.)";
      case "suppliers":
        return "List preferred suppliers or requirements";
      case "woc_finalize":
        return "Type 'Yes' to finalize or 'No' to make changes";
      default:
        return "Type 'Hi' to start or tell me what you need to buy...";
    }
  };

  return (
    <div style={styles.chatContainer}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <div style={styles.headerTitle}>Procure AI Chatbot</div>
            {conversationState.stage !== "initial" && (
              <div style={styles.statusIndicator}>
                {conversationState.stage === "clarifying" && 
                  `Clarifying ${conversationState.productType} details (${conversationState.currentQuestionIndex + 1}/${conversationState.questions.length})`
                }
                {conversationState.stage === "confirmation" && "Confirming product details"}
                {conversationState.stage === "timeline" && "Getting delivery timeline"}
                {conversationState.stage === "procurement_value" && "Setting budget requirements"}
                {conversationState.stage === "approach" && "Choosing procurement approach"}
                {conversationState.stage === "woc_criteria" && "Defining WOC criteria"}
                {conversationState.stage === "suppliers" && "Selecting suppliers"}
                {conversationState.stage === "woc_finalize" && "Finalizing procurement plan"}
              </div>
            )}
          </div>
          <button 
            style={styles.resetButton}
            onClick={resetChat}
            title="Reset Chat"
          >
            Reset🔄
          </button>
        </div>
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
    borderBottom: "1px solid #ddd",
    backgroundColor: "#fff",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    color: "#333",
    userSelect: "none",
  },
  headerContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontWeight: 700,
    fontSize: 20,
  },
  statusIndicator: {
    fontSize: 12,
    fontWeight: 400,
    color: "#666",
    marginTop: 5,
    fontStyle: "italic"
  },
  resetButton: {
    background: "none",
    border: "1px solid #ddd",
    borderRadius: "20px",
    width: "90px",
    height: "40px",
    cursor: "pointer",
    fontSize: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    color: "#333",
    "&:hover": {
      backgroundColor: "#f0f0f0",
      borderColor: "#999",
    }
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