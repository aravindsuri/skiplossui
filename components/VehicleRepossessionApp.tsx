"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Send, Truck, Users, Mail, MapPin, Phone, Star, Loader2, Settings, Video, MoreHorizontal, Plus, Search, Bell, Grid3X3, ChevronDown, Trash2, Mic, MicOff, Volume2, VolumeX, Zap, Brain, TrendingUp, Calendar, AlertTriangle, Target, BarChart3, Clock, Shield } from 'lucide-react';

// Types
interface Vehicle {
  VIN: string;
  Make: string;
  Model: string;
  Year: number;
  CustomerID: string;
  Address: string;
  Country?: string;
  Region?: string;
  GoogleMapsLink?: string;
}

interface Agent {
  AgentID: number;
  Name: string;
  Phone: string;
  Email: string;
  Region: string;
  Specialty?: string;
  Country?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatConfig {
  openaiKey: string;
  endpoint: string;
  deploymentName: string;
  apiVersion: string;
}

interface AIInsight {
  id: string;
  type: 'prediction' | 'optimization' | 'alert' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  action?: string;
  timestamp: Date;
}

interface AutoAction {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  progress: number;
  result?: string;
}

const VehicleRepossessionApp: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [selectedVehicle, setSelectedVehicle] = useState<number>(0);
  const [selectedAgent, setSelectedAgent] = useState<number>(0);
  const [emailTemplate, setEmailTemplate] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [recognition, setRecognition] = useState<any>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [autoActions, setAutoActions] = useState<AutoAction[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [proactiveMode, setProactiveMode] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Azure OpenAI Configuration from environment variables
  const azureConfig = {
    openaiKey: process.env.NEXT_PUBLIC_AZURE_OPENAI_KEY || '',
    endpoint: process.env.NEXT_PUBLIC_AZURE_OPENAI_ENDPOINT || '',
    deploymentName: process.env.NEXT_PUBLIC_AZURE_OPENAI_DEPLOYMENT || 'gpt-4.1-mini',
    apiVersion: process.env.NEXT_PUBLIC_AZURE_OPENAI_API_VERSION || '2024-08-01-preview'
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check environment configuration on load
  useEffect(() => {
    const hasValidConfig = azureConfig.openaiKey && azureConfig.endpoint;
    
    if (!hasValidConfig) {
      console.warn('Azure OpenAI environment variables not configured properly');
      setShowConfig(true);
    } else {
      console.log('Azure OpenAI configuration loaded successfully');
    }
  }, []);

  // AI Agent - Generate insights when data changes
  useEffect(() => {
    if (vehicles.length > 0 || agents.length > 0) {
      generateAIInsights();
    }
  }, [vehicles, agents]);

  // AI Agent - Proactive monitoring
  useEffect(() => {
    if (proactiveMode) {
      const interval = setInterval(() => {
        if (vehicles.length > 0) {
          runProactiveAnalysis();
        }
      }, 30000); // Run every 30 seconds

      return () => clearInterval(interval);
    }
  }, [proactiveMode, vehicles]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check for different browser implementations
      const SpeechRecognition = (window as any).SpeechRecognition || 
                               (window as any).webkitSpeechRecognition || 
                               (window as any).mozSpeechRecognition || 
                               (window as any).msSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        
        // Configure recognition
        recognitionInstance.continuous = false; // Changed to false for better results
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = 'en-US';
        recognitionInstance.maxAlternatives = 1;
        
        recognitionInstance.onstart = () => {
          console.log('Speech recognition started');
          setIsListening(true);
        };
        
        recognitionInstance.onend = () => {
          console.log('Speech recognition ended');
          setIsListening(false);
          setInterimTranscript('');
        };
        
        recognitionInstance.onresult = (event: any) => {
          console.log('Speech recognition result:', event);
          let finalTranscript = '';
          let interim = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            console.log('Transcript part:', transcript, 'Final:', event.results[i].isFinal);
            
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interim += transcript;
            }
          }
          
          // Update interim transcript for live display
          setInterimTranscript(interim);
          
          // Add final transcript to input
          if (finalTranscript) {
            setInput(prev => {
              const newText = prev + (prev ? ' ' : '') + finalTranscript;
              console.log('Adding final transcript:', finalTranscript, 'New input:', newText);
              setInterimTranscript(''); // Clear interim when we have final text
              return newText;
            });
          }
        };
        
        recognitionInstance.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          setInterimTranscript('');
          
          // Show user-friendly error messages
          if (event.error === 'not-allowed') {
            alert('Microphone access denied. Please allow microphone permissions and try again.');
          } else if (event.error === 'no-speech') {
            console.log('No speech detected, trying again...');
          } else {
            alert(`Speech recognition error: ${event.error}`);
          }
        };
        
