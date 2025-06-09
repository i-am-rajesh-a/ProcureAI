import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import 'animate.css';

const isValidMongoObjectId = (id) => typeof id === "string" && /^[a-f\d]{24}$/i.test(id);

const Chatbot = ({ userId }) => {
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hello! 👋 I'm your Procurement AI assistant. Let's start by identifying your procurement requirements. Please describe what you need to purchase (e.g., 'office furniture', '50 laptops', 'cleaning services').",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationState, setConversationState] = useState({
    stage: "initial",
    procurementDetails: {
      requirements: {},
      estimatedValue: null,
      procurementMethod: null,
      wocJustification: null,
      suppliers: [],
      quantity: null,
      budget: null,
      timeline: null,
    },
    currentQuestion: null,
    questionsQueue: [],
    confirmedProduct: null,
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
        // Don't throw the error - allow the chat to continue even if saving fails
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
      text: "Hello! 👋 I'm your Procurement AI assistant. Let's start by identifying your procurement requirements. Please describe what you need to purchase (e.g., 'office furniture', '50 laptops', 'cleaning services').",
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
          requirements: {},
          estimatedValue: null,
          procurementMethod: null,
          wocJustification: null,
          suppliers: [],
          quantity: null,
          budget: null,
          timeline: null,
        },
        currentQuestion: null,
        questionsQueue: [],
        confirmedProduct: null,
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
                text: "Hello! 👋 I'm your Procurement AI assistant. Let's start by identifying your procurement requirements. Please describe what you need to purchase (e.g., 'office furniture', '50 laptops', 'cleaning services').",
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
            estimatedValue: null,
            procurementMethod: null,
            wocJustification: null,
            suppliers: [],
            quantity: null,
            budget: null,
            timeline: null,
          },
          currentQuestion: null,
          questionsQueue: [],
          confirmedProduct: null,
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

  const handleGeneralInput = async (userInput) => {
    const lowerInput = userInput.toLowerCase().trim();
    if (lowerInput.match(/(bye|goodbye|see you|see ya|take care)/)) {
      const botReply = {
        from: "bot",
        text: "Goodbye! 👋 Feel free to come back anytime you need procurement assistance. Have a wonderful day!",
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      return { shouldEnd: true };
    }
    if (lowerInput.match(/^(hi|hello|hey|hii|helo|good morning|good afternoon|good evening)$/)) {
      const botReply = {
        from: "bot",
        text: "Hello there! 👋 Welcome to Procure AI! I'm here to help with your procurement needs. Please describe what you'd like to purchase.",
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      return { shouldEnd: false };
    }
    if (lowerInput.match(/(how are you|how're you|what's up|whats up|how do you do)/)) {
      const botReply = {
        from: "bot",
        text: "I'm doing great, thank you! 😊 I'm ready to help with your procurement needs. What would you like to purchase today?",
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      return { shouldEnd: false };
    }
    if (lowerInput.match(/(help|what can you do|what do you do|capabilities)/)) {
      const botReply = {
        from: "bot",
        text: "I'm your AI procurement assistant! Here's the procurement workflow I follow:\n\n1️⃣ Identify Requirements\n2️⃣ Estimate Value\n3️⃣ Determine Approach\n4️⃣ Justify WOC (if needed)\n5️⃣ Invite Suppliers\n6️⃣ Finalize WOC\n\nWhat would you like to purchase today?",
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      return { shouldEnd: false };
    }
    if (lowerInput.match(/(thank you|thanks|thank u|thx)/)) {
      const botReply = {
        from: "bot",
        text: "You're very welcome! 😊 What else would you like to procure or if you need any other procurement assistance?",
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      return { shouldEnd: false };
    }
    if (lowerInput.match(/(who are you|what are you|about you|your name)/)) {
      const botReply = {
        from: "bot",
text: "I'm Procure AI, your intelligent procurement assistant! 🤖 I follow government procurement processes to help you acquire goods and services efficiently. What would you like to purchase today?",
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      return { shouldEnd: false };
    }
    return null;
  };

  const analyzeProcurementType = (description) => {
    const lowerDesc = description.toLowerCase().trim();
    let category = 'goods';
    if (/service|maintenance|consulting|support|cleaning/.test(lowerDesc)) {
      category = 'services';
    } else if (/software|saas|license|subscription/.test(lowerDesc)) {
      category = 'software';
    } else if (/construction|renovation|building/.test(lowerDesc)) {
      category = 'construction';
    }
    const productMatch = description.match(/(\d+\s*)?([a-zA-Z\s-]+)$/);
    const productType = productMatch ? productMatch[2].trim() : description;
    const quantity = productMatch && productMatch[1] ? parseInt(productMatch[1].trim()) : null;
    const keywords = lowerDesc.split(' ').filter(word => word.length > 2);
    const specificAttributes = {
      isHighEnd: /high-end|premium|enterprise|professional/.test(lowerDesc),
      isUrgent: /urgent|asap|immediately/.test(lowerDesc),
      hasBrand: /dell|hp|apple|microsoft|ibm/.test(lowerDesc) ? lowerDesc.match(/dell|hp|apple|microsoft|ibm/i)?.[0] : null,
      isPortable: /portable|lightweight|mobile/.test(lowerDesc),
      isEcoFriendly: /eco-friendly|sustainable|green/.test(lowerDesc),
      isLargeScale: /large-scale|enterprise|corporate/.test(lowerDesc),
      isSpecialized: /specialized|custom|tailored/.test(lowerDesc),
      hasColor: /black|white|red|blue|green|silver/.test(lowerDesc),
      hasEnvironment: /office|home|outdoor|industrial/.test(lowerDesc),
    };
    return {
      category,
      productType,
      quantity,
      isComplex: category === 'construction' || category === 'software',
      requiresWOC: false,
      keywords,
      specificAttributes,
    };
  };

  const estimateProcurementValue = (requirements, quantity, budget) => {
    const unitPrice = requirements.unitPrice || 1000;
    const qty = quantity ? parseInt(quantity) : 1;
    const estimatedValue = unitPrice * qty;
    return Math.min(estimatedValue, budget || estimatedValue);
  };

  const determineProcurementMethod = (estimatedValue) => {
    if (estimatedValue < 50000) {
      return {
        method: "Direct Purchase",
        requiresWOC: false,
        description: "Low-value procurement that can be purchased directly from a vendor."
      };
    } else if (estimatedValue < 500000) {
      return {
        method: "Limited Tender",
        requiresWOC: false,
        description: "Medium-value procurement requiring quotes from at least 3 vendors."
      };
    } else {
      return {
        method: "Open Tender",
        requiresWOC: true,
        description: "High-value procurement requiring a public tender process."
      };
    }
  };

  const generateWOCQuestions = () => {
    const questions = [];
    questions.push({
      question: "What is the justification for waiving competition? (e.g., single source, urgency, proprietary)",
      key: "justificationReason",
      field: "wocJustification.reason",
      validation: (answer) => answer.length > 2
    });
    questions.push({
      question: "Are there any special circumstances requiring this approach?",
      key: "specialCircumstances",
      field: "wocJustification.specialCircumstances",
      validation: (answer) => answer.length > 3
    });
    questions.push({
      question: "How will you ensure value for money without competition?",
      key: "valueForMoney",
      field: "wocJustification.valueForMoney",
      validation: (answer) => answer.length > 3
    });
    return questions;
  };

  const sanitizeKeyword = (keyword) => {
    return keyword.trim().replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 50);
  };

  const handleInitialState = async (userInput) => {
    const generalResponse = await handleGeneralInput(userInput);
    if (generalResponse) {
        if (generalResponse.shouldEnd) {
            setConversationState(prev => ({ ...prev, stage: "initial" }));
        }
        return;
    }

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
                keyword: sanitizedKeyword,
                country: "us",
                page: 1
            },
            headers: { "X-User-Id": userId }
        });

        // Check for successful response but empty products
        if (response.data.success && (!response.data.data?.products || response.data.data.products.length === 0)) {
            const botReply = {
                from: "bot",
                text: `I couldn't find any products matching "${sanitizedKeyword}" on Amazon. Let's proceed with your requirements. How many ${sanitizedKeyword} do you need?`,
                timestamp: new Date().toISOString(),
            };
            setMessages((msgs) => [...msgs, botReply]);
            if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
            
            setConversationState({
                stage: "asking_quantity",
                procurementDetails: {
                    requirements: {
                        productType: procurementType.productType,
                        category: procurementType.category,
                        keywords: procurementType.keywords,
                        specificAttributes: procurementType.specificAttributes,
                        unitPrice: 1000 // Default price when no products found
                    }
                },
                currentQuestion: {
                    question: `How many ${procurementType.productType} do you need?`,
                    key: "quantity",
                    field: "quantity",
                    validation: (answer) => !isNaN(parseInt(answer)) && parseInt(answer) > 0,
                },
                confirmedProduct: null,
                products: []
            });
            return;
        }

        // Check for API errors
        if (response.data.error) {
            throw new Error(response.data.details || response.data.error);
        }

        const products = response.data.data?.products || [];
        
        // Proceed with showing product options if available
        if (products.length > 0) {
            const productList = products.slice(0, 3).map((p, idx) => 
                `${idx + 1}. ${p.title}\nPrice: $${p.price || 'N/A'}`
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
                    requirements: {
                        productType: procurementType.productType,
                        category: procurementType.category,
                        keywords: procurementType.keywords,
                        specificAttributes: procurementType.specificAttributes
                    }
                },
                products: products.slice(0, 3),
                currentQuestion: {
                    question: "Please select a product (1-3):",
                    key: "product_selection",
                    validation: (answer) => !isNaN(parseInt(answer)) && parseInt(answer) >= 1 && parseInt(answer) <= 3
                }
            });
        }

    } catch (error) {
        console.error("Error searching Amazon products:", error);
        const botReply = {
            from: "bot",
            text: `I encountered an error while searching. How many ${procurementType.productType} do you need?`,
            timestamp: new Date().toISOString(),
        };
        setMessages((msgs) => [...msgs, botReply]);
        if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
        
        setConversationState({
            stage: "asking_quantity",
            procurementDetails: {
                requirements: {
                    productType: procurementType.productType,
                    category: procurementType.category,
                    keywords: procurementType.keywords,
                    specificAttributes: procurementType.specificAttributes,
                    unitPrice: 1000
                }
            },
            currentQuestion: {
                question: `How many ${procurementType.productType} do you need?`,
                key: "quantity",
                validation: (answer) => !isNaN(parseInt(answer)) && parseInt(answer) > 0
            },
            confirmedProduct: null,
            products: []
        });
    }
  };

  const handleSelectingProduct = async (userInput) => {
    const selection = parseInt(userInput);
    if (isNaN(selection)) {
      const botReply = {
        from: "bot",
        text: "Please enter a number between 1 and 3 to select a product",
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      return;
    }
    
    const products = conversationState.products;
    if (selection < 1 || selection > products.length) {
      const botReply = {
        from: "bot",
        text: `Please enter a number between 1 and ${products.length}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      return;
    }
    
    const selectedProduct = products[selection - 1];
    const confirmedProduct = {
      productType: conversationState.procurementDetails.requirements.productType,
      asin: selectedProduct.asin,
      title: selectedProduct.title,
      unitPrice: selectedProduct.price || 1000,
    };
    
    const botReply = {
      from: "bot",
      text: `Great! You selected: ${selectedProduct.title}. How many do you need?`,
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
    const estimatedValue = estimateProcurementValue(updatedDetails.requirements, updatedDetails.quantity, updatedDetails.budget);
    updatedDetails.estimatedValue = estimatedValue;
    const procurementMethod = determineProcurementMethod(estimatedValue);
    updatedDetails.procurementMethod = procurementMethod.method;
    updatedDetails.procurementMethodDescription = procurementMethod.description;

    if (procurementMethod.requiresWOC) {
      const wocQuestions = generateWOCQuestions();
      setConversationState({
        stage: "gathering_woc",
        procurementDetails: updatedDetails,
        currentQuestion: wocQuestions[0],
        questionsQueue: wocQuestions.slice(
1),
        confirmedProduct: conversationState.confirmedProduct,
        products: conversationState.products,
      });
      const botReply = {
        from: "bot",
        text: `I've estimated the procurement value at ₹${estimatedValue.toLocaleString()} using your inputs. Since this is a high-value procurement requiring Open Tender, we need to document the Waiver of Competition justification.\n\n${wocQuestions[0].question}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
    } else {
      const confirmed = conversationState.confirmedProduct;
      
      const botReply = {
        from: "bot",
        text: `I've estimated the procurement value at ₹${estimatedValue.toLocaleString()}. Since this is a ${procurementMethod.method}, we can proceed directly.`,
        timestamp: new Date().toISOString(),
      };
      
      if (confirmed?.asin) {
        botReply.text += `\n\nYou can purchase ${confirmed.title} on Amazon: https://www.amazon.com/dp/${confirmed.asin}`;
      }
      
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      
      setConversationState(prev => ({
        ...prev,
        stage: "initial",
        procurementDetails: updatedDetails,
        confirmedProduct: conversationState.confirmedProduct,
        products: [],
      }));
    }
  };

  const handleGatheringWOC = async (userInput) => {
    const { currentQuestion, questionsQueue, procurementDetails } = conversationState;
    const validation = currentQuestion.validation
      ? currentQuestion.validation(userInput)
      : userInput.trim().length > 2;
    if (!validation) {
      const botReply = {
        from: "bot",
        text: currentQuestion.validation ? "Please provide a valid answer (e.g., a detailed justification)." : "Please provide a more detailed answer to strengthen the WOC justification.",
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      return;
    }
    
    const updatedWOC = {
      ...procurementDetails.wocJustification,
      [currentQuestion.key]: userInput,
    };
    
    const updatedDetails = {
      ...procurementDetails,
      wocJustification: updatedWOC,
    };
    
    if (questionsQueue.length > 0) {
      setConversationState({
        stage: "gathering_woc",
        procurementDetails: updatedDetails,
        currentQuestion: questionsQueue[0],
        questionsQueue: questionsQueue.slice(1),
        confirmedProduct: conversationState.confirmedProduct,
        products: conversationState.products,
      });
      const botReply = {
        from: "bot",
        text: questionsQueue[0].question,
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
    } else {
      const confirmed = conversationState.confirmedProduct;
      
      const botReply = {
        from: "bot",
        text: `Thank you for providing the justification. I've documented it for compliance.`,
        timestamp: new Date().toISOString(),
      };
      
      if (confirmed?.asin) {
        botReply.text += `\n\nYou can purchase ${confirmed.title} on Amazon: https://www.amazon.com/dp/${confirmed.asin}`;
      }
      
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      
      setConversationState(prev => ({
        ...prev,
        stage: "initial",
        procurementDetails: updatedDetails,
        confirmedProduct: conversationState.confirmedProduct,
        products: [],
      }));
    }
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
      const generalResponse = await handleGeneralInput(input);
      if (generalResponse) {
        if (generalResponse.shouldEnd) {
          setConversationState(prev => ({
            ...prev,
            stage: "initial"
          }));
        }
      } else {
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
          case "gathering_woc":
            await handleGatheringWOC(input);
            break;
          default:
            await handleInitialState(input);
        }
      }
    } catch (err) {
      console.error("Error sending message:", err);
      const errorReply = {
        from: "bot",
        text: "I encountered a technical issue. Let me help you restart - what would you like to procure?",
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, errorReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, errorReply);
      setConversationState({
        stage: "initial",
        procurementDetails: {
          requirements: {},
          estimatedValue: null,
          procurementMethod: null,
          wocJustification: null,
          suppliers: [],
          quantity: null,
          budget: null,
          timeline: null,
        },
        currentQuestion: null,
        questionsQueue: [],
        confirmedProduct: null,
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
      case "gathering_woc":
        return "Justifying Waiver of Competition";
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
              {msg.suppliers && msg.suppliers.length > 0 && (
                <div className="mt-3 p-4 bg-gray-100/80 dark:bg-gray-700/80 rounded-lg border border-gray-200/50 dark:border-gray-600/50 backdrop-blur-sm">
                  <strong className="block mb-2 font-semibold text-gray-700 dark:text-gray-200">
                    Recommended Supplier:
                  </strong>
                  <ul className="list-disc pl-5 text-sm">
                    {msg.suppliers.map((vendor, index) => (
                      <li key={index} className="mb-2">
                        <strong>Supplier:</strong> {vendor.name}<br />
                        <strong>Product:</strong> {vendor.product_title}<br />
                        <strong>Price:</strong> ₹{vendor.price.toLocaleString()}/unit<br />
                        <strong>Delivery:</strong> {vendor.delivery_days} days<br />
                        <strong>Rating:</strong> {vendor.rating}⭐<br />
                        <strong>Purchase Link:</strong> <a href={vendor.product_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Buy Now</a>
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