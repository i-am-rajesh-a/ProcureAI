import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import 'animate.css';

const isValidMongoObjectId = (id) => typeof id === "string" && /^[a-f\d]{24}$/i.test(id);

const Chatbot = ({ userId }) => {
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hello! 👋 I'm your Procurement AI assistant. Please describe what you need to purchase (e.g., 'office furniture', '50 laptops', 'cleaning services').",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationState, setConversationState] = useState({
    stage: "initial",
    procurementDetails: {
      requirements: {},
      quantity: null,
      budget: null,
      timeline: null,
    },
    currentQuestion: null,
    confirmedProduct: null,
    confirmedSeller: null, // New field to store seller information
    products: [],
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
      const response = await axios.post(
        "http://localhost:5000/api/chat/save",
        {
          sessionId,
          userId,
          from: message.from,
          text: message.text,
          url: message.url || null,
          timestamp: message.timestamp,
          state: conversationState
        },
        {
          headers: {
            "X-User-Id": userId,
            "Content-Type": "application/json"
          }
        }
      );
      if (!response.data.success) {
        throw new Error(response.data.error || "Failed to save message");
      }
    } catch (error) {
      console.error("Error saving message:", error.response?.data || error.message);
    }
  };

  const startNewSession = async (productType = "General Chat") => {
    try {
      const { data: { sessionId } } = await axios.post(
        "http://localhost:5000/api/chat/start",
        { userId, productType },
        { headers: { "X-User-Id": userId } }
      );
      return sessionId;
    } catch (error) {
      console.error("Error creating new session:", error);
      return null;
    }
  };

  const loadSession = async (sessionId) => {
    try {
      const { data } = await axios.get(
        `http://localhost:5000/api/chat/session/${sessionId}?userId=${userId}`,
        { headers: { "X-User-Id": userId } }
      );
      return data;
    } catch (error) {
      console.error("Error retrieving session:", error);
      return null;
    }
  };

  const deleteSession = async (sessionId) => {
    try {
      const response = await axios.delete(
        `http://localhost:5000/api/chat/delete/${sessionId}?userId=${userId}`,
        { headers: { "X-User-Id": userId } }
      );
      return response.status === 200;
    } catch (error) {
      console.error("Error deleting:", error);
      return false;
    }
  };

  const renameSession = async (sessionId, newTitle) => {
    try {
      const response = await axios.put(
        "http://localhost:5000/api/chat/rename",
        { sessionId, userId, newTitle },
        { headers: { "X-User-Id": userId } }
      );
      return response.status === 200;
    } catch (error) {
      console.error("Error renaming session:", error);
      return false;
    }
  };

  const startNewChat = async () => {
    const initialBotMessage = {
      from: "bot",
      text: "Hello! 👋 I'm your Procurement AI assistant. Please describe what you need to purchase (e.g., 'office furniture', '50 laptops', 'cleaning services').",
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
        procurementDetails: {
          requirements: {
            productType: "",
          },
          quantity: null,
          budget: null,
          timeline: null,
        },
        currentQuestion: null,
        confirmedProduct: null,
        confirmedSeller: null,
        products: [],
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
    setIsSidebarOpen(false);
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
                text: "Hello! 👋 I'm your Procurement AI assistant. Please describe what you need to purchase (e.g., 'office furniture', '50 laptops', 'cleaning services').",
                timestamp: new Date().toISOString(),
              },
            ]
      );
      setSelectedSessionId(sessionId);
      setConversationState(
        session.state || {
          stage: "initial",
          procurementDetails: {
            requirements: {
              productType: session.productType || "",
            },
            quantity: null,
            budget: null,
            timeline: null,
          },
          currentQuestion: null,
          confirmedProduct: null,
          confirmedSeller: null,
          products: [],
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

  const analyzeProcurementType = (description) => {
    const productMatch = description.match(/(\d+\s*)?([a-zA-Z\s-]+)$/);
    const productType = productMatch ? productMatch[2].trim() : description;
    return { productType };
  };

  const sanitizeKeyword = (keyword) => {
    return keyword.trim().replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 50);
  };

  const handleInitialState = async (userInput) => {
    const procurementType = analyzeProcurementType(userInput);
    if (!procurementType.productType || procurementType.productType.length < 3) {
      const botReply = {
        from: "bot",
        text: "Please provide more details about what you'd like to procure. For example: 'office chairs', '50 laptops', or 'cleaning services'.",
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      return;
    }

    const sanitizedKeyword = sanitizeKeyword(procurementType.productType);
    try {
      const response = await axios.get("http://localhost:5000/api/amazon/search", {
        params: {
          query: sanitizedKeyword, // Changed from keyword to query
          country: "us",
          page: 1
        },
        headers: { "X-User-Id": userId }
      });

      if (response.data.success && (!response.data.data?.products || response.data.data.products.length === 0)) {
        const botReply = {
          from: "bot",
          text: `I couldn't find any products matching "${sanitizedKeyword}" on Amazon. Please try another product description.`,
          timestamp: new Date().toISOString(),
        };
        setMessages((msgs) => [...msgs, botReply]);
        if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
        return;
      }

      if (response.data.error) {
        const errorMessage = response.data.details?.message || response.data.error;
        throw new Error(errorMessage);
      }

      const products = response.data.data?.products || [];
      if (products.length > 0) {
        const productList = products.slice(0, 3).map((p, idx) =>
          `${idx + 1}. ${p.ProductTitle || p.title}\nPrice: ${p.price || 'N/A'}`
        ).join('\n\n');

        const botReply = {
          from: "bot",
          text: `I found these options:\n\n${productList}\n\nWhich option interests you? (Enter 1-3)`,
          timestamp: new Date().toISOString(),
        };
        setMessages((msgs) => [...msgs, botReply]);
        if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);

        setConversationState({
          stage: "selecting_product",
          procurementDetails: {
            requirements: { productType: procurementType.productType }
          },
          products: products.slice(0, 3),
          currentQuestion: {
            question: "Please select a product (1-3):",
            key: "product_selection",
            validation: (answer) => !isNaN(parseInt(answer)) && parseInt(answer) >= 1 && parseInt(answer) <= 3
          },
          confirmedSeller: null,
        });
      }
    } catch (error) {
      console.error("Error searching Amazon products:", error);
      const botReply = {
        from: "bot",
        text: `Sorry, I couldn't search for "${sanitizedKeyword}" due to an issue: ${error.message}. Please try a different product or check later.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
    }
  };

  const handleSelectingProduct = async (userInput) => {
    const selection = parseInt(userInput);
    if (isNaN(selection) || selection < 1 || selection > conversationState.products.length) {
      const botReply = {
        from: "bot",
        text: `Please enter a number between 1 and ${conversationState.products.length}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      return;
    }

    const selectedProduct = conversationState.products[selection - 1];
    const confirmedProduct = {
      productType: conversationState.procurementDetails.requirements.productType,
      asin: selectedProduct.asin,
      title: selectedProduct.ProductTitle, // Updated to ProductTitle
      unitPrice: selectedProduct.price || "N/A",
      url: selectedProduct.productUrl, // Updated to productUrl
    };

    // Fetch product details to get seller information
    let confirmedSeller = null;
    let isAmazonFulfilled = false;
    try {
      const productResponse = await axios.get("http://localhost:5000/api/amazon/product-details", {
        params: {
          asin: selectedProduct.asin,
          country: "us"
        },
        headers: { "X-User-Id": userId }
      });

      if (productResponse.data.success) {
      isAmazonFulfilled = productResponse.data.data?.amazonFulfilled || false;
      const sellerId = productResponse.data.data?.sellerId;
      if (sellerId && sellerId !== "NA") {
        const sellerResponse = await axios.get("http://localhost:5000/api/amazon/seller-details", {
          params: {
            seller_id: sellerId,
            country: "us"
          },
          headers: { "X-User-Id": userId }
        });
        if (sellerResponse.data.success) {
          confirmedSeller = sellerResponse.data.data;
        }
      }
    }
  } catch (error) {
    console.error("Error fetching product or seller details:", error);
  }

  // If no seller but Amazon-fulfilled, set default Amazon vendor info
  if (!confirmedSeller && isAmazonFulfilled) {
    confirmedSeller = {
      sellerName: "Amazon",
      rating: "N/A",
      ratingNum: { lifeTime: "N/A" },
      storeLink: confirmedProduct.url || "https://www.amazon.com",
    };
  }

    const botReply = {
    from: "bot",
    text: `Great! You selected: ${selectedProduct.ProductTitle}. How many do you need?`,
    timestamp: new Date().toISOString(),
  };
  setMessages((msgs) => [...msgs, botReply]);
  if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);

  setConversationState({
    stage: "asking_quantity",
    procurementDetails: conversationState.procurementDetails,
    currentQuestion: {
      question: `How many ${conversationState.procurementDetails.requirements.productType} do you need?`,
      key: "quantity",
      field: "quantity",
      validation: (answer) => !isNaN(parseInt(answer)) && parseInt(answer) > 0,
    },
    confirmedProduct,
    confirmedSeller,
    products: conversationState.products,
  });
};

  const handleAskingQuantity = async (userInput) => {
    const validation = conversationState.currentQuestion.validation(userInput);
    if (!validation) {
      const botReply = {
        from: "bot",
        text: "Please provide a valid quantity (e.g., '10' or '50').",
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      return;
    }
    const updatedDetails = {
      ...conversationState.procurementDetails,
      quantity: parseInt(userInput),
    };
    setConversationState({
      stage: "asking_budget",
      procurementDetails: updatedDetails,
      currentQuestion: {
        question: `What is your total budget for procuring ${updatedDetails.requirements.productType} (in ₹)?`,
        key: "budget",
        field: "budget",
        validation: (answer) => !isNaN(parseFloat(answer)) && parseFloat(answer) > 0,
      },
      confirmedProduct: conversationState.confirmedProduct,
      confirmedSeller: conversationState.confirmedSeller,
      products: conversationState.products,
    });
    const botReply = {
      from: "bot",
      text: `Got it! You need ${userInput} ${updatedDetails.requirements.productType}. What is your total budget for this procurement (in ₹)?`,
      timestamp: new Date().toISOString(),
    };
    setMessages((msgs) => [...msgs, botReply]);
    if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
  };

  const handleAskingBudget = async (userInput) => {
    const validation = conversationState.currentQuestion.validation(userInput);
    if (!validation) {
      const botReply = {
        from: "bot",
        text: "Please provide a valid budget amount in ₹ (e.g., '50000' or '1000000').",
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      return;
    }
    const updatedDetails = {
      ...conversationState.procurementDetails,
      budget: parseFloat(userInput),
    };
    setConversationState({
      stage: "asking_timeline",
      procurementDetails: updatedDetails,
      currentQuestion: {
        question: `What is your desired timeline for procuring ${updatedDetails.requirements.productType}? (e.g., 'ASAP', 'within 2 weeks')`,
        key: "timeline",
        field: "timeline",
        validation: (answer) => answer.trim().length > 3,
      },
      confirmedProduct: conversationState.confirmedProduct,
      confirmedSeller: conversationState.confirmedSeller,
      products: conversationState.products,
    });
    const botReply = {
      from: "bot",
      text: `Thank you for providing the budget of ₹${parseFloat(userInput).toLocaleString()}. What is your desired timeline for procuring ${updatedDetails.requirements.productType}? (e.g., 'ASAP', 'within 2 weeks')`,
      timestamp: new Date().toISOString(),
    };
    setMessages((msgs) => [...msgs, botReply]);
    if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
  };

  const handleAskingTimeline = async (userInput) => {
  const timeline = userInput.trim();
  if (timeline.length < 3) {
    const botReply = {
      from: "bot",
      text: "Please provide a valid timeline (e.g., 'ASAP', 'within 2 weeks', 'by June 30th').",
      timestamp: new Date().toISOString(),
    };
    setMessages((msgs) => [...msgs, botReply]);
    if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
    return;
  }
  const updatedDetails = {
    ...conversationState.procurementDetails,
    timeline,
  };
  const confirmed = conversationState.confirmedProduct;
  const seller = conversationState.confirmedSeller;
  const vendorDetails = seller
    ? `Vendor: ${seller.sellerName || 'N/A'}\nRating: ${seller.rating || 'N/A'}\nTotal Reviews: ${seller.ratingNum?.lifeTime || 'N/A'}\nStore: ${seller.storeLink || 'N/A'}`
    : "This product is likely sold directly by Amazon or no vendor information is available.";
  const botReply = {
    from: "bot",
    text: `Procurement details confirmed:\nProduct: ${confirmed.title}\nQuantity: ${updatedDetails.quantity}\nBudget: ₹${updatedDetails.budget.toLocaleString()}\nTimeline: ${timeline}\n\n${vendorDetails}\n\nYou can proceed with the purchase using the provided store link.`,
    timestamp: new Date().toISOString(),
    url: seller?.storeLink || confirmed.url,
  };
    setMessages((msgs) => [...msgs, botReply]);
  if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
  setConversationState({
    stage: "initial",
    procurementDetails: {
      requirements: {},
      quantity: null,
      budget: null,
      timeline: null,
    },
    currentQuestion: null,
    confirmedProduct: null,
    confirmedSeller: null,
    products: [],
  });
};

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = { from: "user", text: input, timestamp: new Date().toISOString() };
    setMessages((msgs) => [...msgs, userMessage]);
    setLoading(true);

    if (selectedSessionId) {
      await saveMessageToSession(selectedSessionId, userMessage);
    } else {
      const sessionId = await startNewSession(conversationState.procurementDetails.requirements.productType || "General Chat");
      if (sessionId) {
        setSelectedSessionId(sessionId);
        await saveMessageToSession(sessionId, userMessage);
        const sessionsResponse = await axios.get(
          `http://localhost:5000/api/chat/sessions/${userId}`,
          { headers: { "X-User-Id": userId } }
        );
        setChatSessions(sessionsResponse.data);
      }
    }

    try {
      switch (conversationState.stage) {
        case "initial":
          await handleInitialState(input);
          break;
        case "selecting_product":
          await handleSelectingProduct(input);
          break;
        case "asking_quantity":
          await handleAskingQuantity(input);
          break;
        case "asking_budget":
          await handleAskingBudget(input);
          break;
        case "asking_timeline":
          await handleAskingTimeline(input);
          break;
        default:
          await handleInitialState(input);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      const errorReply = {
        from: "bot",
        text: "I encountered a technical issue. Please try another product description.",
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, errorReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, errorReply);
      setConversationState({
        stage: "initial",
        procurementDetails: {
          requirements: {},
          quantity: null,
          budget: null,
          timeline: null,
        },
        currentQuestion: null,
        confirmedProduct: null,
        confirmedSeller: null,
        products: [],
      });
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

  const getPlaceholderText = () => {
    if (conversationState.currentQuestion) {
      return conversationState.currentQuestion.question;
    }
    switch (conversationState.stage) {
      case "selecting_product":
        return "Enter product number (1-3)...";
      case "asking_quantity":
        return "Enter the quantity needed...";
      case "asking_budget":
        return "Enter your total budget in ₹...";
      case "asking_timeline":
        return "Enter your desired timeline (e.g., 'ASAP', 'within 2 weeks')";
      default:
        return "Describe what you need to procure...";
    }
  };

  const getStageDescription = () => {
    if (conversationState.currentQuestion) {
      return "Confirming product details";
    }
    switch (conversationState.stage) {
      case "initial":
        return "Ready to help with your procurement needs";
      case "selecting_product":
        return "Selecting product from Amazon";
      case "asking_quantity":
        return "Gathering quantity details";
      case "asking_budget":
        return "Gathering budget details";
      case "asking_timeline":
        return "Gathering timeline details";
      default:
        return "Procurement assistant";
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-800 font-sans">
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
                {conversationState.procurementDetails.requirements.productType || "Procure AI Chatbot"}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                {getStageDescription()}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto bg-gradient-to-b from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-800">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`max-w-[80%] p-4 mb-4 rounded-2xl shadow-lg animate__animated animate__fadeInUp ${
                msg.from === "user"
                  ? "ml-auto bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-none"
                  : "mr-auto bg-white/80 dark:bg-gray-800/80 text-gray-800 dark:text-gray-200 rounded-bl-none border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-lg"
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              {msg.url && (
                <div className="mt-3">
                  <a
                    href={msg.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline font-medium"
                  >
                    {conversationState.confirmedSeller
                      ? `View ${conversationState.confirmedSeller.seller_name || "Vendor"} Profile on Amazon`
                      : "View Vendor Profile on Amazon"}
                  </a>
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
              name="chat-input"
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