        recognitionInstance.onnomatch = () => {
          console.log('No speech match found');
        };
        
        recognitionInstance.onspeechstart = () => {
          console.log('Speech detected');
        };
        
        recognitionInstance.onspeechend = () => {
          console.log('Speech ended');
        };
        
        setRecognition(recognitionInstance);
        console.log('Speech recognition initialized successfully');
      } else {
        console.error('Speech recognition not supported in this browser');
      }
    }
  }, []);

  const saveConfig = (newConfig: ChatConfig) => {
    // Environment variables cannot be changed at runtime
    // This function is kept for UI compatibility but shows a message
    alert('Configuration is loaded from environment variables. Please update your .env file and restart the application.');
    setShowConfig(false);
  };

  // Azure Function calls
  const callAzureFunction = async (endpoint: string, params: Record<string, string>) => {
    const baseUrl = 'https://skiploss.azurewebsites.net';
    const url = new URL(`${baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });

    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check if the response contains an error
        if (data.error) {
          console.error(`Function error from ${endpoint}:`, data.error);
          return []; // Return empty array instead of throwing
        }
        
        return data;
      } catch (error) {
        console.error(`Error calling ${endpoint} (attempt ${attempt + 1}):`, error);
        if (attempt === maxRetries - 1) {
          console.error(`Failed to call ${endpoint} after ${maxRetries} attempts:`, error);
          return []; // Return empty array instead of throwing
        }
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  };

  const getSkipLossVehicles = async (country: string, region?: string) => {
    const params: Record<string, string> = { country };
    if (region) params.region = region;
    return await callAzureFunction('/api/get_skip_loss_vehicles', params);
  };

  const findRepossessionAgent = async (country: string, region?: string) => {
    const params: Record<string, string> = { country };
    if (region) params.region = region;
    return await callAzureFunction('/api/find_repossession_agent', params);
  };

  // OpenAI function calling
  const functions = [
    {
      type: 'function',
      function: {
        name: 'get_skip_loss_vehicles',
        description: 'Get Daimler trucks in skip loss status for a specific country and optional region',
        parameters: {
          type: 'object',
          properties: {
            country: {
              type: 'string',
              description: 'Country name (e.g., "Brazil", "Mexico", "Germany", "Spain")'
            },
            region: {
              type: 'string',
              description: 'State, province, or region within the country (optional)'
            }
          },
          required: ['country']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'find_repossession_agent',
        description: 'Find repossession agents specializing in Daimler trucks for a specific country and optional region',
        parameters: {
          type: 'object',
          properties: {
            country: {
              type: 'string',
              description: 'Country name (e.g., "Brazil", "Mexico", "Germany", "Spain")'
            },
            region: {
              type: 'string',
              description: 'State, province, or region within the country (optional)'
            }
          },
          required: ['country']
        }
      }
    }
  ];

  const executeFunctionCall = async (functionName: string, args: { country: string; region?: string }) => {
    try {
      if (functionName === 'get_skip_loss_vehicles') {
        const result = await getSkipLossVehicles(args.country, args.region);
        setVehicles(result || []);
        return result;
      } else if (functionName === 'find_repossession_agent') {
        const result = await findRepossessionAgent(args.country, args.region);
        setAgents(result || []);
        return result;
      }
      return { error: `Unknown function: ${functionName}` };
    } catch (error) {
      console.error(`Error executing ${functionName}:`, error);
      // Return empty array and continue instead of failing
      if (functionName === 'get_skip_loss_vehicles') {
        setVehicles([]);
      } else if (functionName === 'find_repossession_agent') {
        setAgents([]);
      }
      return [];
    }
  };

  const sendMessage = async () => {
    // Check if we have valid environment configuration
    const hasValidConfig = azureConfig.openaiKey && azureConfig.endpoint;
    
    if (!input.trim() || !hasValidConfig) {
      if (!hasValidConfig) {
        setShowConfig(true);
        return;
      }
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const systemMessage = {
        role: 'system',
        content: `You are a Daimler Truck Repossession Assistant that provides complete end-to-end service for truck repossession operations.

CORE PROCESS:
When a user asks about trucks in skip loss:
1. ALWAYS call get_skip_loss_vehicles(country, region) first to retrieve Daimler trucks
2. IMMEDIATELY follow with find_repossession_agent(country, region) using the same parameters
3. Present integrated results showing both trucks and available agents
4. Offer to generate contact emails for agents

IMPORTANT BEHAVIORS:
- Focus on Daimler truck models (Mercedes-Benz Actros, Atego, Arocs, Antos, Freightliner Cascadia)
- Always call BOTH functions for any location query
- Handle errors gracefully and inform users of any issues
- Focus on actionable next steps for truck repossession
- Be professional and concise
- When presenting data, mention that detailed tables will be shown below your response

Supported countries: Brazil, Mexico, Germany, and Spain.
The user interface will display formatted tables and additional features below your text response.`
      };

      const chatMessages = [
        systemMessage,
        ...messages.map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: input }
      ];

      const response = await fetch(`${azureConfig.endpoint}/openai/deployments/${azureConfig.deploymentName}/chat/completions?api-version=${azureConfig.apiVersion}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': azureConfig.openaiKey
        },
        body: JSON.stringify({
          messages: chatMessages,
          tools: functions,
          tool_choice: 'auto',
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage = data.choices[0].message;

      // Handle function calls
      if (assistantMessage.tool_calls) {
        const updatedMessages = [...chatMessages, assistantMessage];

        for (const toolCall of assistantMessage.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          
          const functionResult = await executeFunctionCall(functionName, functionArgs);
          
          updatedMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(functionResult)
          });
        }

        // Get final response
        const finalResponse = await fetch(`${azureConfig.endpoint}/openai/deployments/${azureConfig.deploymentName}/chat/completions?api-version=${azureConfig.apiVersion}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': azureConfig.openaiKey
          },
          body: JSON.stringify({
            messages: updatedMessages,
            temperature: 0.1
          })
        });

        const finalData = await finalResponse.json();
        const finalMessage: Message = {
          role: 'assistant',
          content: finalData.choices[0].message.content,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, finalMessage]);
        
        // Text-to-speech for assistant responses
        if (speechEnabled && finalMessage.content) {
          speakText(finalMessage.content);
        }
      } else {
        const assistantResponse: Message = {
          role: 'assistant',
          content: assistantMessage.content,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantResponse]);
        
        // Text-to-speech for assistant responses
        if (speechEnabled && assistantResponse.content) {
          speakText(assistantResponse.content);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const generateEmailTemplate = () => {
    if (vehicles.length === 0 || agents.length === 0) return;

    const vehicle = vehicles[selectedVehicle];
    const agent = agents[selectedAgent];

    const template = `Subject: Daimler Truck Repossession Request - ${vehicle.Make} ${vehicle.Model} (${vehicle.VIN})

Dear ${agent.Name},

I hope this email finds you well. We have a Daimler truck repossession request that matches your service area and expertise.

Vehicle Details:
- VIN: ${vehicle.VIN}
- Vehicle: ${vehicle.Make} ${vehicle.Model} ${vehicle.Year}
- Customer ID: ${vehicle.CustomerID}
- Location: ${vehicle.Address}
- Status: Skip Loss

Agent Specialty: ${agent.Specialty || 'General Truck Repossession'}

Location Information:
Address: ${vehicle.Address}
Google Maps: ${vehicle.GoogleMapsLink || `https://www.google.com/maps/search/${encodeURIComponent(vehicle.Address)}`}

Next Steps:
Please confirm your availability and provide an estimated timeline for this truck repossession. We can discuss compensation and any special requirements for this heavy-duty vehicle recovery.

Thank you for your prompt attention to this matter.

Best regards,
Daimler Truck Repossession Team`;

    setEmailTemplate(template);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setVehicles([]);
    setAgents([]);
    setEmailTemplate('');
  };

  const toggleListening = async () => {
    if (!recognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      console.log('Stopping speech recognition...');
      recognition.stop();
      setInterimTranscript('');
    } else {
      try {
        console.log('Starting speech recognition...');
        setInterimTranscript('');
        
        // Request microphone permission explicitly
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop()); // Stop the stream, we just needed permission
        }
        
        recognition.start();
      } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Unable to access microphone. Please check your browser settings and allow microphone access.');
      }
    }
  };

  const speakText = (text: string) => {
    if (!speechEnabled || !('speechSynthesis' in window)) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Clean up text for better speech
    const cleanText = text
      .replace(/VIN:/g, 'V I N:')
      .replace(/\b\d{4}\b/g, (match) => match.split('').join(' '))
      .replace(/[^\w\s.,!?-]/g, ' ')
      .substring(0, 500); // Limit length for performance
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    
    // Try to use a professional voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Professional') || 
      voice.name.includes('Enhanced') ||
      voice.lang.startsWith('en')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  };

  const toggleSpeech = () => {
    setSpeechEnabled(!speechEnabled);
    if (speechEnabled) {
      window.speechSynthesis.cancel();
    }
  };

  // AI Agent Functions
  const generateAIInsights = async () => {
    setIsAiThinking(true);
    
    // Simulate AI analysis
    setTimeout(() => {
      const insights: AIInsight[] = [];
      
      if (vehicles.length > 0) {
        // Predictive insights
        insights.push({
          id: 'pred-1',
          type: 'prediction',
          title: 'Recovery Time Prediction',
          description: `Based on location patterns, ${vehicles[0]?.Make} ${vehicles[0]?.Model} in ${vehicles[0]?.Country} has 85% chance of recovery within 72 hours.`,
          confidence: 85,
          impact: 'high',
          action: 'Deploy agent immediately',
          timestamp: new Date()
        });

        // Optimization recommendations
        insights.push({
          id: 'opt-1',
          type: 'optimization',
          title: 'Route Optimization',
          description: `Detected ${vehicles.length} vehicles in same region. Recommend multi-vehicle recovery mission to reduce costs by 40%.`,
          confidence: 92,
          impact: 'medium',
          action: 'Create batch assignment',
          timestamp: new Date()
        });

        // Risk alerts
        if (vehicles.length > 3) {
          insights.push({
            id: 'alert-1',
            type: 'alert',
            title: 'High Volume Alert',
            description: `Unusual spike in skip loss cases detected in ${vehicles[0]?.Country}. May indicate systematic issue.`,
            confidence: 78,
            impact: 'high',
            action: 'Investigate root cause',
            timestamp: new Date()
          });
        }
      }

      if (agents.length > 0) {
        insights.push({
          id: 'rec-1',
          type: 'recommendation',
          title: 'Agent Performance Match',
          description: `Agent ${agents[0]?.Name} has 94% success rate with ${vehicles[0]?.Make} vehicles. Optimal assignment detected.`,
          confidence: 94,
          impact: 'medium',
          timestamp: new Date()
        });
      }

      setAiInsights(insights);
      setIsAiThinking(false);
    }, 2000);
  };

  const runProactiveAnalysis = () => {
    // Simulate real-time monitoring
    const newInsight: AIInsight = {
      id: `proactive-${Date.now()}`,
      type: 'alert',
      title: 'Real-time Update',
      description: `Vehicle ${vehicles[0]?.VIN.slice(-6)} location updated. Moving towards highway - recommend immediate contact.`,
      confidence: 87,
      impact: 'high',
      action: 'Contact agent now',
      timestamp: new Date()
    };

    setAiInsights(prev => [newInsight, ...prev.slice(0, 4)]);
  };

  const executeAutoAction = async (action: string, insightId: string) => {
    const newAction: AutoAction = {
      id: `action-${Date.now()}`,
      name: action,
      description: `Executing: ${action}`,
      status: 'executing',
      progress: 0
    };

    setAutoActions(prev => [newAction, ...prev]);

    // Simulate execution progress
    const progressInterval = setInterval(() => {
      setAutoActions(prev => 
        prev.map(a => 
          a.id === newAction.id 
            ? { ...a, progress: Math.min(a.progress + 20, 100) }
            : a
        )
      );
    }, 500);

    // Complete after 3 seconds
    setTimeout(() => {
      clearInterval(progressInterval);
      setAutoActions(prev => 
        prev.map(a => 
          a.id === newAction.id 
            ? { 
                ...a, 
                status: 'completed' as const, 
                progress: 100,
                result: `${action} completed successfully. Email sent to agent with vehicle details and priority assignment.`
              }
            : a
        )
      );

      // Add success message to chat
      const successMessage: Message = {
        role: 'assistant',
        content: `🤖 AI Agent Action Completed: ${action}\n\nResult: Email automatically sent to optimal agent with vehicle details, location coordinates, and priority assignment. Agent notified via SMS. Expected response time: 15 minutes.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, successMessage]);

      if (speechEnabled) {
        speakText(`Action completed: ${action}`);
      }
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Teams-style Top Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>

        {/* AI Insights Panel */}
        {aiInsights.length > 0 && (
          <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  <span>AI Insights</span>
                </h2>
                {isAiThinking && (
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {aiInsights.map((insight) => (
                <div key={insight.id} className={`p-4 rounded-lg border-l-4 ${
                  insight.type === 'alert' ? 'border-red-500 bg-red-50' :
                  insight.type === 'prediction' ? 'border-blue-500 bg-blue-50' :
                  insight.type === 'optimization' ? 'border-green-500 bg-green-50' :
                  'border-purple-500 bg-purple-50'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {insight.type === 'alert' && <AlertTriangle className="w-4 h-4 text-red-600" />}
                      {insight.type === 'prediction' && <TrendingUp className="w-4 h-4 text-blue-600" />}
                      {insight.type === 'optimization' && <Target className="w-4 h-4 text-green-600" />}
                      {insight.type === 'recommendation' && <Star className="w-4 h-4 text-purple-600" />}
                      <span className={`text-xs font-medium uppercase tracking-wide ${
                        insight.type === 'alert' ? 'text-red-600' :
                        insight.type === 'prediction' ? 'text-blue-600' :
                        insight.type === 'optimization' ? 'text-green-600' :
                        'text-purple-600'
                      }`}>
                        {insight.type}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      insight.impact === 'high' ? 'bg-red-100 text-red-700' :
                      insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {insight.impact} impact
                    </span>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-1">{insight.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>Confidence: {insight.confidence}%</span>
                    <span>{insight.timestamp.toLocaleTimeString()}</span>
                  </div>
                  
                  {insight.action && (
                    <button
                      onClick={() => executeAutoAction(insight.action!, insight.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        insight.type === 'alert' ? 'bg-red-600 text-white hover:bg-red-700' :
                        insight.type === 'prediction' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                        insight.type === 'optimization' ? 'bg-green-600 text-white hover:bg-green-700' :
                        'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Zap className="w-4 h-4" />
                        <span>{insight.action}</span>
                      </div>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Auto Actions Status */}
            {autoActions.length > 0 && (
              <div className="border-t border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Automated Actions</h3>
                <div className="space-y-2">
                  {autoActions.slice(0, 3).map((action) => (
                    <div key={action.id} className="p-2 bg-gray-50 rounded text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{action.name}</span>
                        <span className={`px-2 py-1 rounded ${
                          action.status === 'executing' ? 'bg-blue-100 text-blue-700' :
                          action.status === 'completed' ? 'bg-green-100 text-green-700' :
                          action.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {action.status}
                        </span>
                      </div>
                      {action.status === 'executing' && (
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${action.progress}%` }}
                          ></div>
                        </div>
                      )}
                      {action.result && (
                        <p className="text-gray-600 mt-1">{action.result}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
            <span className="font-semibold text-gray-900">Daimler Truck Operations</span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 w-64"
            />
          </div>
          <button className="p-1.5 hover:bg-gray-100 rounded">
            <Bell className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-1.5 hover:bg-gray-100 rounded">
            <Grid3X3 className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => setShowConfig(true)}
            className="p-1.5 hover:bg-gray-100 rounded"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">DT</span>
          </div>
        </div>
      </div>

      {/* Configuration Modal - Now shows environment variable info */}
      {showConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Environment Configuration Required</h2>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Azure OpenAI Environment Variables Not Found
                  </h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    Please configure your environment variables to use this application.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Required Environment Variables:</h3>
                <div className="bg-gray-100 rounded-md p-3 font-mono text-sm space-y-1">
                  <div>REACT_APP_AZURE_OPENAI_KEY=your_api_key_here</div>
                  <div>REACT_APP_AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com</div>
                  <div>REACT_APP_AZURE_OPENAI_DEPLOYMENT=gpt-4</div>
                  <div>REACT_APP_AZURE_OPENAI_API_VERSION=2024-02-01</div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Setup Instructions:</h3>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Create a <code className="bg-gray-100 px-1 rounded">.env</code> file in your project root</li>
                  <li>Add the environment variables listed above with your actual values</li>
                  <li>Restart your development server</li>
                  <li>Refresh this page</li>
                </ol>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>Current Status:</strong>
                </p>
                <ul className="text-xs text-blue-700 mt-1 space-y-1">
                  <li>API Key: {azureConfig.openaiKey ? '✅ Configured' : '❌ Missing'}</li>
                  <li>Endpoint: {azureConfig.endpoint ? '✅ Configured' : '❌ Missing'}</li>
                  <li>Deployment: {azureConfig.deploymentName ? '✅ Configured' : '❌ Missing'}</li>
                  <li>API Version: {azureConfig.apiVersion ? '✅ Configured' : '❌ Missing'}</li>
                </ul>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors font-medium"
              >
                Refresh Page
              </button>
              <button
                onClick={() => setShowConfig(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors font-medium"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex">
        {/* Left Sidebar - Teams style */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-4 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'chat'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setActiveTab('data')}
                className={`px-4 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'data'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Data
              </button>
              <button
                onClick={() => setActiveTab('actions')}
                className={`px-4 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'actions'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Actions
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'chat' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Quick Commands</h3>
                  <Plus className="w-4 h-4 text-gray-400" />
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => setInput("Show me trucks in Brazil")}
                    className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🇧🇷</span>
                      <span className="font-medium">Brazil Operations</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">View trucks in skip loss</div>
                  </button>
                  <button
                    onClick={() => setInput("Find trucks and agents in Mexico")}
                    className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🇲🇽</span>
                      <span className="font-medium">Mexico Operations</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Trucks & agents overview</div>
                  </button>
                  <button
                    onClick={() => setInput("Show me all trucks in Germany")}
                    className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🇩🇪</span>
                      <span className="font-medium">Germany Operations</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">View all German trucks</div>
                  </button>
                  <button
                    onClick={() => setInput("Find trucks and agents in Spain")}
                    className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🇪🇸</span>
                      <span className="font-medium">Spain Operations</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Complete Spain overview</div>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Live Statistics</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Truck className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium">Trucks</span>
                      </div>
                      <span className="text-lg font-bold text-blue-600">{vehicles.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium">Agents</span>
                      </div>
                      <span className="text-lg font-bold text-green-600">{agents.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Brain className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium">AI Insights</span>
                      </div>
                      <span className="text-lg font-bold text-purple-600">{aiInsights.length}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">AI Status</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3 p-2 rounded">
                      <div className={`w-2 h-2 rounded-full ${proactiveMode ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span className="text-sm">Proactive Monitoring</span>
                    </div>
                    <div className="flex items-center space-x-3 p-2 rounded">
                      <div className={`w-2 h-2 rounded-full ${isAiThinking ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'}`}></div>
                      <span className="text-sm">AI Analysis</span>
                    </div>
                    <div className="flex items-center space-x-3 p-2 rounded">
                      <div className={`w-2 h-2 rounded-full ${autoActions.some(a => a.status === 'executing') ? 'bg-orange-500 animate-pulse' : 'bg-gray-400'}`}></div>
                      <span className="text-sm">Auto Actions</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Supported Regions</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3 p-2 rounded">
                      <span className="text-lg">🇧🇷</span>
                      <div>
                        <div className="text-sm font-medium">Brazil</div>
                        <div className="text-xs text-gray-500">5 regions active</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-2 rounded">
                      <span className="text-lg">🇲🇽</span>
                      <div>
                        <div className="text-sm font-medium">Mexico</div>
                        <div className="text-xs text-gray-500">3 regions active</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-2 rounded">
                      <span className="text-lg">🇩🇪</span>
                      <div>
                        <div className="text-sm font-medium">Germany</div>
                        <div className="text-xs text-gray-500">4 regions active</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-2 rounded">
                      <span className="text-lg">🇪🇸</span>
                      <div>
                        <div className="text-sm font-medium">Spain</div>
                        <div className="text-xs text-gray-500">4 regions active</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'actions' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Quick Actions</h3>
                  <div className="space-y-2">
                    <button 
                      onClick={clearChat}
                      className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                    >
                      <div className="font-medium">Clear Chat</div>
                      <div className="text-xs text-gray-500">Reset conversation & data</div>
                    </button>
                    <button 
                      onClick={toggleSpeech}
                      className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                    >
                      <div className="font-medium">{speechEnabled ? 'Disable' : 'Enable'} Voice Output</div>
                      <div className="text-xs text-gray-500">Toggle text-to-speech responses</div>
                    </button>
                    <button 
                      onClick={toggleListening}
                      className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                    >
                      <div className="font-medium">{isListening ? 'Stop' : 'Start'} Voice Input</div>
                      <div className="text-xs text-gray-500">Use speech-to-text input</div>
                    </button>
                    <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm">
                      <div className="font-medium">Generate Report</div>
                      <div className="text-xs text-gray-500">Create summary report</div>
                    </button>
                    <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm">
                      <div className="font-medium">Export Data</div>
                      <div className="text-xs text-gray-500">Download current dataset</div>
                    </button>
                    <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm">
                      <div className="font-medium">Schedule Meeting</div>
                      <div className="text-xs text-gray-500">Plan team discussion</div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Truck className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Skip Loss Assistant</h1>
                  <p className="text-sm text-gray-500">Daimler Truck Repossession Operations</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={toggleSpeech}
                  className={`p-2 hover:bg-gray-100 rounded-md ${speechEnabled ? 'text-purple-600' : 'text-gray-400'}`}
                  title={speechEnabled ? 'Disable voice output' : 'Enable voice output'}
                >
                  {speechEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
                <button 
                  onClick={() => setProactiveMode(!proactiveMode)}
                  className={`p-2 hover:bg-gray-100 rounded-md ${proactiveMode ? 'text-blue-600' : 'text-gray-400'}`}
                  title={proactiveMode ? 'Disable AI proactive mode' : 'Enable AI proactive mode'}
                >
                  <Brain className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-md">
                  <Video className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-md">
                  <Phone className="w-5 h-5 text-gray-600" />
                </button>
                <button 
                  onClick={clearChat}
                  className="p-2 hover:bg-gray-100 rounded-md"
                  title="Clear chat"
                >
                  <Trash2 className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-md">
                  <MoreHorizontal className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Truck className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to Skip Loss Assistant</h3>
                <p className="text-gray-500 mb-4">Ask about Daimler trucks in skip loss status</p>
                <div className="inline-flex items-center space-x-2 text-sm text-gray-400">
                  <span>Try:</span>
                  <span className="bg-white px-2 py-1 rounded border">"Show me trucks in Brazil"</span>
                </div>
              </div>
            )}

            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-2xl ${message.role === 'user' ? 'ml-12' : 'mr-12'}`}>
                    <div className={`flex items-start space-x-3 ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.role === 'user' 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {message.role === 'user' ? (
                          <span className="text-sm font-medium">U</span>
                        ) : (
                          <Truck className="w-4 h-4" />
                        )}
                      </div>
                      <div className={`rounded-lg px-4 py-3 ${
                        message.role === 'user' 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-white border border-gray-200 text-gray-900'
                      }`}>
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                        <div className={`text-xs mt-2 ${
                          message.role === 'user' ? 'text-purple-200' : 'text-gray-500'
                        }`}>
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-3 mr-12">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <Truck className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end space-x-3">
                <button
                  onClick={toggleListening}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    isListening 
                      ? 'bg-red-500 border-red-500 text-white animate-pulse' 
                      : 'bg-white border-gray-300 text-gray-600 hover:border-purple-500 hover:text-purple-600'
                  }`}
                  title={isListening ? 'Stop voice input' : 'Start voice input'}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="text"
                      value={input + (isListening && interimTranscript ? ` ${interimTranscript}` : '')}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={isListening ? "Listening... speak now" : "Type a message about truck operations..."}
                      className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none ${
                        isListening ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      disabled={loading || !azureConfig.openaiKey || !azureConfig.endpoint}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={loading || !input.trim() || !azureConfig.openaiKey || !azureConfig.endpoint}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                  {(!azureConfig.openaiKey || !azureConfig.endpoint) && (
                    <p className="text-sm text-red-600 mt-2">
                      Please configure your Azure OpenAI environment variables first 
                      <button 
                        onClick={() => setShowConfig(true)}
                        className="text-purple-600 hover:text-purple-700 underline ml-1"
                      >
                        (see setup instructions)
                      </button>
                    </p>
                  )}
                  {isListening && (
                    <div className="text-sm mt-2 space-y-1">
                      <div className="text-red-600 flex items-center">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                        Voice input active - speak clearly into your microphone
                      </div>
                      {interimTranscript && (
                        <div className="text-blue-600 italic">
                          Hearing: "{interimTranscript}"
                        </div>
                      )}
                      {!interimTranscript && isListening && (
                        <div className="text-gray-500 text-xs">
                          Waiting for speech... Make sure your microphone is working
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Tables - Teams style panels */}
      {(vehicles.length > 0 || agents.length > 0) && (
        <div className="bg-white border-t border-gray-200 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Vehicles Table */}
            {vehicles.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                    <Truck className="w-5 h-5 text-purple-600" />
                    <span>Daimler Trucks in Skip Loss Status</span>
                  </h2>
                  <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                    Export All
                  </button>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VIN</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Truck</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {vehicles.map((vehicle, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-mono text-gray-900">{vehicle.VIN}</td>
                          <td className="px-6 py-4 text-sm text-gray-900 font-medium">{vehicle.Make} {vehicle.Model} {vehicle.Year}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{vehicle.CustomerID}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{vehicle.Address}</td>
                          <td className="px-6 py-4 text-sm">
                            <a
                              href={vehicle.GoogleMapsLink || `https://www.google.com/maps/search/${encodeURIComponent(vehicle.Address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 text-purple-600 hover:text-purple-800 font-medium"
                            >
                              <MapPin className="w-4 h-4" />
                              <span>View Map</span>
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Agents Table */}
            {agents.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                    <Users className="w-5 h-5 text-green-600" />
                    <span>Available Repossession Agents</span>
                  </h2>
                  <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                    Contact All
                  </button>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialty</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {agents.map((agent, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                                <span className="text-sm font-medium text-gray-700">
                                  {agent.Name.split(' ').map(n => n[0]).join('')}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{agent.Name}</div>
                                <div className="text-sm text-gray-500">{agent.Email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{agent.Phone}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{agent.Region}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{agent.Specialty || 'General'}</td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex items-center">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className="ml-1 text-gray-600">4.5</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <button className="text-purple-600 hover:text-purple-800 font-medium">
                              Contact
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Email Generation Panel */}
            {vehicles.length > 0 && agents.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                    <Mail className="w-5 h-5 text-orange-600" />
                    <span>Email Template Generator</span>
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select Truck:</label>
                      <select
                        value={selectedVehicle}
                        onChange={(e) => setSelectedVehicle(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        {vehicles.map((vehicle, index) => (
                          <option key={index} value={index}>
                            {vehicle.VIN} - {vehicle.Make} {vehicle.Model}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select Agent:</label>
                      <select
                        value={selectedAgent}
                        onChange={(e) => setSelectedAgent(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        {agents.map((agent, index) => (
                          <option key={index} value={index}>
                            {agent.Name} - {agent.Region}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={generateEmailTemplate}
                    className="mb-4 px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium"
                  >
                    Generate Email Template
                  </button>
                  {emailTemplate && (
                    <textarea
                      value={emailTemplate}
                      onChange={(e) => setEmailTemplate(e.target.value)}
                      className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
                      placeholder="Email template will appear here..."
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleRepossessionApp;