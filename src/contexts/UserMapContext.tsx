'use client';

/**
 * UserMapContext - Community Map with opt-in features
 * 
 * Flow:
 * 1. User visits → sees map and pins
 * 2. Click "Join Chat" → can chat
 * 3. Click "Drop Pin" → location requested, pin dropped
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

const SERVER_URL = process.env.NEXT_PUBLIC_USERMAP_SERVER_URL || 'http://localhost:3002';

// Types
export interface Visitor {
  visitorId: string;
  nickname: string;
  coordinates: [number, number];
  firstVisit: string;
  lastSeen: string;
}

export interface Message {
  visitorId: string;
  nickname: string;
  text: string;
  timestamp: number;
}

interface UserMapContextValue {
  // Connection
  socket: Socket | null;
  isConnected: boolean;
  
  // User state
  visitorId: string;
  nickname: string;
  hasJoinedChat: boolean;
  hasDroppedPin: boolean;
  userCoordinates: [number, number] | null;
  isRequestingLocation: boolean;
  
  // Community data
  visitors: Visitor[];
  onlineIds: string[];
  activeMessages: Map<string, Message>; // For speech bubbles (6s timeout)
  chatMessages: Message[]; // Full persistent chat history
  
  // Actions
  joinChat: (nickname: string) => void;
  dropPin: () => void;
  setNickname: (nickname: string) => void;
  sendMessage: (text: string) => void;
}

const UserMapContext = createContext<UserMapContextValue | undefined>(undefined);

// LocalStorage helpers
function getStoredVisitorId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('usermap-visitor-id') || '';
}

function createVisitorId(): string {
  const newId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  if (typeof window !== 'undefined') {
    localStorage.setItem('usermap-visitor-id', newId);
  }
  return newId;
}

function getStoredNickname(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('usermap-nickname') || '';
}

function saveNickname(nickname: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('usermap-nickname', nickname);
  }
}

function getStoredChatStatus(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('usermap-joined-chat') === 'true';
}

function saveChatStatus(joined: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('usermap-joined-chat', String(joined));
  }
}

function getStoredPinStatus(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('usermap-dropped-pin') === 'true';
}

function savePinStatus(dropped: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('usermap-dropped-pin', String(dropped));
  }
}

export function UserMapProvider({ children }: { children: ReactNode }) {
  // Connection state
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // User state
  const [visitorId, setVisitorId] = useState<string>('');
  const [nickname, setNicknameState] = useState<string>('');
  const [hasJoinedChat, setHasJoinedChat] = useState(false);
  const [hasDroppedPin, setHasDroppedPin] = useState(false);
  const [userCoordinates, setUserCoordinates] = useState<[number, number] | null>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  
  // Community data
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [activeMessages, setActiveMessages] = useState<Map<string, Message>>(new Map()); // Speech bubbles
  const [chatMessages, setChatMessages] = useState<Message[]>([]); // Full history
  
  const messageTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const socketRef = useRef<Socket | null>(null);
  const hasEmittedJoin = useRef(false);

  // Load stored state on mount
  useEffect(() => {
    const storedId = getStoredVisitorId();
    const storedNickname = getStoredNickname();
    const storedChatStatus = getStoredChatStatus();
    const storedPinStatus = getStoredPinStatus();
    
    if (storedId) setVisitorId(storedId);
    if (storedNickname) setNicknameState(storedNickname);
    setHasJoinedChat(storedChatStatus);
    setHasDroppedPin(storedPinStatus);
  }, []);

  // Socket connection (always connect to see pins)
  useEffect(() => {
    if (socketRef.current) return;

    const newSocket = io(SERVER_URL, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('🔌 Connected to UserMap server');
      setIsConnected(true);
      hasEmittedJoin.current = false; // Reset on reconnect
      
      // Request initial data sync
      newSocket.emit('client:ready');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
    });

    // Initial sync with full message history
    newSocket.on('initial:sync', ({ visitors: allVisitors, onlineIds: currentOnlineIds, messages }) => {
      console.log('📥 Received initial sync:', allVisitors.length, 'visitors,', messages?.length || 0, 'messages');
      setVisitors(allVisitors);
      setOnlineIds(currentOnlineIds);
      
      // Load full message history
      if (messages && Array.isArray(messages)) {
        setChatMessages(messages);
      }
    });

    newSocket.on('visitor:online', ({ visitorId: visId, nickname: nick, coordinates }) => {
      setOnlineIds(prev => prev.includes(visId) ? prev : [...prev, visId]);
      setVisitors(prev => {
        const exists = prev.find(v => v.visitorId === visId);
        if (exists) {
          return prev.map(v => 
            v.visitorId === visId 
              ? { ...v, nickname: nick, coordinates, lastSeen: new Date().toISOString() }
              : v
          );
        }
        return [...prev, {
          visitorId: visId,
          nickname: nick,
          coordinates,
          firstVisit: new Date().toISOString(),
          lastSeen: new Date().toISOString()
        }];
      });
    });

    newSocket.on('visitor:offline', ({ visitorId: visId }) => {
      setOnlineIds(prev => prev.filter(id => id !== visId));
    });

    newSocket.on('visitor:updated', ({ visitorId: visId, nickname: nick }) => {
      setVisitors(prev => 
        prev.map(v => v.visitorId === visId ? { ...v, nickname: nick } : v)
      );
    });

    newSocket.on('message:broadcast', (message: Message) => {
      // Add to speech bubbles (6s timeout)
      setActiveMessages(prev => {
        const newMap = new Map(prev);
        newMap.set(message.visitorId, message);
        return newMap;
      });
      
      const existingTimeout = messageTimeoutsRef.current.get(message.visitorId);
      if (existingTimeout) clearTimeout(existingTimeout);
      
      const timeout = setTimeout(() => {
        setActiveMessages(prev => {
          const newMap = new Map(prev);
          newMap.delete(message.visitorId);
          return newMap;
        });
        messageTimeoutsRef.current.delete(message.visitorId);
      }, 6000);
      
      messageTimeoutsRef.current.set(message.visitorId, timeout);
      
      // Add to persistent chat history
      setChatMessages(prev => {
        const exists = prev.some(
          m => m.timestamp === message.timestamp && m.visitorId === message.visitorId
        );
        if (exists) return prev;
        return [...prev, message];
      });
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      messageTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      messageTimeoutsRef.current.clear();
      newSocket.close();
      socketRef.current = null;
    };
  }, []);

  // Emit join when user has dropped pin and we have coordinates
  useEffect(() => {
    if (
      hasDroppedPin &&
      userCoordinates &&
      socketRef.current &&
      isConnected &&
      visitorId
    ) {
      // Always emit visitor:join with updated coordinates
      // The server's upsertVisitor will update existing visitor
      socketRef.current.emit('visitor:join', {
        visitorId,
        nickname: nickname || 'Anonymous',
        coordinates: userCoordinates,
      });
      hasEmittedJoin.current = true;
    }
  }, [userCoordinates, hasDroppedPin, isConnected, visitorId, nickname]);

  // Join chat (no location needed)
  const joinChat = useCallback((chosenNickname: string) => {
    const nick = chosenNickname.trim() || 'Anonymous';
    const id = visitorId || createVisitorId();
    
    setVisitorId(id);
    setNicknameState(nick);
    setHasJoinedChat(true);
    
    saveNickname(nick);
    saveChatStatus(true);
  }, [visitorId]);

  // Drop pin (requests location)
  const dropPin = useCallback(() => {
    if (!navigator.geolocation) {
      alert('❌ Geolocation is not supported by your browser.\n\nYou can still chat without dropping a pin!');
      return;
    }

    setIsRequestingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [position.coords.longitude, position.coords.latitude];
        setUserCoordinates(coords);
        setHasDroppedPin(true);
        setIsRequestingLocation(false);
        savePinStatus(true);
        
        // Ensure we have a visitor ID
        if (!visitorId) {
          const id = createVisitorId();
          setVisitorId(id);
        }
      },
      (error) => {
        console.error('Location error:', error);
        setIsRequestingLocation(false);
        
        // Provide user-friendly error messages based on error code
        let errorMessage = '';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '📍 Location access was denied.\n\nTo drop your pin:\n1. Allow location access in your browser settings\n2. Refresh the page\n3. Click "Drop my pin" again\n\nYou can still chat without a pin!';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = '❌ Location information is unavailable.\n\nPlease check your device settings and try again.\n\nYou can still chat without a pin!';
            break;
          case error.TIMEOUT:
            errorMessage = '⏱️ Location request timed out.\n\nPlease try again in a moment.\n\nYou can still chat without a pin!';
            break;
          default:
            errorMessage = '❌ Could not get your location.\n\nPlease make sure location services are enabled and try again.\n\nYou can still chat without a pin!';
        }
        
        alert(errorMessage);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, [hasDroppedPin, visitorId]);

  // Update nickname
  const setNickname = useCallback((newNickname: string) => {
    const nick = newNickname.trim() || 'Anonymous';
    setNicknameState(nick);
    saveNickname(nick);
    
    if (hasDroppedPin && socketRef.current && isConnected && visitorId) {
      socketRef.current.emit('visitor:update', { visitorId, nickname: nick });
    }
  }, [hasDroppedPin, isConnected, visitorId]);

  // Send message
  const sendMessage = useCallback((text: string) => {
    if (!hasJoinedChat || !socketRef.current || !isConnected || !text.trim()) return;
    
    // Ensure we have a visitor ID for messages
    const id = visitorId || createVisitorId();
    if (!visitorId) setVisitorId(id);
    
    socketRef.current.emit('message:send', { visitorId: id, text: text.trim() });
  }, [hasJoinedChat, isConnected, visitorId]);

  return (
    <UserMapContext.Provider value={{
      socket,
      isConnected,
      visitorId,
      nickname,
      hasJoinedChat,
      hasDroppedPin,
      userCoordinates,
      isRequestingLocation,
      visitors,
      onlineIds,
      activeMessages,
      chatMessages,
      joinChat,
      dropPin,
      setNickname,
      sendMessage,
    }}>
      {children}
    </UserMapContext.Provider>
  );
}

export function useUserMap() {
  const context = useContext(UserMapContext);
  if (!context) {
    throw new Error('useUserMap must be used within a UserMapProvider');
  }
  return context;
}
