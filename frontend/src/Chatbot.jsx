
import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import { Link } from "react-router-dom";
import 'animate.css';

const isValidMongoObjectId = (id) => typeof id === "string" && /^[a-f\d]{24}$/i.test(id);

const detectGreetingOrConversation = (input) => {
  const normalizedInput = input.toLowerCase().trim();
  const greetings = [
    "hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening",
    "how are you", "what's up", "howdy", "yo", "sup"
  ];
  const conversationalPhrases = [
    "how's it going", "what can you do", "tell me about yourself", "who are you",
    "just chatting", "how's your day", "what's new"
  ];
  return {
    isGreeting: greetings.some(greeting => normalizedInput.includes(greeting)),
    isConversational: conversationalPhrases.some(phrase => normalizedInput.includes(phrase)),
    input: normalizedInput
  };
};

const isChatEndingInput = (input) => {
  const normalized = input.toLowerCase().trim();
  const endingWords = ["bye", "thankyou", "thanks", "welldone", "done", "goodbye", "see you", "exit", "quit"];
  return endingWords.some(word => normalized.includes(word));
};

const isNoneLikeInput = (input) => {
  const normalized = input.toLowerCase().trim();
  const noneKeywords = [
    "none", "other", "others", "different", "dislike", "don't like", "not these",
    "another", "next", "new", "nope", "nah", "not interested"
  ];
  return noneKeywords.some(keyword => normalized.includes(keyword));
};

const isNewProductSearch = (input) => {
  const normalized = input.toLowerCase().trim();
  const searchKeywords = [
    "search for", "find", "look for", "buy new", "purchase new", "need another", "want different",
    "new product", "different product", "another product", "new search"
  ];
  const budgetQuantityKeywords = ["budget", "add", "increase", "units", "quantity"];
  if (budgetQuantityKeywords.some(keyword => normalized.includes(keyword))) {
    return false;
  }
  return searchKeywords.some(keyword => normalized.includes(keyword));
};

const matchProductName = (input, productTitle) => {
  const normalizedInput = input.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const normalizedTitle = productTitle.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const inputWords = normalizedInput.split(/\s+/);
  const titleWords = normalizedTitle.split(/\s+/);
  const matches = inputWords.filter(word => titleWords.includes(word) && word.length > 2);
  return matches.length >= 2 || normalizedInput.includes(normalizedTitle.split(' ').slice(0, 2).join(' '));
};

const parseExclusionaryInput = (input, maxOptions) => {
  const normalized = input.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const negativeKeywords = ["not", "dont", "did not", "do not", "exclude", "didnt"];
  const hasNegativeIntent = negativeKeywords.some(keyword => normalized.includes(keyword));
  if (!hasNegativeIntent) return null;

  const numbers = [];
  const words = normalized.split(/\s+/);
  const numberWords = { 'one': 1, 'two': 2, 'three': 3, 'first': 1, 'second': 2, 'third': 3 };
  words.forEach(word => {
    if (/^\d+$/.test(word)) {
      const num = parseInt(word);
      if (num >= 1 && num <= maxOptions) numbers.push(num);
    } else if (numberWords[word]) {
      numbers.push(numberWords[word]);
    }
  });

  const uniqueNumbers = [...new Set(numbers)];
  const allOptions = Array.from({ length: maxOptions }, (_, i) => i + 1);
  const remainingOptions = allOptions.filter(num => !uniqueNumbers.includes(num));

  return remainingOptions.length === 1 ? remainingOptions[0] : null;
};

const parseQuantityOrBudget = (input) => {
  const normalized = input.toLowerCase().replace(/[^\w\s.$]/g, '').trim();
  const words = normalized.split(/\s+/);

  const quantityWords = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10
  };
  let quantity = null;
  let budget = null;
  let currency = null;

  const currencyPattern = /(\d*\.?\d+)\s*(usd|inr|dollar|dollars|rupee|rupees|\$)/i;
  const match = normalized.match(currencyPattern);
  if (match) {
    budget = parseFloat(match[1]);
    currency = match[2].toLowerCase().replace('$', 'usd').replace(/dollar(s)?/, 'usd').replace(/rupee(s)?/, 'inr');
    if (currency === 'inr') {
      budget = budget / 83;
      currency = 'USD';
    }
  }

  if (!budget) {
    for (let i = 0; i < words.length; i++) {
      if (/^\d+$/.test(words[i])) {
        const num = parseInt(words[i]);
        if (
          i + 1 < words.length &&
          ['unit', 'units', 'piece', 'pieces', 'item', 'items'].includes(words[i + 1])
        ) {
          quantity = num;
          break;
        }
      } else if (quantityWords[words[i]]) {
        quantity = quantityWords[words[i]];
        if (i + 1 < words.length && ['unit', 'units', 'piece', 'pieces', 'item', 'items'].includes(words[i + 1])) {
          break;
        }
      }
    }
  }

  return { quantity, budget, currency: currency || 'USD' };
};

