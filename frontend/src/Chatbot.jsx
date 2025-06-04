import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import axios from "axios";

const isValidMongoObjectId = (id) => typeof id === "string" && /^[a-f\d]{24}$/i.test(id);

const Chatbot = ({ userId }) => {
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hello! 👋 I'm your Procurement AI assistant. I can help you find products, compare prices, and connect with vendors. Type 'Hi' to start or tell me what you need to buy!",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationState, setConversationState] = useState({
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
    finalWocJustification: "",
  });
  const [chatSessions, setChatSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editedTitle, setEditedTitle] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isValidMongoObjectId(userId)) {
      console.error("Invalid userId for chat history:", userId);
      return;
    }
    const fetchChatSessions = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/api/chat/sessions/${userId}`,
          { headers: { "X-User-Id": userId } }
        );
        setChatSessions(response.data);
      } catch (error) {
        console.error("Error fetching chat sessions:", error);
      }
    };
    fetchChatSessions();
  }, [userId]);

  const saveMessageToSession = async (sessionId, message) => {
    if (!sessionId) {
      console.error("Cannot save message: no sessionId");
      return;
    }
    try {
      await axios.post(
        "http://localhost:5000/api/chat/save",
        {
          sessionId,
          userId,
          from: message.from,
          text: message.text,
          timestamp: message.timestamp,
          state: conversationState,
        },
        { headers: { "X-User-Id": userId } }
      );
    } catch (error) {
      console.error("Error saving message:", error);
    }
  };

  const startNewSession = async (productType = "General Chat") => {
    try {
      const response = await axios.post(
        "http://localhost:5000/api/chat/start",
        { userId, productType },
        { headers: { "X-User-Id": userId } }
      );
      return response.data.sessionId;
    } catch (error) {
      console.error("Error creating new session:", error);
      return null;
    }
  };

  const loadSession = async (sessionId) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/chat/session/${sessionId}?userId=${userId}`,
        { headers: { "X-User-Id": userId } }
      );
      return response.data;
    } catch (error) {
      console.error("Error loading session:", error);
      return null;
    }
  };

  const deleteSession = async (sessionId) => {
    try {
      await axios.delete(
        `http://localhost:5000/api/chat/delete/${sessionId}?userId=${userId}`,
        { headers: { "X-User-Id": userId } }
      );
      return true;
    } catch (error) {
      console.error("Error deleting session:", error);
      return false;
    }
  };

  const renameSession = async (sessionId, newTitle) => {
    try {
      await axios.put(
        `http://localhost:5000/api/chat/rename`,
        { sessionId, userId, newTitle },
        { headers: { "X-User-Id": userId } }
      );
      return true;
    } catch (error) {
      console.error("Error renaming session:", error);
      return false;
    }
  };

  const startNewChat = async () => {
    const initialBotMessage = {
      from: "bot",
      text: "Hello! 👋 I'm your Procurement AI assistant. I can help you find products, compare prices, and connect with vendors. Type 'Hi' to start or tell me what you need to buy!",
      timestamp: new Date().toISOString(),
    };
    try {
      const newSessionId = await startNewSession();
      if (!newSessionId) throw new Error("Failed to create new session");

      await saveMessageToSession(newSessionId, initialBotMessage);
      setMessages([initialBotMessage]);
      setSelectedSessionId(newSessionId);
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
        finalWocJustification: "",
      });

      const sessionsResponse = await axios.get(
        `http://localhost:5000/api/chat/sessions/${userId}`,
        { headers: { "X-User-Id": userId } }
      );
      setChatSessions(sessionsResponse.data);
    } catch (error) {
      console.error("Error starting new chat:", error);
      setMessages([initialBotMessage]);
      setSelectedSessionId(null);
    }
    setInput("");
  };

  const loadChat = async (sessionId) => {
    const session = await loadSession(sessionId);
    if (session) {
      setMessages(
        session.messages && session.messages.length > 0
          ? session.messages
          : [
              {
                from: "bot",
                text: "Hello! 👋 I'm your Procurement AI assistant. Type 'Hi' to start.",
                timestamp: new Date().toISOString(),
              },
            ]
      );
      setSelectedSessionId(sessionId);
      setConversationState(
        session.state || {
          stage: "initial",
          productType: session.productType || "",
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
          finalWocJustification: "",
        }
      );
      setIsSidebarOpen(false);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    const success = await deleteSession(sessionId);
    if (success) {
      const sessionsResponse = await axios.get(
        `http://localhost:5000/api/chat/sessions/${userId}`,
        { headers: { "X-User-Id": userId } }
      );
      setChatSessions(sessionsResponse.data);
      if (selectedSessionId === sessionId) {
        startNewChat();
      }
    }
  };

  const handleRenameSession = async (sessionId, newTitle) => {
    const success = await renameSession(sessionId, newTitle);
    if (success) {
      const sessionsResponse = await axios.get(
        `http://localhost:5000/api/chat/sessions/${userId}`,
        { headers: { "X-User-Id": userId } }
      );
      setChatSessions(sessionsResponse.data);
      setEditingSessionId(null);
      setEditedTitle("");
    }
  };

  const parseInput = (text) => {
    const qtyMatch = text.match(/(\d+)\s*(units|pcs|pieces|sets)?/i);
    const locationMatch = text.match(/(?:for|in)\s+([a-zA-Z\s]+?)(?:\s+within|\s+in\s+\d+|$)/i);
    let productType = text.replace(/^\d+\s*/, "").trim();
    productType = productType.replace(/\s*(for|in)\s+.*/i, "").trim();
    productType = productType.replace(/\s*within\s+.*/i, "").trim();
    return {
      quantity: qtyMatch ? parseInt(qtyMatch[1]) : 1,
      productType: productType,
      location: locationMatch ? locationMatch[1].trim() : "Unknown",
      originalText: text,
    };
  };

  const generateQuestionsForProduct = async (productType, quantity) => {
    try {
      const response = await axios.post("http://localhost:5000/generate_questions", {
        product: productType,
        quantity: quantity,
      });
      return response.data.questions || [];
    } catch (error) {
      console.error("Error generating questions:", error);
      return [
        { key: "specifications", question: `What specific requirements do you have for the ${productType}?` },
        { key: "quality", question: "What quality level do you need? (e.g., premium, standard, budget)" },
        { key: "features", question: "Any specific features or characteristics required?" },
        { key: "usage", question: "How will these be used? (e.g., office use, industrial, personal)" },
        { key: "budget_range", question: "What's your budget range per unit?" },
      ];
    }
  };

  const formatProductSummary = (productType, attributes, quantity) => {
    let summary = `📦 Product: ${quantity} ${productType}${quantity > 1 ? "s" : ""}\n`;
    summary += `🏢 Location: ${conversationState.location}\n\n`;
    summary += `📋 Specifications:\n`;
    Object.entries(attributes).forEach(([key, value]) => {
      const formattedKey = key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      summary += `• ${formattedKey}: ${value}\n`;
    });
    return summary;
  };

  const handleGeneralInput = (inputText) => {
    const lowerInput = inputText.toLowerCase().trim();
    if (lowerInput.match(/^(hi|hello|hey|hii|helo|good morning|good afternoon|good evening)$/)) {
      return "Hello there! 👋 Welcome to Procure AI! I'm here to help you find the best procurement solutions. What would you like to purchase today? You can tell me something like 'I need office chairs' or '50 laptops for our company'.";
    }
    if (lowerInput.match(/(how are you|how're you|what's up|whats up|how do you do)/)) {
      return "I'm doing great, thank you for asking! 😊 I'm ready to help you with all your procurement needs. What products or services are you looking to purchase?";
    }
    if (lowerInput.match(/(help|what can you do|what do you do|capabilities)/)) {
      return "I'm your AI procurement assistant! Here's how I can help you:\n\n🛒 Find products and services for your business\n💰 Compare prices from multiple vendors\n📅 Check delivery timelines\n⭐ Provide vendor ratings and reviews\n📍 Find suppliers in your location\n\nJust tell me what you need! For example:\n• 'I need 100 office chairs'\n• 'Looking for laptops under ₹50,000'\n• 'Need printing services in Mumbai'";
    }
    if (lowerInput.match(/(thank you|thanks|thank u|thx)/)) {
      return "You're very welcome! 😊 I'm always here to help with your procurement needs. Is there anything else you'd like to purchase or any other way I can assist you?";
    }
    if (lowerInput.match(/(bye|goodbye|see you|see ya|take care)/)) {
      return "Goodbye! 👋 It was great helping you today. Feel free to come back anytime you need procurement assistance. Have a wonderful day!";
    }
    if (lowerInput.match(/(who are you|what are you|about you|your name)/)) {
      return "I'm Procure AI, your intelligent procurement assistant! 🤖 I specialize in helping businesses and individuals find the best products, compare prices, and connect with reliable vendors. I can help you procure everything from office supplies to industrial equipment. What would you like to buy today?";
    }
    if (lowerInput.match(/(nice|cool|awesome|great|ok|okay)/)) {
      return "Great! I'm glad you're here. What can I help you procure today? Whether it's office supplies, equipment, or services, just let me know what you need and I'll find the best options for you! 🛍️";
    }
    return null;
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { from: "user", text: input, timestamp: new Date().toISOString() };
    setMessages((msgs) => [...msgs, userMessage]);
    setLoading(true);

    if (selectedSessionId) {
      await saveMessageToSession(selectedSessionId, userMessage);
    } else {
      const sessionId = await startNewSession();
      if (sessionId) {
        setSelectedSessionId(sessionId);
        await saveMessageToSession(sessionId, userMessage);
        const sessionsResponse = await axios.get(`http://localhost:5000/api/chat/sessions/${userId}`);
        setChatSessions(sessionsResponse.data);
      }
    }

    try {
      if (conversationState.stage === "initial") {
        const generalResponse = handleGeneralInput(input);
        if (generalResponse) {
          const botReply = { from: "bot", text: generalResponse, timestamp: new Date().toISOString() };
          setMessages((msgs) => [...msgs, botReply]);
          if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
          setLoading(false);
          setInput("");
          return;
        }

        const parsed = parseInput(input);
        if (parsed.productType) {
          const questions = await generateQuestionsForProduct(parsed.productType, parsed.quantity);
          setConversationState({
            stage: "clarifying",
            productType: parsed.productType,
            questions: questions,
            attributes: {},
            currentQuestionIndex: 0,
            quantity: parsed.quantity,
            location: parsed.location,
          });

          const firstQuestion = questions[0];
          const botReply = {
            from: "bot",
            text: `Great! I found that you need ${parsed.quantity} ${parsed.productType}${parsed.quantity > 1 ? "s" : ""}. Let me ask you a few questions to find the best options for you.\n\n${firstQuestion.question}`,
            timestamp: new Date().toISOString(),
          };
          setMessages((msgs) => [...msgs, botReply]);
          if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
        } else {
          await handleGenericProduct(input);
        }
      } else if (conversationState.stage === "clarifying") {
        const currentQuestion = conversationState.questions[conversationState.currentQuestionIndex];
        const updatedAttributes = {
          ...conversationState.attributes,
          [currentQuestion.key]: input,
        };

        const nextQuestionIndex = conversationState.currentQuestionIndex + 1;
        if (nextQuestionIndex < conversationState.questions.length) {
          setConversationState({
            ...conversationState,
            attributes: updatedAttributes,
            currentQuestionIndex: nextQuestionIndex,
          });

          const nextQuestion = conversationState.questions[nextQuestionIndex];
          const botReply = { from: "bot", text: nextQuestion.question, timestamp: new Date().toISOString() };
          setMessages((msgs) => [...msgs, botReply]);
          if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
        } else {
          setConversationState({
            ...conversationState,
            attributes: updatedAttributes,
            stage: "confirmation",
          });

          const productSummary = formatProductSummary(
            conversationState.productType,
            updatedAttributes,
            conversationState.quantity
          );
          const botReply = {
            from: "bot",
            text: `Perfect! Let me confirm your requirements:\n\n${productSummary}\n\nIs this correct? Please reply with "Yes" to confirm or "No" to make changes.`,
            timestamp: new Date().toISOString(),
          };
          setMessages((msgs) => [...msgs, botReply]);
          if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
        }
      } else if (conversationState.stage === "confirmation") {
        const userResponse = input.toLowerCase().trim();
        if (userResponse.includes("yes") || userResponse.includes("confirm") || userResponse.includes("correct")) {
          setConversationState({
            ...conversationState,
            stage: "timeline",
          });

          const botReply = {
            from: "bot",
            text: "Excellent! Now, what's your preferred delivery timeline? (e.g., within 7 days, within 2 weeks, within 1 month)",
            timestamp: new Date().toISOString(),
          };
          setMessages((msgs) => [...msgs, botReply]);
          if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
        } else if (userResponse.includes("no") || userResponse.includes("change") || userResponse.includes("modify")) {
          setConversationState({
            ...conversationState,
            stage: "clarifying",
            attributes: {},
            currentQuestionIndex: 0,
          });

          const firstQuestion = conversationState.questions[0];
          const botReply = {
            from: "bot",
            text: `No problem! Let's go through the details again.\n\n${firstQuestion.question}`,
            timestamp: new Date().toISOString(),
          };
          setMessages((msgs) => [...msgs, botReply]);
          if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
        } else {
          const botReply = {
            from: "bot",
            text: "Please reply with 'Yes' to confirm these details are correct, or 'No' if you'd like to make changes.",
            timestamp: new Date().toISOString(),
          };
          setMessages((msgs) => [...msgs, botReply]);
          if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
        }
      } else if (conversationState.stage === "timeline") {
        setConversationState({
          ...conversationState,
          timeline: input,
          stage: "procurement_value",
        });

        const daysMatch = input.match(/(\d+)\s*(days?|weeks?|months?)/i);
        let days_needed = 30;
        if (daysMatch) {
          const num = parseInt(daysMatch[1]);
          const unit = daysMatch[2].toLowerCase();
          if (unit.includes("day")) days_needed = num;
          else if (unit.includes("week")) days_needed = num * 7;
          else if (unit.includes("month")) days_needed = num * 30;
        }

        const initialRequest = {
          item: `${conversationState.productType} with specifications: ${Object.entries(conversationState.attributes)
            .map(([key, value]) => `${key}: ${value}`)
            .join(", ")}`,
          quantity: conversationState.quantity,
          location: conversationState.location,
          days_needed: days_needed,
          product_type: conversationState.productType,
          attributes: conversationState.attributes,
        };

        await makeRecommendation(initialRequest);

        const botReply = {
          from: "bot",
          text: "Great! Now let's proceed with the procurement process.\n\n💰 **Step 2: Estimate Procurement Value**\n\nWhat is your estimated budget or cost range for this procurement? Please provide:\n• Total budget amount (e.g., ₹50,000 - ₹1,00,000)\n• Or budget per unit if you prefer\n• Any budget constraints or considerations",
          timestamp: new Date().toISOString(),
        };
        setMessages((msgs) => [...msgs, botReply]);
        if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      } else if (conversationState.stage === "procurement_value") {
        setConversationState({
          ...conversationState,
          procurementValue: input,
          stage: "approach",
        });

        const botReply = {
          from: "bot",
          text: "Perfect! Budget information recorded.\n\n🎯 **Step 3: Determine Best Fit Approach**\n\nBased on your requirements, I need to understand your preferred procurement method. Please select or describe:\n\n• **Open Tendering** - Public competitive bidding\n• **Limited tendering** - Invite selected suppliers\n• **Direct procurement** - Single supplier\n• **Framework agreement** - Pre-qualified suppliers\n• **Emergency procurement** - Urgent requirements\n\nWhich approach would you prefer, or do you need guidance on which method suits your needs best?",
          timestamp: new Date().toISOString(),
        };
        setMessages((msgs) => [...msgs, botReply]);
        if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      } else if (conversationState.stage === "approach") {
        setConversationState({
          ...conversationState,
          approach: input,
          stage: "woc_criteria",
        });

        const botReply = {
          from: "bot",
          text: "Excellent choice! Procurement approach noted.\n\n📋 **Step 4: Justify Waiver of Competition (WOC)**\n\nFor your procurement approach, I need to understand the justification criteria. Please provide details about:\n\n• **Urgency** - Is this time-sensitive?\n• **Specialized requirements** - Unique specifications?\n• **Single source availability** - Only one supplier available?\n• **Compatibility** - Must match existing systems?\n• **Emergency situation** - Critical operational need?\n• **Other reasons** - Any specific justifications?\n\nPlease describe the main reasons that support your procurement approach.",
          timestamp: new Date().toISOString(),
        };
        setMessages((msgs) => [...msgs, botReply]);
        if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      } else if (conversationState.stage === "woc_criteria") {
        setConversationState({
          ...conversationState,
          wocCriteria: input,
          stage: "suppliers",
        });

        const botReply = {
          from: "bot",
          text: "Great! WOC criteria documented.\n\n🏢 **Step 5: Invite Suppliers**\n\nNow I need to identify potential suppliers for your procurement. Please provide:\n\n• **Preferred suppliers** - Any specific vendors you want to include?\n• **Supplier requirements** - Certifications, experience, location preferences?\n• **Exclusions** - Any suppliers to avoid?\n• **Number of suppliers** - How many suppliers should be invited?\n\nOr would you like me to recommend suppliers based on your requirements?",
          timestamp: new Date().toISOString(),
        };
        setMessages((msgs) => [...msgs, botReply]);
        if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      } else if (conversationState.stage === "suppliers") {
        setConversationState({
          ...conversationState,
          suppliers: input,
          stage: "woc_finalize",
        });

        const botReply = {
          from: "bot",
          text: `Perfect! Supplier information captured.\n\n✅ **Step 6: Finalise WOC Justification**\n\nLet me prepare your final Waiver of Competition justification. Please review and confirm:\n\n**Procurement Summary:**\n` +
            `📦 Product: ${conversationState.quantity} ${conversationState.productType}\n` +
            `📍 Location: ${conversationState.location}\n` +
            `⏰ Timeline: ${conversationState.timeline}\n` +
            `💰 Budget: ${conversationState.procurementValue}\n` +
            `🎯 Approach: ${conversationState.approach}\n` +
            `📋 WOC Criteria: ${conversationState.wocCriteria}\n` +
            `🏢 Suppliers: ${conversationState.suppliers}\n\n` +
            "Does this summary look correct? Type 'Yes' to finalize and get your procurement recommendations, or 'No' to make changes.",
          timestamp: new Date().toISOString(),
        };
        setMessages((msgs) => [...msgs, botReply]);
        if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      } else if (conversationState.stage === "woc_finalize") {
        const userResponse = input.toLowerCase().trim();
        if (userResponse.includes("yes") || userResponse.includes("confirm") || userResponse.includes("correct")) {
          const finalRequest = {
            item: `${conversationState.productType} with specifications: ${Object.entries(conversationState.attributes)
              .map(([key, value]) => `${key}: ${value}`)
              .join(", ")}`,
            quantity: conversationState.quantity,
            location: conversationState.location,
            days_needed: extractDaysFromTimeline(conversationState.timeline),
            product_type: conversationState.productType,
            attributes: conversationState.attributes,
            procurement_value: conversationState.procurementValue,
            approach: conversationState.approach,
            woc_criteria: conversationState.wocCriteria,
            suppliers: conversationState.suppliers,
          };

          await makeComprehensiveRecommendation(finalRequest);
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
            finalWocJustification: "",
          });
        } else if (userResponse.includes("no") || userResponse.includes("change") || userResponse.includes("modify")) {
          setConversationState({
            ...conversationState,
            stage: "timeline",
          });

          const botReply = {
            from: "bot",
            text: "No problem! Let's restart the procurement process. What's your preferred delivery timeline? (e.g., within 7 days, within 2 weeks, within 1 month)",
            timestamp: new Date().toISOString(),
          };
          setMessages((msgs) => [...msgs, botReply]);
          if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
        } else {
          const botReply = {
            from: "bot",
            text: "Please reply with 'Yes' to finalize your procurement plan, or 'No' if you'd like to make changes to any step.",
            timestamp: new Date().toISOString(),
          };
          setMessages((msgs) => [...msgs, botReply]);
          if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
        }
      }
    } catch (err) {
      console.error("Error sending message:", err);
      const errorBotReply = {
        from: "bot",
        text: "Sorry, there was an error. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, errorBotReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, errorBotReply);
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
      days_needed: 30,
    };
    await makeRecommendation(requestData);
  };

  const extractDaysFromTimeline = (timelineText) => {
    const daysMatch = timelineText.match(/(\d+)\s*(days?|weeks?|months?)/i);
    if (daysMatch) {
      const num = parseInt(daysMatch[1]);
      const unit = daysMatch[2].toLowerCase();
      if (unit.includes("day")) return num;
      else if (unit.includes("week")) return num * 7;
      else if (unit.includes("month")) return num * 30;
    }
    return 30;
  };

  const makeComprehensiveRecommendation = async (requestData) => {
    try {
      const response = await axios.post("http://localhost:5000/recommend", requestData);
      const data = response.data;
      const botReply = {
        from: "bot",
        text: `🎉 **Complete Procurement Plan Ready!**\n\n${data.recommendation}\n\n📋 **WOC Justification Summary:**\n• Approach: ${requestData.approach}\n• Criteria: ${requestData.woc_criteria}\n• Suppliers: ${requestData.suppliers}\n• Budget: ${requestData.procurement_value}\n\nYour procurement process is now ready to proceed with proper justification and supplier engagement!`,
        vendors: data.vendors,
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);

      setTimeout(() => {
        (async () => {
          const followUpMessage = {
            from: "bot",
            text: "🌟 Procurement plan completed successfully! Is there anything else you'd like to procure or any other assistance you need?",
            timestamp: new Date().toISOString(),
          };
          setMessages((msgs) => [...msgs, followUpMessage]);
          if (selectedSessionId) await saveMessageToSession(selectedSessionId, followUpMessage);
        })();
      }, 1000);
    } catch (error) {
      console.error("Error making comprehensive recommendation:", error);
      const errorReply = {
        from: "bot",
        text: "I apologize, but there was an error generating your procurement plan. However, I have all your requirements documented. Please try again or contact support if the issue persists.",
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, errorReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, errorReply);
    }
  };

  const makeRecommendation = async (requestData) => {
    try {
      const response = await axios.post("http://localhost:5000/recommend", requestData);
      const data = response.data;
      const botReply = {
        from: "bot",
        text: data.recommendation,
        vendors: data.vendors,
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);

      setTimeout(() => {
        (async () => {
          const followUpMessage = {
            from: "bot",
            text: "Is there anything else you'd like to procure today? Just let me know what you need!",
            timestamp: new Date().toISOString(),
          };
          setMessages((msgs) => [...msgs, followUpMessage]);
          if (selectedSessionId) await saveMessageToSession(selectedSessionId, followUpMessage);
        })();
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
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-800 font-sans">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-80 p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-2xl transition-transform duration-300 ease-in-out transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:static md:min-h-screen border-r border-gray-200 dark:border-gray-700`}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Procure AI</h2>
          <button
            className="md:hidden text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white transition-colors"
            onClick={() => setIsSidebarOpen(false)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <button
          className="w-full flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
          onClick={startNewChat}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
        <div className="mt-6 space-y-3 overflow-y-auto max-h-[calc(100vh-200px)]">
          {chatSessions.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm italic">No chat sessions yet</p>
          ) : (
            chatSessions.map((session) => (
              <div
                key={session.sessionId}
                className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                  selectedSessionId === session.sessionId
                    ? "bg-indigo-100 dark:bg-indigo-900/50"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <div
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                  onClick={() => loadChat(session.sessionId)}
                >
                  <svg
                    className="w-5 h-5 text-gray-400 dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5v-4a2 2 0 012-2h10a2 2 0 012 2v4h-4M9 16l3 3m0 0l3-3m-3 3V7"
                    />
                  </svg>
                  <div className="flex-1">
                    {editingSessionId === session.sessionId ? (
                      <input
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        onBlur={() => handleRenameSession(session.sessionId, editedTitle)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleRenameSession(session.sessionId, editedTitle);
                          }
                        }}
                        className="text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {session.title}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(session.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-yellow-500 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSessionId(session.sessionId);
                      setEditedTitle(session.title);
                    }}
                    title="Rename chat"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSession(session.sessionId);
                    }}
                    title="Delete chat"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 relative">
        <div className="flex items-center justify-between p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {conversationState.productType || "Procure AI Chatbot"}
              </h1>
              {conversationState.stage !== "initial" && (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                  {conversationState.stage === "clarifying" &&
                    `Clarifying ${conversationState.productType} details (${
                      conversationState.currentQuestionIndex + 1
                    }/${conversationState.questions.length})`}
                  {conversationState.stage === "confirmation" && "Confirming product details"}
                  {conversationState.stage === "timeline" && "Setting delivery timeline"}
                  {conversationState.stage === "procurement_value" && "Defining budget requirements"}
                  {conversationState.stage === "approach" && "Choosing procurement approach"}
                  {conversationState.stage === "woc_criteria" && "Specifying WOC criteria"}
                  {conversationState.stage === "suppliers" && "Selecting suppliers"}
                  {conversationState.stage === "woc_finalize" && "Finalizing procurement plan"}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto bg-gradient-to-b from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-800">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`max-w-[80%] p-4 mb-4 rounded-2xl shadow-lg animate-message ${
                msg.from === "user"
                  ? "ml-auto bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-none"
                  : "mr-auto bg-white/80 dark:bg-gray-800/80 text-gray-800 dark:text-gray-200 rounded-bl-none border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-lg"
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              {msg.vendors && (
                <div className="mt-3 p-4 bg-gray-100/80 dark:bg-gray-700/80 rounded-lg border border-gray-200/50 dark:border-gray-600/50 backdrop-blur-sm">
                  <strong className="block mb-2 font-semibold text-gray-700 dark:text-gray-200">
                    Recommended Vendors:
                  </strong>
                  <ul className="list-disc pl-5 text-sm">
                    {msg.vendors.map((v, i) => (
                      <li key={i} className="mb-2">
                        <strong>{v.name}</strong> — ₹{v.price}/unit, delivery in {v.delivery_days} days, rating {v.rating}⭐
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <textarea
              className="flex-1 p-3 rounded-lg border border-gray-300/50 dark:border-gray-600/50 bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm shadow-sm resize-none transition-all duration-200"
              rows={2}
              placeholder={getPlaceholderText()}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              className={`p-3 rounded-lg text-white transition-all duration-200 shadow-md hover:shadow-lg ${
                loading ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
              }`}
              onClick={sendMessage}
              disabled={loading}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

Chatbot.propTypes = {
  userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default Chatbot;