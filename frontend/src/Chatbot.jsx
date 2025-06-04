import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import 'animate.css';

// Mock vendors data (simulating dynamic data from web search)
const mockVendors = [
  {
    name: "TechTrend Innovations",
    category: "goods",
    items: ["laptops", "computers", "workstations"],
    description: "High-performance laptops and workstations for professional use",
    price: 55000,
    location: "Mumbai, India",
    delivery_days: 7,
    rating: 4.8,
    certified: true,
    contact: "contact@techtrend.com"
  },
  {
    name: "OfficeWorks Ltd",
    category: "goods",
    items: ["office furniture", "chairs", "desks"],
    description: "Ergonomic office furniture for modern workplaces",
    price: 6000,
    location: "Delhi, India",
    delivery_days: 5,
    rating: 4.5,
    certified: true,
    contact: "sales@officeworks.com"
  },
  {
    name: "CleanPro Services",
    category: "services",
    items: ["cleaning services", "sanitation"],
    description: "Professional cleaning and sanitation services for offices and homes",
    price: 12000,
    location: "Bangalore, India",
    delivery_days: 3,
    rating: 4.7,
    certified: false,
    contact: "info@cleanpro.com"
  },
  {
    name: "SoftPeak Solutions",
    category: "software",
    items: ["software licenses", "saas", "cloud solutions"],
    description: "Enterprise software solutions with cloud and on-premise options",
    price: 30000,
    location: "Hyderabad, India",
    delivery_days: 2,
    rating: 4.9,
    certified: true,
    contact: "support@softpeak.com"
  },
  {
    name: "BuildStrong Constructions",
    category: "construction",
    items: ["construction", "renovation", "infrastructure"],
    description: "Commercial construction and renovation services",
    price: 1200000,
    location: "Chennai, India",
    delivery_days: 90,
    rating: 4.6,
    certified: true,
    contact: "projects@buildstrong.com"
  }
];

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
  });
  const [chatSessions, setChatSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [vendors, setVendors] = useState(mockVendors);
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
        "http://localhost:5000/api/chat/rename",
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

  const handleGeneralInput = async (inputText) => {
    const lowerInput = inputText.toLowerCase().trim();
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

  const generateDynamicQuestions = (procurementType) => {
    const { productType, category, keywords, specificAttributes } = procurementType;
    const questions = [];
    const usedAspects = new Set();

    const createQuestion = (aspect, questionText, expectedTerms) => ({
      question: questionText,
      key: aspect,
      field: `requirements.${aspect}`,
      validation: (answer) => answer.trim().length > 2,
      relevanceCheck: (answer) => {
        const lowerAnswer = answer.toLowerCase();
        return expectedTerms.some(term => lowerAnswer.includes(term.toLowerCase())) ||
               lowerAnswer.split(' ').length > 2;
      },
      relevancePrompt: `Your response for ${productType} seems unrelated to ${aspect.replace(/([A-Z])/g, ' $1').toLowerCase()}. Please provide specific details (e.g., ${expectedTerms.slice(0, 3).join(', ')}).`,
    });

    const generateSingleQuestion = () => {
      const possibleAspects = [
        'functionality', 'specifications', 'environment', 'constraints', 'compatibility',
        'durability', 'aesthetics', 'scope', 'schedule', 'expertise', 'regulations', 'deployment'
      ].filter(aspect => !usedAspects.has(aspect));
      
      if (!possibleAspects.length) return null;

      const aspect = possibleAspects[Math.floor(Math.random() * possibleAspects.length)];
      let questionText, expectedTerms;

      if (aspect === 'functionality') {
        if (category === 'goods') {
          questionText = specificAttributes.isPortable
            ? `Which features ensure the ${productType} meets your mobility needs?`
            : `What core features are critical for the performance of ${productType}?`;
          expectedTerms = keywords.concat(['feature', 'performance', 'size', 'capacity']);
        } else if (category === 'services') {
          questionText = specificAttributes.isSpecialized
            ? `What unique tasks or skills are needed for this ${productType}?`
            : `What primary activities must the ${productType} deliver?`;
          expectedTerms = ['task', 'skill', 'activity', 'service'];
        } else if (category === 'software') {
          questionText = specificAttributes.isLargeScale
            ? `What advanced features are required for ${productType} scalability?`
            : `What key functionalities should the ${productType} provide?`;
          expectedTerms = ['function', 'scale', 'module', 'tool'];
        } else if (category === 'construction') {
          questionText = `What key project goals define the ${productType} requirements?`;
          expectedTerms = ['goal', 'design', 'structure', 'objective'];
        }
      } else if (aspect === 'environment') {
        if (category === 'goods') {
          questionText = specificAttributes.hasEnvironment
            ? `In what specific setting will the ${productType} be primarily used?`
            : `What conditions will the ${productType} operate in?`;
          expectedTerms = ['setting', 'office', 'outdoor', 'home', 'industrial'];
        } else if (category === 'services') {
          questionText = specificAttributes.isUrgent
            ? `What urgent locations or scenarios require ${productType}?`
            : `Where will the ${productType} be carried out?`;
          expectedTerms = ['location', 'site', 'area', 'building'];
        } else if (category === 'software') {
          questionText = `What operational context will the ${productType} support?`;
          expectedTerms = ['context', 'team', 'system', 'workflow'];
        } else if (category === 'construction') {
          questionText = `What environmental factors affect the ${productType} site?`;
          expectedTerms = ['site', 'terrain', 'climate', 'location'];
        }
      } else if (aspect === 'constraints') {
        if (category === 'goods') {
          questionText = specificAttributes.isEcoFriendly
            ? `What eco-friendly requirements must the ${productType} meet?`
            : `What specific restrictions apply to the ${productType}?`;
          expectedTerms = ['restriction', 'limit', 'standard', 'material'];
        } else if (category === 'services') {
          questionText = specificAttributes.isSpecialized
            ? `What certifications or standards are required for ${productType}?`
            : `What limitations or preferences shape the ${productType}?`;
          expectedTerms = ['certification', 'standard', 'schedule', 'limit'];
        } else if (category === 'software') {
          questionText = specificAttributes.isUrgent
            ? `What time-sensitive needs influence ${productType} deployment?`
            : `What specific constraints apply to ${productType} implementation?`;
          expectedTerms = ['time', 'constraint', 'license', 'security'];
        } else if (category === 'construction') {
          questionText = `What regulatory or logistical constraints impact ${productType}?`;
          expectedTerms = ['regulation', 'logistics', 'compliance', 'budget'];
        }
      } else if (aspect === 'compatibility') {
        if (category === 'goods') {
          questionText = specificAttributes.hasBrand
            ? `What systems or brands should ${productType} be compatible with, like ${specificAttributes.hasBrand}?`
            : `What other equipment should ${productType} work with?`;
          expectedTerms = ['system', 'brand', 'device', 'compatibility'];
        } else if (category === 'services') {
          questionText = `What existing processes should ${productType} align with?`;
          expectedTerms = ['process', 'workflow', 'system', 'alignment'];
        } else if (category === 'software') {
          questionText = `What platforms or tools must ${productType} integrate with?`;
          expectedTerms = ['platform', 'tool', 'integration', 'API'];
        } else if (category === 'construction') {
          questionText = `What existing structures must ${productType} integrate with?`;
          expectedTerms = ['structure', 'integration', 'building', 'design'];
        }
      } else if (aspect === 'aesthetics') {
        if (category === 'goods') {
          questionText = specificAttributes.hasColor
            ? `What visual or design preferences do you have for ${productType}?`
            : `What aesthetic qualities should ${productType} have?`;
          expectedTerms = ['color', 'design', 'style', 'appearance'];
        } else if (category === 'services') {
          questionText = `What professional presentation is expected from ${productType}?`;
          expectedTerms = ['appearance', 'professional', 'standard'];
        } else if (category === 'construction') {
          questionText = `What aesthetic or architectural style should ${productType} follow?`;
          expectedTerms = ['style', 'architecture', 'design', 'appearance'];
        }
      } else if (aspect === 'durability') {
        if (category === 'goods') {
          questionText = specificAttributes.isHighEnd
            ? `What durability standards are needed for premium ${productType}?`
            : `How durable should the ${productType} be for its use?`;
          expectedTerms = ['durability', 'strength', 'lifespan', 'quality'];
        } else if (category === 'construction') {
          questionText = `What durability or safety standards must ${productType} meet?`;
          expectedTerms = ['durability', 'safety', 'standard', 'quality'];
        }
      } else if (aspect === 'scope') {
        if (category === 'services') {
          questionText = specificAttributes.isLargeScale
            ? `What is the full scope of this large-scale ${productType}?`
            : `What specific deliverables define ${productType}?`;
          expectedTerms = ['scope', 'deliverable', 'task', 'service'];
        } else if (category === 'construction') {
          questionText = `What is the overall scope of the ${productType} project?`;
          expectedTerms = ['scope', 'project', 'task', 'objective'];
        }
      } else if (aspect === 'schedule') {
        if (category === 'services') {
          questionText = specificAttributes.isUrgent
            ? `What scheduling priorities drive urgency for ${productType}?`
            : `What is the preferred schedule for ${productType} delivery?`;
          expectedTerms = ['schedule', 'time', 'frequency', 'deadline'];
        } else if (category === 'construction') {
          questionText = `What scheduling requirements shape ${productType}?`;
          expectedTerms = ['schedule', 'timeline', 'deadline', 'milestone'];
        }
      } else if (aspect === 'expertise') {
        if (category === 'services') {
          questionText = specificAttributes.isSpecialized
            ? `What expertise or qualifications are critical for ${productType}?`
            : `What level of professional expertise is needed for ${productType}?`;
          expectedTerms = ['expertise', 'qualification', 'skill', 'certification'];
        } else if (category === 'software') {
          questionText = `What technical expertise is required for ${productType} support?`;
          expectedTerms = ['expertise', 'support', 'technical', 'skill'];
        }
      } else if (aspect === 'regulations') {
        if (category === 'construction') {
          questionText = specificAttributes.isEcoFriendly
            ? `What environmental regulations apply to ${productType}?`
            : `What compliance standards must ${productType} adhere to?`;
          expectedTerms = ['regulation', 'compliance', 'standard', 'law'];
        } else if (category === 'services') {
          questionText = `What regulatory standards apply to ${productType}?`;
          expectedTerms = ['regulation', 'standard', 'compliance'];
        }
      } else if (aspect === 'deployment') {
        if (category === 'software') {
          questionText = specificAttributes.isLargeScale
            ? `What deployment strategy is needed for ${productType} scale?`
            : `How should ${productType} be deployed?`;
          expectedTerms = ['deployment', 'cloud', 'on-premise', 'install'];
        }
      }

      if (!questionText) {
        questionText = `What specific ${aspect} requirements are needed for ${productType}?`;
        expectedTerms = keywords.concat([aspect, productType.toLowerCase()]);
      }

      usedAspects.add(aspect);
      return createQuestion(aspect, questionText, expectedTerms);
    };

    for (let i = 0; i < 3; i++) {
      const question = generateSingleQuestion();
      if (question) {
        questions.push(question);
      }
    }

    return questions;
  };

  const estimateProcurementValue = (requirements, quantity, budget) => {
    const { productType } = requirements;
    const lowerType = productType.toLowerCase();
    let unitPrice = 1000;
    if (/laptop|computer|device/.test(lowerType)) unitPrice = 50000;
    else if (/chair|furniture/.test(lowerType)) unitPrice = 5000;
    else if (/service|cleaning|maintenance/.test(lowerType)) unitPrice = 10000;
    else if (/construction|building/.test(lowerType)) unitPrice = 1000000;
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

  const findPotentialSuppliers = (procurementDetails) => {
    const { productType, category, quantity, budget } = procurementDetails.requirements;
    const lowerType = productType.toLowerCase();
    
    let relevantVendors = vendors.filter(vendor => {
      const matchesCategory = vendor.category.toLowerCase().includes(category.toLowerCase());
      const matchesItems = vendor.items.some(item => item.toLowerCase().includes(lowerType.split(' ')[0]));
      const withinBudget = budget ? vendor.price * (quantity || 1) <= budget : true;
      return (matchesCategory || matchesItems) && withinBudget;
    });

    if (relevantVendors.length === 0) {
      relevantVendors = vendors.filter(vendor =>
        vendor.description.toLowerCase().includes(lowerType.split(' ')[0]) && 
        (budget ? vendor.price * (quantity || 1) <= budget : true)
      );
    }

    const scoredVendors = relevantVendors.map(vendor => {
      let score = 0;
      score += vendor.rating * 10;
      if (vendor.certified) score += 20;
      if (procurementDetails.requirements.someField && vendor.description.toLowerCase().includes(
        procurementDetails.requirements.someField.toLowerCase().split(' ')[0]
      )) {
        score += 15;
      }
      if (procurementDetails.budget && vendor.price * (quantity || 1) <= procurementDetails.budget) {
        score += 30;
      }
      const timelineDays = procurementDetails.timeline ? parseInt(procurementDetails.timeline) : 7;
      if (vendor.delivery_days <= timelineDays) {
        score += 10;
      }
      return { ...vendor, score };
    });

    return scoredVendors.sort((a, b) => b.score - a.score);
  };

  const handleInitialState = async (userInput) => {
    const generalResponse = await handleGeneralInput(userInput);
    if (generalResponse) {
      if (generalResponse.shouldEnd) {
        setConversationState(prev => ({
          ...prev,
          stage: "initial"
        }));
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
    const updatedProcurementDetails = {
      ...conversationState.procurementDetails,
      requirements: {
        productType: procurementType.productType,
        category: procurementType.category,
        quantity: procurementType.quantity,
        keywords: procurementType.keywords,
        specificAttributes: procurementType.specificAttributes,
      },
    };
    const requirementsQuestions = generateDynamicQuestions(procurementType);
    setConversationState({
      stage: "confirming_product",
      procurementDetails: updatedProcurementDetails,
      currentQuestion: requirementsQuestions[0],
      questionsQueue: requirementsQuestions.slice(1),
      confirmedProduct: null,
    });
    const botReply = {
      from: "bot",
      text: `Thank you for your request to procure ${procurementType.productType}. Let's confirm the exact variety you need.\n\n${requirementsQuestions[0].question}`,
      timestamp: new Date().toISOString(),
    };
    setMessages((msgs) => [...msgs, botReply]);
    if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
  };

  const handleGatheringRequirements = async (userInput) => {
    const generalResponse = await handleGeneralInput(userInput);
    if (generalResponse) {
      if (generalResponse.shouldEnd) {
        setConversationState(prev => ({
          ...prev,
          stage: "initial"
        }));
      }
      return;
    }
    const { currentQuestion, questionsQueue, procurementDetails } = conversationState;
    const validation = currentQuestion.validation(userInput);
    if (!validation) {
      const botReply = {
        from: "bot",
        text: "Please provide a more detailed answer (at least 10 characters) to help confirm the product details.",
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      return;
    }
    const isRelevant = currentQuestion.relevanceCheck(userInput);
    if (!isRelevant) {
      const botReply = {
        from: "bot",
        text: currentQuestion.relevancePrompt,
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      return;
    }
    const fieldPath = currentQuestion.field.split('.');
    const updatedDetails = { ...procurementDetails };
    let currentLevel = updatedDetails;
    for (let i = 0; i < fieldPath.length - 1; i++) {
      if (!currentLevel[fieldPath[i]]) {
        currentLevel[fieldPath[i]] = {};
      }
      currentLevel = currentLevel[fieldPath[i]];
    }
    currentLevel[fieldPath[fieldPath.length - 1]] = userInput;
    if (questionsQueue.length > 0) {
      setConversationState({
        stage: "confirming_product",
        procurementDetails: updatedDetails,
        currentQuestion: questionsQueue[0],
        questionsQueue: questionsQueue.slice(1),
      });
      const botReply = {
        from: "bot",
        text: questionsQueue[0].question,
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
    } else {
      const confirmedProduct = {
        productType: procurementDetails.requirements.productType,
        ...Object.keys(procurementDetails.requirements).reduce((obj, key) => {
          if (key !== 'productType' && key !== 'category' && key !== 'quantity' && key !== 'keywords' && key !== 'specificAttributes') {
            obj[key] = procurementDetails.requirements[key] || '';
          }
          return obj;
        }, {}),
      };
      setConversationState({
        stage: "asking_quantity",
        procurementDetails: updatedDetails,
        currentQuestion: {
          question: `How many ${procurementDetails.requirements.productType} do you need?`,
          key: "quantity",
          field: "quantity",
          validation: (answer) => !isNaN(parseInt(answer)) && parseInt(answer) > 0,
        },
        questionsQueue: [],
        confirmedProduct,
      });
      const botReply = {
        from: "bot",
        text: `Thank you for confirming the details for ${procurementDetails.requirements.productType}. How many ${procurementDetails.requirements.productType} do you need?`,
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
    }
  };

  const handleAskingQuantity = async (userInput) => {
    const generalResponse = await handleGeneralInput(userInput);
    if (generalResponse) {
      if (generalResponse.shouldEnd) {
        setConversationState(prev => ({
          ...prev,
          stage: "initial"
        }));
      }
      return;
    }
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
      questionsQueue: [],
      confirmedProduct: conversationState.confirmedProduct,
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
    const generalResponse = await handleGeneralInput(userInput);
    if (generalResponse) {
      if (generalResponse.shouldEnd) {
        setConversationState(prev => ({
          ...prev,
          stage: "initial"
        }));
      }
      return;
    }
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
      questionsQueue: [],
      confirmedProduct: conversationState.confirmedProduct,
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
    const generalResponse = await handleGeneralInput(userInput);
    if (generalResponse) {
      if (generalResponse.shouldEnd) {
        setConversationState(prev => ({
          ...prev,
          stage: "initial"
        }));
      }
      return;
    }
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
        questionsQueue: wocQuestions.slice(1),
      });
      const botReply = {
        from: "bot",
        text: `I've estimated the procurement value at ₹${estimatedValue.toLocaleString()} using your inputs. Since this is a high-value procurement requiring Open Tender, we need to document the Waiver of Competition justification.\n\n${wocQuestions[0].question}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
    } else {
      await handleWOCComplete(updatedDetails);
    }
  };

  const handleGatheringWOC = async (userInput) => {
    const generalResponse = await handleGeneralInput(userInput);
    if (generalResponse) {
      if (generalResponse.shouldEnd) {
        setConversationState(prev => ({
          ...prev,
          stage: "initial"
        }));
      }
      return;
    }
    const { currentQuestion, questionsQueue, procurementDetails } = conversationState;
    const validation = currentQuestion.validation
      ? currentQuestion.validation(userInput)
      : userInput.trim().length > 2;
    if (!validation) {
      const botReply = {
        from: "bot",
        text: "Please provide a more detailed answer to strengthen the WOC justification.",
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      return;
    }
    const fieldPath = currentQuestion.field.split('.');
    const updatedDetails = { ...procurementDetails };
    let currentLevel = updatedDetails;
    for (let i = 0; i < fieldPath.length - 1; i++) {
      if (!currentLevel[fieldPath[i]]) {
        currentLevel[fieldPath[i]] = {};
      }
      currentLevel = currentLevel[fieldPath[i]];
    }
    currentLevel[fieldPath[fieldPath.length - 1]] = userInput;
    if (questionsQueue.length > 0) {
      setConversationState({
        stage: "gathering_woc",
        procurementDetails: updatedDetails,
        currentQuestion: questionsQueue[0],
        questionsQueue: questionsQueue.slice(1),
      });
      const botReply = {
        from: "bot",
        text: questionsQueue[0].question,
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
    } else {
      await handleWOCComplete(updatedDetails);
    }
  };

  const handleWOCComplete = async (procurementDetails) => {
    const potentialSuppliers = findPotentialSuppliers(procurementDetails);
    const updatedDetails = {
      ...procurementDetails,
      suppliers: potentialSuppliers,
    };
    if (potentialSuppliers.length === 0) {
      const botReply = {
        from: "bot",
        text: "I couldn't find any suppliers matching your requirements within your budget and timeline. Would you like to modify your requirements or try a different search?",
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      setConversationState(prev => ({
        ...prev,
        stage: "initial",
      }));
    } else {
      const topSuppliers = potentialSuppliers.slice(0, 3);
      let supplierList = `Based on your requirements for ${procurementDetails.requirements.productType}, quantity of ${procurementDetails.quantity}, budget of ₹${procurementDetails.budget.toLocaleString()}, and timeline of "${procurementDetails.timeline}", here are the potential suppliers:\n\n`;
      topSuppliers.forEach((supplier, index) => {
        supplierList += `🏆 **Supplier ${index + 1}**\n` +
                        `🏢 **Name:** ${supplier.name}\n` +
                        `📍 **Location:** ${supplier.location}\n` +
                        `💰 **Price Range:** ₹${supplier.price.toLocaleString()}${supplier.items[0].includes('service') ? '/service' : '/unit'}\n` +
                        `⏱ **Delivery Time:** ${supplier.delivery_days} days\n` +
                        `⭐ **Rating:** ${supplier.rating}/5\n\n`;
      });
      supplierList += "Would you like to:\n1. Invite Supplier 1\n2. Invite Supplier 2\n3. Invite Supplier 3\n4. See more options\n5. Start a new search";
      const botReply = {
        from: "bot",
        text: supplierList,
        suppliers: topSuppliers,
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      setConversationState(prev => ({
        ...prev,
        stage: "supplier_selection",
        procurementDetails: updatedDetails,
        currentQuestion: null,
        questionsQueue: [],
      }));
    }
  };

  const handleSupplierSelection = async (userInput) => {
    const generalResponse = await handleGeneralInput(userInput);
    if (generalResponse) {
      if (generalResponse.shouldEnd) {
        setConversationState(prev => ({
          ...prev,
          stage: "initial"
        }));
      }
      return;
    }
    const numInput = parseInt(userInput);
    if (!isNaN(numInput)) {
      if (numInput >= 1 && numInput <= 3) {
        const selectedSupplier = conversationState.procurementDetails.suppliers[numInput - 1];
        let wocMessage = "";
        if (conversationState.procurementDetails.procurementMethod === "Open Tender") {
          wocMessage = "\n\nI've finalized the Waiver of Competition justification based on our conversation.";
        }
        const botReply = {
          from: "bot",
          text: `Excellent! I've invited ${selectedSupplier.name} to participate in this procurement.${wocMessage}\n\nYou can contact them directly at: ${selectedSupplier.contact || 'their provided contact method'}.\n\nIs there anything else I can help you with today?`,
          timestamp: new Date().toISOString(),
        };
        setMessages((msgs) => [...msgs, botReply]);
        if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
        setConversationState(prev => ({
          ...prev,
          stage: "initial",
        }));
      } else if (numInput === 4) {
        const nextSuppliers = conversationState.procurementDetails.suppliers.slice(3, 6);
        if (nextSuppliers.length === 0) {
          const botReply = {
            from: "bot",
            text: "No more suppliers available. Would you like to invite one of the previous options or start a new search?",
            timestamp: new Date().toISOString(),
          };
          setMessages((msgs) => [...msgs, botReply]);
          if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
          return;
        }
        let supplierList = "Here are more supplier options:\n\n";
        nextSuppliers.forEach((supplier, index) => {
          supplierList += `🏆 **Supplier ${index + 4}**\n` +
                          `🏢 **Name:** ${supplier.name}\n` +
                          `📍 **Location:** ${supplier.location}\n` +
                          `💰 **Price Range:** ₹${supplier.price.toLocaleString()}${supplier.items[0].includes('service') ? '/service' : '/unit'}\n` +
                          `⏱ **Delivery Time:** ${supplier.delivery_days} days\n` +
                          `⭐ **Rating:** ${supplier.rating}/5\n\n`;
        });
        supplierList += "Would you like to:\n1-3. Invite previous suppliers\n4-6. Invite these suppliers\n7. Start a new search";
        const botReply = {
          from: "bot",
          text: supplierList,
          suppliers: nextSuppliers,
          timestamp: new Date().toISOString(),
        };
        setMessages((msgs) => [...msgs, botReply]);
        if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
        setConversationState(prev => ({
          ...prev,
          procurementDetails: {
            ...prev.procurementDetails,
            suppliers: [...prev.procurementDetails.suppliers, ...nextSuppliers],
          },
        }));
      } else if (numInput === 5 || numInput === 7) {
        const botReply = {
          from: "bot",
          text: "No problem! Please describe what you'd like to procure again.",
          timestamp: new Date().toISOString(),
        };
        setMessages((msgs) => [...msgs, botReply]);
        if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
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
        });
      } else {
        const botReply = {
          from: "bot",
          text: "Please select a valid option (1-5).",
          timestamp: new Date().toISOString(),
        };
        setMessages((msgs) => [...msgs, botReply]);
        if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      }
    } else if (userInput.toLowerCase().match(/^(yes|proceed|invite)/)) {
      const selectedSupplier = conversationState.procurementDetails.suppliers[0];
      let wocMessage = "";
      if (conversationState.procurementDetails.procurementMethod === "Open Tender") {
        wocMessage = "\n\nI've finalized the Waiver of Competition justification based on our conversation.";
      }
      const botReply = {
        from: "bot",
        text: `Great! I've invited ${selectedSupplier.name} to participate in this procurement.${wocMessage}\n\nYou can contact them directly at: ${selectedSupplier.contact || 'their provided contact method'}.\n\nIs there anything else I can help you with today?`,
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      setConversationState(prev => ({
        ...prev,
        stage: "initial",
      }));
    } else if (userInput.toLowerCase().match(/^(no|other|different|explore)/)) {
      const botReply = {
        from: "bot",
        text: "Would you like to:\n1. See other supplier options\n2. Modify your requirements\n3. Start a new search",
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
      setConversationState(prev => ({
        ...prev,
        stage: "alternative_options",
      }));
    } else {
      const botReply = {
        from: "bot",
        text: "Please select an option (1-5) or say 'yes' to proceed with the first recommendation.",
        timestamp: new Date().toISOString(),
      };
      setMessages((msgs) => [...msgs, botReply]);
      if (selectedSessionId) await saveMessageToSession(selectedSessionId, botReply);
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
      switch (conversationState.stage) {
        case "initial":
          await handleInitialState(input);
          break;
        case "confirming_product":
          await handleGatheringRequirements(input);
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
        case "supplier_selection":
        case "alternative_options":
          await handleSupplierSelection(input);
          break;
        default:
          await handleInitialState(input);
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
      case "confirming_product":
        return "Please provide details to confirm the product...";
      case "asking_quantity":
        return "Enter the quantity needed...";
      case "asking_budget":
        return "Enter your total budget in ₹...";
      case "asking_timeline":
        return "Enter your desired timeline (e.g., 'ASAP', 'within 2 weeks')";
      case "supplier_selection":
        return "Select an option (1-5) or say 'yes' to proceed";
      case "alternative_options":
        return "Would you like to see other options or modify requirements?";
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
      case "confirming_product":
        return "Confirming product requirements";
      case "asking_quantity":
        return "Gathering quantity details";
      case "asking_budget":
        return "Gathering budget details";
      case "asking_timeline":
        return "Gathering timeline details";
      case "gathering_woc":
        return "Justifying Waiver of Competition";
      case "supplier_selection":
        return "Inviting suppliers";
      case "alternative_options":
        return "Exploring options";
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
              className={`max-w-[80%] p-4 mb-4 rounded-2xl shadow-lg animate_animated animate_fadeInUp ${
                msg.from === "user"
                  ? "ml-auto bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-none"
                  : "mr-auto bg-white/80 dark:bg-gray-800/80 text-gray-800 dark:text-gray-200 rounded-bl-none border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-lg"
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              {msg.suppliers && msg.suppliers.length > 0 && (
                <div className="mt-3 p-4 bg-gray-100/80 dark:bg-gray-700/80 rounded-lg border border-gray-200/50 dark:border-gray-600/50 backdrop-blur-sm">
                  <strong className="block mb-2 font-semibold text-gray-700 dark:text-gray-200">
                    Recommended Suppliers:
                  </strong>
                  <ul className="list-disc pl-5 text-sm">
                    {msg.suppliers.map((vendor, index) => (
                      <li key={index} className="mb-2">
                        <strong>Supplier {index + 1}:</strong> {vendor.name}<br />
                        <strong>Location:</strong> {vendor.location}<br />
                        <strong>Price:</strong> ₹{vendor.price.toLocaleString()}{vendor.items[0].includes('service') ? '/service' : '/unit'}<br />
                        <strong>Delivery:</strong> {vendor.delivery_days} days<br />
                        <strong>Rating:</strong> {vendor.rating}⭐
                        {vendor.contact && (
                          <><br /><strong>Contact:</strong> {vendor.contact}</>
                        )}
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
              name="chat-input" // <-- Add this line
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