const Chatbot = ({ userId }) => {
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hello! 👋 I'm your Procurement AI assistant. Please describe what you need to purchase (e.g., 'office furniture', 'laptops', 'cleaning services').",
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
      currency: "USD",
    },
    currentQuestion: null,
    confirmedProduct: null,
    confirmedSeller: null,
    products: [],
    allProducts: [],
    currentProductPage: 1,
    selectedProductDetails: null,
  });
  const [chatSessions, setChatSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editedTitle, setEditedTitle] = useState("");
  const messagesEndRef = useRef(null);
  const searchCache = useRef(new Map());

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
        console.error("Error fetching chat sessions:", error.message);
      }
    };
    fetchChatSessions();
  }, [userId]);

  const saveMessageToSession = async (sessionId, message) => {
    if (!sessionId) return;
    try {
      await axios.post(
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
    } catch (error) {
      console.error("Error saving message:", error.message);
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
      console.error("Error creating new session:", error.message);
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
      console.error("Error retrieving session:", error.message);
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
      console.error("Error deleting session:", error.message);
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
      console.error("Error renaming session:", error.message);
      return false;
    }
  };

  const startNewChat = async () => {
    const initialBotMessage = {
      from: "bot",
      text: "Hello! 👋 I'm your Procurement AI assistant. Please describe what you need to purchase (e.g., 'office furniture', 'laptops', 'cleaning services').",
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
          currency: "USD",
        },
        currentQuestion: null,
        confirmedProduct: null,
        confirmedSeller: null,
        products: [],
        allProducts: [],
        currentProductPage: 1,
        selectedProductDetails: null,
      });
      const sessionsResponse = await axios.get(
        `http://localhost:5000/api/chat/sessions/${userId}`,
        { headers: { "X-User-Id": userId } }
      );
      setChatSessions(sessionsResponse.data);
    } catch (error) {
      console.error("Error starting new chat:", error.message);
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
                text: "Hello! 👋 I'm your Procurement AI assistant. Please describe what you need to purchase (e.g., 'office furniture', 'laptops', 'cleaning services').",
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
            currency: "USD",
          },
          currentQuestion: null,
          confirmedProduct: null,
          confirmedSeller: null,
          products: [],
          allProducts: [],
          currentProductPage: 1,
          selectedProductDetails: null,
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
    const normalized = description.toLowerCase().trim();
    
    if (normalized.length < 3 || ["none", "nothing", "n/a", "no"].includes(normalized)) {
      return { productType: null };
    }

    const stopWords = [
      "i", "we", "please", "need", "want", "buy", "purchase", "help", "procure",
      "to", "for", "a", "an", "the", "some", "any", "in", "on", "at", "with",
      "is", "are", "am", "was", "were", "be", "can", "could", "should", "would",
      "do", "does", "did", "get", "got", "have", "has", "had"
    ];

    const words = normalized.split(/\s+/).filter(word => !stopWords.includes(word) && word.length > 2);

    const { isGreeting, isConversational } = detectGreetingOrConversation(normalized);
    if (isGreeting || isConversational || words.length === 0) {
      return { productType: null };
    }

    let productType = "";
    if (words.length === 1) {
      productType = words[0];
    } else {
      const potentialProduct = [];
      let i = 0;
      while (i < words.length) {
        if (i + 1 < words.length && words[i].length > 2 && words[i + 1].length > 2) {
          const phrase = `${words[i]} ${words[i + 1]}`;
          potentialProduct.push(phrase);
          i += 2;
        } else {
          potentialProduct.push(words[i]);
          i += 1;
        }
      }
      productType = potentialProduct[0] || words[0];
      if (potentialProduct.length > 1) {
        console.log("Multiple potential products detected:", potentialProduct);
      }
    }

    return { productType };
  };

  const sanitizeKeyword = (keyword) => {
    return keyword.trim().replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 50);
  };

  const handleConversationalInput = async (userInput, isGreeting = false) => {
    let botText;
    if (isGreeting) {
      botText = `Hi! 😊 I'm here to help you find the perfect product. What are you looking to buy today?`;
    } else {
      botText = `Cool, let's chat! 😄 What product or service are you thinking about procuring?`;
    }

    const botReply = {
      from: "bot",
      text: botText,
      timestamp: new Date().toISOString(),
    };
    setMessages((msgs) => [...msgs, botReply]);
    if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
  };

  const handleInitialState = async (userInput) => {
    const { isGreeting, isConversational } = detectGreetingOrConversation(userInput);
    
    if (isGreeting || isConversational) {
      await handleConversationalInput(userInput, isGreeting);
      return;
    }

    const procurementType = analyzeProcurementType(userInput);
    if (!procurementType.productType) {
      const answer = await handleGeminiAIQuery(
        {},
        `The user said: "${userInput}". They are interacting with a procurement AI assistant. Determine if they are asking about procurement (e.g., buying something) or something else. If procurement-related, suggest a product type or next step. Otherwise, respond conversationally and guide them toward procurement. Keep the response concise and natural.`,
        messages.slice(-10)
      );
      const botReply = {
        from: "bot",
        text: answer,
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      return;
    }

    const sanitizedKeyword = sanitizeKeyword(procurementType.productType);
    
    if (searchCache.current.has(sanitizedKeyword)) {
      const cachedProducts = searchCache.current.get(sanitizedKeyword);
      const initialProducts = cachedProducts.slice(0, 3);
      const productList = initialProducts.map((p, idx) =>
        `${idx + 1}. ${p.ProductTitle}\nPrice: ${p.price || 'N/A'}\nVendor: ${p.sellerName || (p.isAmazonFulfilled ? 'Amazon' : 'Unknown Vendor')}`
      ).join('\n\n');

      const botReply = {
        from: "bot",
        text: `I found these options:\n\n${productList}\n\nWhich option interests you? (Select 1-3, product name, exclude options, or say 'none' for more options)`,
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);

      setConversationState({
        stage: "selecting_product",
        procurementDetails: {
          requirements: { productType: procurementType.productType },
          quantity: null,
          budget: null,
          currency: "USD",
        },
        products: initialProducts,
        allProducts: cachedProducts,
        currentProductPage: 1,
        currentQuestion: {
          question: "Please select a product (1-3, product name, exclude options, or 'none' for more):",
          key: "product_selection",
          validation: (answer) => {
            const numbers = parseInputForNumbers(answer);
            const productMatch = cachedProducts.findIndex(p => matchProductName(answer, p.ProductTitle));
            const exclusion = parseExclusionaryInput(answer, initialProducts.length);
            const isNone = isNoneLikeInput(answer);
            return (numbers.length > 0 && numbers.some(num => num >= 1 && num <= initialProducts.length)) || productMatch !== -1 || exclusion !== null || isNone;
          }
        },
        confirmedSeller: null,
        selectedProductDetails: null,
      });
      return;
    }

    try {
      const response = await axios.get("http://localhost:5000/api/amazon/search", {
        params: {
          query: sanitizedKeyword,
          country: "us",
          page: 1,
          limit: 12
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
        throw new Error(response.data.details?.message || response.data.error);
      }

      const allProducts = response.data.data?.products || [];
      const initialProducts = allProducts.slice(0, 3);
      searchCache.current.set(sanitizedKeyword, allProducts);
      if (searchCache.current.size > 10) {
        const oldestKey = searchCache.current.keys().next().value;
        searchCache.current.delete(oldestKey);
      }

      const productList = initialProducts.map((p, idx) =>
        `${idx + 1}. ${p.ProductTitle}\nPrice: ${p.price || 'N/A'}\nVendor: ${p.sellerName || (p.isAmazonFulfilled ? 'Amazon' : 'Unknown Vendor')}`
      ).join('\n\n');

      const botReply = {
        from: "bot",
        text: `I found these options:\n\n${productList}\n\nWhich option interests you? (Select 1-3, product name, exclude options, or say 'none' for more options)`,
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);

      setConversationState({
        stage: "selecting_product",
        procurementDetails: {
          requirements: { productType: procurementType.productType },
          quantity: null,
          budget: null,
          currency: "USD",
        },
        products: initialProducts,
        allProducts,
        currentProductPage: 1,
        currentQuestion: {
          question: "Please select a product (1-3, product name, exclude options, or 'none' for more):",
          key: "product_selection",
          validation: (answer) => {
            const numbers = parseInputForNumbers(answer);
            const productMatch = allProducts.findIndex(p => matchProductName(answer, p.ProductTitle));
            const exclusion = parseExclusionaryInput(answer, initialProducts.length);
            const isNone = isNoneLikeInput(answer);
            return (numbers.length > 0 && numbers.some(num => num >= 1 && num <= initialProducts.length)) || productMatch !== -1 || exclusion !== null || isNone;
          }
        },
        confirmedSeller: null,
        selectedProductDetails: null,
      });
    } catch {
      const botReply = {
        from: "bot",
        text: `Sorry, I couldn't search for "${sanitizedKeyword}". Please try a different product or check later.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
    }
  };

  const parseInputForNumbers = (input) => {
    const normalized = input.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const words = normalized.split(/\s+/);

    const numberWords = {
      'one': 1,
      'two': 2,
      'three': 3,
      'first': 1,
      'second': 2,
      'third': 3
    };

    const numbers = [];
    words.forEach(word => {
      if (/^\d+$/.test(word)) {
        const num = parseInt(word);
        if (num >= 1 && num <= 3) {
          numbers.push(num);
        }
      } else if (numberWords[word]) {
        numbers.push(numberWords[word]);
      }
    });

    return [...new Set(numbers)];
  };

  const handleGeminiAIQuery = async (productDetails, userQuestion, conversationHistory = []) => {
    try {
      const response = await axios.post(
        "http://localhost:5000/api/gemini-ai",
        {
          productData: productDetails,
          question: userQuestion,
          conversationHistory
        },
        {
          headers: {
            "X-User-Id": userId,
            "Content-Type": "application/json"
          }
        }
      );
      return response.data.answer || "Sorry, I couldn't generate a response. Please try again or ask about a new product.";
    } catch (error) {
      console.error("Error querying Gemini AI:", error.response?.data || error.message);
      const errorDetails = error.response?.data?.details || error.message;
      return `Sorry, I couldn't process your question due to an error: ${errorDetails}. Please try again or ask about a new product.`;
    }
  };

  const calculateUnitsAffordable = (budget, unitPrice, currency) => {
    if (!budget || !unitPrice || isNaN(budget) || isNaN(unitPrice)) {
      return "I don't have enough information to calculate the affordable quantity. Please provide a valid budget and ensure the product price is available.";
    }
    const units = Math.floor(budget / unitPrice);
    const budgetDisplay = currency === 'INR' ? `${(budget * 83).toFixed(2)} INR (approx. $${budget.toFixed(2)} USD)` : `$${budget.toFixed(2)} ${currency}`;
    return `With a budget of ${budgetDisplay}, you can afford approximately ${units} unit${units !== 1 ? 's' : ''} of this product (priced at $${unitPrice.toFixed(2)} USD each).`;
  };

  const calculateTotalCost = (quantity, unitPrice, currency) => {
    if (!quantity || !unitPrice || isNaN(quantity) || isNaN(unitPrice)) {
      return "I don't have enough information to calculate the total cost. Please provide a valid quantity and ensure the product price is available.";
    }
    const total = quantity * unitPrice;
    const totalDisplayUSD = `$${total.toFixed(2)} USD`;
    const totalDisplayINR = currency === 'INR' ? `${(total * 83).toFixed(2)} INR` : null;
    return `For ${quantity} unit${quantity !== 1 ? 's' : ''} of this product (priced at $${unitPrice.toFixed(2)} USD each), the total cost is ${totalDisplayUSD}${totalDisplayINR ? ` (approx. ${totalDisplayINR})` : ''}.`;
  };

  const handleSelectingProduct = async (userInput) => {
    if (isChatEndingInput(userInput)) {
      const botReply = {
        from: "bot",
        text: "Thanks for chatting! 😊 Feel free to start a new conversation anytime.",
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      
      setConversationState({
        stage: "initial",
        procurementDetails: {
          requirements: {},
          quantity: null,
          budget: null,
          currency: "USD",
        },
        currentQuestion: null,
        confirmedProduct: null,
        confirmedSeller: null,
        products: [],
        allProducts: [],
        currentProductPage: 1,
        selectedProductDetails: null,
      });
      return;
    }

    if (isNoneLikeInput(userInput)) {
      const { allProducts, currentProductPage } = conversationState;
      const productsPerPage = 3;
      const nextPage = currentProductPage + 1;
      const startIndex = currentProductPage * productsPerPage;
      
      if (startIndex >= allProducts.length) {
        const botReply = {
          from: "bot",
          text: `No more products available for "${conversationState.procurementDetails.requirements.productType}". Please describe a different product or start a new search.`,
          timestamp: new Date().toISOString(),
        };
        setMessages((msgs) => [...msgs, botReply]);
        if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
        
        setConversationState({
          ...conversationState,
          stage: "initial",
          products: [],
          currentProductPage: 1,
          currentQuestion: null,
          selectedProductDetails: null,
        });
        return;
      }

      const nextProducts = allProducts.slice(startIndex, startIndex + productsPerPage);
      const productList = nextProducts.map((p, idx) =>
        `${idx + 1}. ${p.ProductTitle}\nPrice: ${p.price || 'N/A'}\nVendor: ${p.sellerName || (p.isAmazonFulfilled ? 'Amazon' : 'Unknown Vendor')}`
      ).join('\n\n');

      const botReply = {
        from: "bot",
        text: `Here are more options:\n\n${productList}\n\nWhich option interests you? (Select 1-${nextProducts.length}, product name, exclude options, or say 'none' for more options)`,
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);

      setConversationState({
        ...conversationState,
        products: nextProducts,
        currentProductPage: nextPage,
        currentQuestion: {
          question: `Please select a product (1-${nextProducts.length}, product name, exclude options, or 'none' for more):`,
          key: "product_selection",
          validation: (answer) => {
            const numbers = parseInputForNumbers(answer);
            const productMatch = allProducts.findIndex(p => matchProductName(answer, p.ProductTitle));
            const exclusion = parseExclusionaryInput(answer, nextProducts.length);
            const isNone = isNoneLikeInput(answer);
            return (numbers.length > 0 && numbers.some(num => num >= 1 && num <= nextProducts.length)) || productMatch !== -1 || exclusion !== null || isNone;
          }
        },
      });
      return;
    }

    const maxOptions = conversationState.products.length;
    let selection = null;

    const exclusionSelection = parseExclusionaryInput(userInput, maxOptions);
    if (exclusionSelection !== null) {
      selection = exclusionSelection;
      const botReply = {
        from: "bot",
        text: `Since you excluded other options, I'll proceed with option ${selection}.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
    }

    if (!selection) {
      const productMatchIndex = conversationState.products.findIndex(p => matchProductName(userInput, p.ProductTitle));
      if (productMatchIndex !== -1) {
        selection = productMatchIndex + 1;
      }
    }

    if (!selection) {
      const numbers = parseInputForNumbers(userInput);
      if (numbers.length === 1) {
        selection = numbers[0];
      } else if (numbers.length > 1) {
        const botReply = {
          from: "bot",
          text: `You mentioned multiple options (${numbers.join(', ')}). Please specify a single option (e.g., 'option ${numbers[0]}', the product name, or exclude others like 'not option ${numbers[1]}').`,
          timestamp: new Date().toISOString(),
        };
        setMessages((msgs) => [...msgs, botReply]);
        if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
        return;
      }
    }

    if (!selection || selection < 1 || selection > maxOptions) {
      const answer = await handleGeminiAIQuery(
        { products: conversationState.products },
        `The user said: "${userInput}". They were asked to select a product by entering a number (1-${maxOptions}), product name, exclude options (e.g., 'not option 1'), or say 'none'. Interpret their input and suggest a response to clarify or guide them.`,
        messages.slice(-10)
      );
      const botReply = {
        from: "bot",
        text: answer,
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
      title: selectedProduct.ProductTitle,
      unitPrice: selectedProduct.price || "N/A",
      url: selectedProduct.productUrl,
    };

    let confirmedSeller = {
      sellerId: selectedProduct.sellerId || "UNKNOWN",
      sellerName: selectedProduct.sellerName || (selectedProduct.isAmazonFulfilled ? "Amazon" : "Unknown Vendor"),
      rating: "N/A",
      ratingNum: { lifeTime: "N/A" },
      storeLink: selectedProduct.productUrl || "https://www.amazon.com",
    };

    try {
      const [productResponse, sellerResponse] = await Promise.all([
        axios.get("http://localhost:5000/api/amazon/product-details", {
          params: { asin: selectedProduct.asin, country: "us" },
          headers: { "X-User-Id": userId }
        }).catch(() => ({ data: { success: false } })),
        selectedProduct.sellerId && selectedProduct.sellerId !== "UNKNOWN" && selectedProduct.sellerId !== "NA"
          ? axios.get("http://localhost:5000/api/amazon/seller-profile", {
              params: { seller_id: selectedProduct.sellerId, country: "us" },
              headers: { "X-User-Id": userId }
            }).catch(() => ({ data: { success: false } }))
          : Promise.resolve({ data: { success: false } })
      ]);

      let productDetails = {};
      if (productResponse.data.success) {
        productDetails = productResponse.data.data;
        confirmedSeller.sellerName = productDetails.sellerName || confirmedSeller.sellerName;
        if (productDetails.amazonFulfilled && !confirmedSeller.sellerName) {
          confirmedSeller.sellerName = "Amazon";
          confirmedSeller.sellerId = "AMAZON";
        }
      }

      if (sellerResponse.data.success) {
        confirmedSeller = {
          ...confirmedSeller,
          ...sellerResponse.data.data,
          storeLink: sellerResponse.data.data.storeLink || confirmedProduct.url || "https://www.amazon.com"
        };
      }

      const botReply = {
        from: "bot",
        text: `Great! You selected: ${selectedProduct.ProductTitle}. How many units do you need, or what's your budget for this product (e.g., '10 units' or '$500')?`,
        timestamp: new Date().toISOString(),
        url: confirmedSeller.storeLink,
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);

      setConversationState({
        stage: "collecting_quantity_or_budget",
        procurementDetails: {
          requirements: { productType: conversationState.procurementDetails.requirements.productType },
          quantity: null,
          budget: null,
          currency: "USD",
        },
        currentQuestion: {
          question: "How many units do you need, or what's your budget for this product (e.g., '10 units' or '$500')?",
          key: "quantity_or_budget",
          validation: (answer) => {
            const { quantity, budget } = parseQuantityOrBudget(answer);
            return quantity !== null || budget !== null;
          }
        },
        confirmedProduct,
        confirmedSeller,
        products: [],
        allProducts: [],
        currentProductPage: 1,
        selectedProductDetails: productDetails,
      });
    } catch (error) {
      console.error("Error fetching product or seller details:", error.message);
      const botReply = {
        from: "bot",
        text: `Great! You selected: ${selectedProduct.ProductTitle}. How many units do you need, or what's your budget for this product (e.g., '10 units' or '$500')?`,
        timestamp: new Date().toISOString(),
        url: confirmedSeller.storeLink,
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);

      setConversationState({
        stage: "collecting_quantity_or_budget",
        procurementDetails: {
          requirements: { productType: conversationState.procurementDetails.requirements.productType },
          quantity: null,
          budget: null,
          currency: "USD",
        },
        currentQuestion: {
          question: "How many units do you need, or what's your budget for this product (e.g., '10 units' or '$500')?",
          key: "quantity_or_budget",
          validation: (answer) => {
            const { quantity, budget } = parseQuantityOrBudget(answer);
            return quantity !== null || budget !== null;
          }
        },
        confirmedProduct,
        confirmedSeller,
        products: [],
        allProducts: [],
        currentProductPage: 1,
        selectedProductDetails: {
          title: selectedProduct.ProductTitle,
          price: selectedProduct.price || 'N/A',
          productUrl: selectedProduct.productUrl,
          sellerName: confirmedSeller.sellerName,
        },
      });
    }
  };

  const handleQuantityOrBudget = async (userInput, conversationHistory) => {
    if (isChatEndingInput(userInput)) {
      const botReply = {
        from: "bot",
        text: "Thanks for chatting! 😊 Feel free to start a new conversation anytime.",
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      
      setConversationState({
        stage: "initial",
        procurementDetails: {
          requirements: {},
          quantity: null,
          budget: null,
          currency: "USD",
        },
        currentQuestion: null,
        confirmedProduct: null,
        confirmedSeller: null,
        products: [],
        allProducts: [],
        currentProductPage: 1,
        selectedProductDetails: null,
      });
      return;
    }

    if (isNewProductSearch(userInput)) {
      const botReply = {
        from: "bot",
        text: "Alright, let's start a new search! Please describe what you'd like to procure (e.g., 'office chairs', 'laptops').",
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      
      setConversationState({
        stage: "initial",
        procurementDetails: {
          requirements: {},
          quantity: null,
          budget: null,
          currency: "USD",
        },
        currentQuestion: null,
        confirmedProduct: null,
        confirmedSeller: null,
        products: [],
        allProducts: [],
        currentProductPage: 1,
        selectedProductDetails: null,
      });
      return;
    }

    const { quantity, budget, currency } = parseQuantityOrBudget(userInput);
    const unitPrice = parseFloat(conversationState.confirmedProduct.unitPrice?.replace('$', '')) || null;
    let botText = '';
    let updatedBudget = conversationState.procurementDetails.budget;

    const budgetUpdatePattern = /(?:add|increase)\s+(\d*\.?\d+)\s*(usd|inr|dollar|dollars|rupee|rupees|\$)/i;
    const updateMatch = userInput.toLowerCase().match(budgetUpdatePattern);
    if (updateMatch && updatedBudget !== null) {
      let additionalBudget = parseFloat(updateMatch[1]);
      let updateCurrency = updateMatch[2].toLowerCase().replace('$', 'usd').replace(/dollar(s)?/, 'usd').replace(/rupee(s)?/, 'inr');
      if (updateCurrency === 'inr') {
        additionalBudget = additionalBudget / 83;
      }
      updatedBudget += additionalBudget;
      conversationState.procurementDetails.budget = updatedBudget;
      conversationState.procurementDetails.currency = currency || updateCurrency || 'USD';
    }

    if (quantity !== null && unitPrice) {
      conversationState.procurementDetails.quantity = quantity;
      botText = calculateTotalCost(quantity, unitPrice, currency || conversationState.procurementDetails.currency);
    } else if (budget !== null && unitPrice) {
      conversationState.procurementDetails.budget = budget;
      conversationState.procurementDetails.currency = currency || 'USD';
      botText = calculateUnitsAffordable(budget, unitPrice, currency || 'USD');
    } else if (updatedBudget !== null && unitPrice) {
      conversationState.procurementDetails.currency = currency || conversationState.procurementDetails.currency;
      botText = calculateUnitsAffordable(updatedBudget, unitPrice, conversationState.procurementDetails.currency);
    } else {
      const productDetails = conversationState.selectedProductDetails || {};
      const answer = await handleGeminiAIQuery(
        productDetails,
        `The user said: "${userInput}". They were asked to provide a quantity (e.g., '10 units') or budget (e.g., '$500' or '100000 INR'). They previously provided a budget of ${conversationState.procurementDetails.budget ? (conversationState.procurementDetails.currency === 'INR' ? (conversationState.procurementDetails.budget * 83).toFixed(2) + ' INR' : '$' + conversationState.procurementDetails.budget.toFixed(2) + ' USD') : 'none'}. Interpret their input, handle budget updates (e.g., 'add 200000 INR'), and respond appropriately, calculating affordability or total cost if possible. Use 1 USD = 83 INR for conversions if needed.`,
        conversationHistory
      );
      botText = answer;
    }

    const botReply = {
      from: "bot",
      text: `${botText}\n\nYou can now ask any questions about the product (e.g., 'What are the product dimensions?') or say 'new search' for a different product.`,
      timestamp: new Date().toISOString(),
    };
    setMessages((msgs) => [...msgs, botReply]);
    if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);

    setConversationState({
      ...conversationState,
      stage: "answering_product_questions",
      procurementDetails: {
        ...conversationState.procurementDetails,
        quantity: quantity || conversationState.procurementDetails.quantity,
        budget: updatedBudget || budget || conversationState.procurementDetails.budget,
        currency: currency || conversationState.procurementDetails.currency,
      },
      currentQuestion: null,
    });
  };

  const handleProductQuestions = async (userInput, conversationHistory) => {
    if (isChatEndingInput(userInput)) {
      const botReply = {
        from: "bot",
        text: "Thanks for chatting! 😊 Feel free to start a new conversation anytime.",
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      
      setConversationState({
        stage: "initial",
        procurementDetails: {
          requirements: {},
          quantity: null,
          budget: null,
          currency: "USD",
        },
        currentQuestion: null,
        confirmedProduct: null,
        confirmedSeller: null,
        products: [],
        allProducts: [],
        currentProductPage: 1,
        selectedProductDetails: null,
      });
      return;
    }

    if (isNewProductSearch(userInput)) {
      const botReply = {
        from: "bot",
        text: "Alright, let's start a new search! Please describe what you'd like to procure (e.g., 'office chairs', 'laptops').",
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      
      setConversationState({
        stage: "initial",
        procurementDetails: {
          requirements: {},
          quantity: null,
          budget: null,
          currency: "USD",
        },
        currentQuestion: null,
        confirmedProduct: null,
        confirmedSeller: null,
        products: [],
        allProducts: [],
        currentProductPage: 1,
        selectedProductDetails: null,
      });
      return;
    }

    const productDetails = conversationState.selectedProductDetails || {};
    const answer = await handleGeminiAIQuery(productDetails, userInput, conversationHistory);
    const botReply = {
      from: "bot",
      text: answer,
      timestamp: new Date().toISOString(),
    };
    setMessages((msgs) => [...msgs, botReply]);
    if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
  };

  const sendMessage = async () => {
    if (!input.trim()) {
      setInput("");
      return;
    }
    const userMessage = { from: "user", text: input, timestamp: new Date().toISOString() };
    setMessages((msgs) => [...msgs, userMessage]);
    setLoading(true);

    const recentMessages = messages.slice(-10).map(msg => ({
      role: msg.from,
      content: msg.text,
      timestamp: msg.timestamp
    }));

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
        case "collecting_quantity_or_budget":
          await handleQuantityOrBudget(input, recentMessages);
          break;
        case "answering_product_questions":
          await handleProductQuestions(input, recentMessages);
          break;
        default:
          await handleInitialState(input);
      }
    } catch {
      const errorReply = {
        from: "bot",
        text: "I encountered a technical issue. 😅 Please try another input or describe what you want to procure.",
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
          currency: "USD",
        },
        currentQuestion: null,
        confirmedProduct: null,
        confirmedSeller: null,
        products: [],
        allProducts: [],
        currentProductPage: 1,
        selectedProductDetails: null,
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
        return `Enter product number (1-${conversationState.products.length}, e.g., '1', 'option 2'), product name, exclude options (e.g., 'not option 1 and 3'), or 'none' for more options...`;
      case "collecting_quantity_or_budget":
        return "Enter the number of units (e.g., '10 units') or your budget (e.g., '$500' or '100000 INR')...";
      case "answering_product_questions":
        return `Ask a question about the selected product (e.g., 'What is the price for 10 units in INR?') or say 'new search' for a different product...`;
      default:
        return "Describe what you need to procure (e.g., 'office chairs') or say 'hi' to chat...";
    }
  };

  const getStageDescription = () => {
    if (conversationState.currentQuestion) {
      return "Selecting a product or providing quantity/budget";
    }
    switch (conversationState.stage) {
      case "initial":
        return "Ready to help with your procurement needs";
      case "selecting_product":
        return "Selecting product from Amazon";
      case "collecting_quantity_or_budget":
        return `Collecting quantity or budget for ${conversationState.confirmedProduct?.title || 'selected product'}`;
      case "answering_product_questions":
        return `Answering questions about ${conversationState.confirmedProduct?.title || 'selected product'}`;
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
        <Link
          to="/profile"
          className="w-full flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
        >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Profile
        </Link>
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
                    Visit Vendor Store
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
          <div className="max-w-6xl mx-auto flex items-center gap-3">
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

