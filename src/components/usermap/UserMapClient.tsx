'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useUserMap, Message } from '@/contexts/UserMapContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function UserMapClient() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupsRef = useRef<Map<string, mapboxgl.Popup>>(new Map());
  const infoPopupRef = useRef<mapboxgl.Popup | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const {
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
  } = useUserMap();
  
  // Local state
  const [joinNickname, setJoinNickname] = useState('');
  const [nicknameInput, setNicknameInput] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [showPinSuccess, setShowPinSuccess] = useState(false);
  const [showNameSuccess, setShowNameSuccess] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync nickname input with context
  useEffect(() => {
    if (nickname) {
      setNicknameInput(nickname);
    }
  }, [nickname]);

  // Auto-scroll chat when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Show pin success animation when pin is dropped
  useEffect(() => {
    if (hasDroppedPin) {
      setShowPinSuccess(true);
      const timer = setTimeout(() => setShowPinSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [hasDroppedPin]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize Mapbox
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [-98.5795, 39.8283],
      zoom: 3,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    
    map.on('load', () => {
      // Add GeoJSON source for visitors
      map.addSource('visitors', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      // Layer for "you" (blue)
      map.addLayer({
        id: 'visitors-you',
        type: 'circle',
        source: 'visitors',
        filter: ['==', ['get', 'type'], 'you'],
        paint: {
          'circle-radius': 8,
          'circle-color': '#3b82f6',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#1d4ed8',
        }
      });

      // Layer for online (green)
      map.addLayer({
        id: 'visitors-online',
        type: 'circle',
        source: 'visitors',
        filter: ['==', ['get', 'type'], 'online'],
        paint: {
          'circle-radius': 6,
          'circle-color': '#22c55e',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        }
      });

      // Layer for offline (red)
      map.addLayer({
        id: 'visitors-offline',
        type: 'circle',
        source: 'visitors',
        filter: ['==', ['get', 'type'], 'offline'],
        paint: {
          'circle-radius': 5,
          'circle-color': '#f87171',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        }
      });

      // Click handlers for all layers
      ['visitors-you', 'visitors-online', 'visitors-offline'].forEach(layerId => {
        map.on('click', layerId, (e) => {
          if (!e.features || !e.features[0]) return;
          
          const feature = e.features[0];
          const props = feature.properties;
          if (!props) return;

          if (infoPopupRef.current) {
            infoPopupRef.current.remove();
          }

          const label = props.type === 'you' ? 'You' : props.nickname;
          const isOnline = props.type === 'online' || props.type === 'you';

          infoPopupRef.current = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: true,
            offset: 12,
            className: 'visitor-info-popup',
          })
            .setLngLat([props.lng, props.lat])
            .setHTML(`
              <div class="visitor-info-bubble">
                <div class="visitor-status ${isOnline ? 'online' : 'offline'}"></div>
                <span>${escapeHtml(label)}</span>
              </div>
            `)
            .addTo(map);
        });

        // Change cursor on hover
        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = '';
        });
      });

      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      if (infoPopupRef.current) {
        infoPopupRef.current.remove();
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Fly to user location when pin dropped
  useEffect(() => {
    if (mapRef.current && userCoordinates && mapLoaded && hasDroppedPin) {
      mapRef.current.flyTo({ center: userCoordinates, zoom: 6, speed: 1.5 });
    }
  }, [userCoordinates, mapLoaded, hasDroppedPin]);

  // Update visitor pins (GeoJSON)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const map = mapRef.current;
    const source = map.getSource('visitors') as mapboxgl.GeoJSONSource;
    if (!source) return;

    // Convert visitors to GeoJSON features
    const features = visitors
      .filter(visitor => {
        // Comprehensive coordinate validation
        if (!visitor.coordinates || 
            !Array.isArray(visitor.coordinates) || 
            visitor.coordinates.length !== 2) {
          return false;
        }

        const [lng, lat] = visitor.coordinates;
        
        // Check for valid numbers
        if (typeof lng !== 'number' || typeof lat !== 'number' ||
            !Number.isFinite(lng) || !Number.isFinite(lat)) {
          console.warn('⚠️ Invalid coordinates for visitor:', visitor.visitorId, visitor.coordinates);
          return false;
        }

        // Check valid ranges
        if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
          console.warn('⚠️ Out of range coordinates:', visitor.visitorId, visitor.coordinates);
          return false;
        }

        return true;
      })
      .map((visitor, index) => {
        const isOnline = onlineIds.includes(visitor.visitorId);
        const isMe = visitor.visitorId === visitorId;
        
        let type = 'offline';
        if (isMe) type = 'you';
        else if (isOnline) type = 'online';

        return {
          type: 'Feature' as const,
          id: index, // Required for feature state
          geometry: {
            type: 'Point' as const,
            coordinates: visitor.coordinates
          },
          properties: {
            visitorId: visitor.visitorId,
            nickname: visitor.nickname,
            type,
            lng: visitor.coordinates[0],
            lat: visitor.coordinates[1]
          }
        };
      });

    // Update GeoJSON source
    source.setData({
      type: 'FeatureCollection',
      features
    });
  }, [visitors, onlineIds, visitorId, mapLoaded]);

  // Show speech bubbles
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    popupsRef.current.forEach((popup, visId) => {
      if (!activeMessages.has(visId)) {
        popup.remove();
        popupsRef.current.delete(visId);
      }
    });

    activeMessages.forEach((message, visId) => {
      const visitor = visitors.find(v => v.visitorId === visId);
      if (!visitor) return;

      const isMe = visId === visitorId;
      let popup = popupsRef.current.get(visId);

      if (!popup) {
        popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          className: 'usermap-speech-bubble',
          offset: [0, -20],
          anchor: 'bottom',
        });
        popupsRef.current.set(visId, popup);
      }

      popup
        .setLngLat(visitor.coordinates)
        .setHTML(`
          <div class="bubble-container ${isMe ? 'bubble-me' : 'bubble-other'}">
            <div class="bubble-name">${escapeHtml(message.nickname)}</div>
            <div class="bubble-text">${escapeHtml(message.text)}</div>
          </div>
        `)
        .addTo(map);
    });
  }, [activeMessages, visitors, visitorId, mapLoaded]);

  // Handlers
  const handleJoinChat = () => {
    joinChat(joinNickname);
  };

  const handleNicknameUpdate = useCallback(() => {
    if (!nicknameInput.trim()) return;
    setNickname(nicknameInput.trim());
    setNicknameInput('');
    setShowNameModal(false);
    setShowMenu(false);
  }, [nicknameInput, setNickname]);

  const handleDropPinAgain = useCallback(() => {
    setShowMenu(false);
    dropPin();
  }, [dropPin]);

  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim()) {
      sendMessage(messageInput);
      setMessageInput('');
    }
  }, [messageInput, sendMessage]);

  const onlineCount = onlineIds.length;
  const offlineCount = visitors.length - onlineCount;

  return (
    <div className="fixed inset-0 mt-[72px] h-[calc(100vh-72px)] w-full flex flex-col lg:flex-row overflow-hidden">
      
      {/* Map Section */}
      <div className="relative flex-1 min-h-[40vh] lg:min-h-full">
        <div 
          ref={mapContainerRef} 
          className="absolute inset-0 bg-gray-200 w-full h-full"
          style={{ minHeight: '300px' }}
        />

        {/* Connection Badge */}
        <div className="absolute top-3 left-3 z-10">
          <div className={`px-2.5 py-1 rounded-full text-xs font-semibold shadow-lg ${
            isConnected ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {isConnected ? '● Live' : '○ Connecting...'}
          </div>
        </div>

        {/* Stats */}
        <div className="absolute top-3 right-3 z-10 lg:right-14">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2 flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              {onlineCount}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              {offlineCount}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-10">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg px-2.5 py-2 text-xs space-y-1">
            {hasDroppedPin && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 border border-blue-700"></span>
                <span>You</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span>Online</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              <span>Previous</span>
            </div>
          </div>
        </div>

        {/* Mobile chat toggle - only show when chat is closed */}
        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            className="lg:hidden absolute bottom-3 right-3 z-10 bg-brand-green text-white p-3 rounded-full shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        )}
      </div>

      {/* Chat Panel */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:w-80 xl:w-96 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col max-h-[60vh] lg:max-h-full"
          >
            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div>
                <h2 className="font-semibold text-gray-900 text-sm">Community Map & Chat</h2>
                <p className="text-xs text-gray-500">{onlineCount} visitors online</p>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="lg:hidden p-1.5 rounded-lg hover:bg-gray-200 text-gray-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Join/User Section */}
            <div className="px-3 py-3 border-b border-gray-100 bg-gray-50/50 space-y-2">
              {!hasJoinedChat ? (
                // Join Chat Form
                <div className="space-y-2">
                  <input
                    type="text"
                    value={joinNickname}
                    onChange={(e) => setJoinNickname(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinChat()}
                    placeholder="Enter a nickname..."
                    maxLength={20}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none"
                  />
                  <button
                    onClick={handleJoinChat}
                    className="w-full py-2 bg-brand-green hover:bg-brand-green-light text-white font-semibold rounded-lg transition-colors text-sm"
                  >
                    Join Chat 💬
                  </button>
                </div>
              ) : (
                // User Info + Menu
                <div className="space-y-2">
                  {/* User name + menu button */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-brand-green flex items-center justify-center text-white font-semibold text-sm">
                        {nickname.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-gray-900">{nickname}</span>
                    </div>
                    
                    <div className="relative" ref={menuRef}>
                      <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                        </svg>
                      </button>
                      
                      {/* Dropdown Menu */}
                      <AnimatePresence>
                        {showMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                          >
                            <button
                              onClick={() => {
                                setShowNameModal(true);
                                setShowMenu(false);
                              }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Change name
                            </button>
                            {hasDroppedPin && (
                              <button
                                onClick={handleDropPinAgain}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Drop pin in new spot
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Drop Pin Button (only show if haven't dropped yet) */}
                  {!hasDroppedPin && !showPinSuccess && (
                    <button
                      onClick={dropPin}
                      disabled={isRequestingLocation}
                      className="w-full py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      {isRequestingLocation ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          Getting location...
                        </>
                      ) : (
                        <>📍 Drop my pin on the map</>
                      )}
                    </button>
                  )}
                  
                  {/* Pin Success Message */}
                  {showPinSuccess && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-full py-2 bg-green-500 text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2"
                    >
                      <span className="text-lg">✓</span> Pin dropped successfully!
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* Change Name Modal */}
            <AnimatePresence>
              {showNameModal && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 z-[100]"
                    onClick={() => setShowNameModal(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-xl shadow-2xl z-[101] p-6 space-y-4"
                  >
                    <h3 className="text-lg font-bold text-gray-900">Change your name</h3>
                    <input
                      type="text"
                      value={nicknameInput}
                      onChange={(e) => setNicknameInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleNicknameUpdate()}
                      placeholder="Enter new nickname..."
                      maxLength={20}
                      autoFocus
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowNameModal(false)}
                        className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleNicknameUpdate}
                        disabled={!nicknameInput.trim()}
                        className="flex-1 py-2 px-4 bg-brand-green hover:bg-brand-green-light disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors text-sm"
                      >
                        Save
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[120px] lg:min-h-0">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 py-8">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-xs">No messages yet</p>
                  <p className="text-xs">Be the first to say hi!</p>
                </div>
              ) : (
                chatMessages.map((msg, idx) => {
                  const isMe = msg.visitorId === visitorId;
                  return (
                    <motion.div
                      key={`${msg.timestamp}-${idx}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[10px] text-gray-400 mb-0.5 px-1">
                        {msg.nickname}
                      </span>
                      <div className={`max-w-[85%] px-3 py-1.5 rounded-2xl text-sm ${
                        isMe 
                          ? 'bg-brand-green text-white rounded-br-md' 
                          : 'bg-gray-100 text-gray-800 rounded-bl-md'
                      }`}>
                        {msg.text}
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Message Input */}
            {hasJoinedChat ? (
              <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Say something..."
                    maxLength={150}
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!messageInput.trim() || !isConnected}
                    className="px-4 py-2 bg-brand-green hover:bg-brand-green-light disabled:bg-gray-200 text-white disabled:text-gray-400 rounded-xl text-sm font-medium transition-colors disabled:cursor-not-allowed"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-3 border-t border-gray-100 bg-gray-50 text-center">
                <p className="text-xs text-gray-500">Join the chat to send messages</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Speech Bubble Styles */}
      <style jsx global>{`
        .usermap-speech-bubble { z-index: 100 !important; }
        .usermap-speech-bubble .mapboxgl-popup-content {
          padding: 0; background: transparent; box-shadow: none;
        }
        .usermap-speech-bubble .mapboxgl-popup-tip { display: none; }
        .bubble-container {
          background: white;
          border-radius: 16px;
          padding: 8px 14px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          max-width: 220px;
          animation: bubbleFloat 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          position: relative;
        }
        .bubble-container::after {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-top: 10px solid white;
        }
        .bubble-me { background: linear-gradient(135deg, #1F3F28 0%, #2A5637 100%); }
        .bubble-me::after { border-top-color: #2A5637; }
        .bubble-me .bubble-name { color: rgba(255,255,255,0.7); }
        .bubble-me .bubble-text { color: white; }
        .bubble-name {
          font-size: 10px; font-weight: 600; color: #1F3F28;
          margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .bubble-text { font-size: 14px; color: #333; word-wrap: break-word; line-height: 1.4; }
        @keyframes bubbleFloat {
          0% { opacity: 0; transform: scale(0.5) translateY(10px); }
          50% { transform: scale(1.05) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* Visitor Info Popup */
        .visitor-info-popup .mapboxgl-popup-content {
          background: white;
          border-radius: 8px;
          padding: 6px 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          font-family: inherit;
        }
        .visitor-info-popup .mapboxgl-popup-tip {
          border-top-color: white;
        }
        .visitor-info-bubble {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #1F3F28;
          white-space: nowrap;
        }
        .visitor-status {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .visitor-status.online {
          background: #22c55e;
          box-shadow: 0 0 4px rgba(34, 197, 94, 0.5);
        }
        .visitor-status.offline {
          background: #f87171;
        }
      `}</style>
    </div>
  );
}

// Helper
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
