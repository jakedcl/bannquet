/**
 * ============================================
 * USERMAP SOCKET SERVER
 * Real-time visitor presence & messaging
 * ============================================
 * 
 * This server handles:
 * - Tracking visitor locations (persistent in JSON)
 * - Broadcasting online/offline status
 * - Real-time message broadcasting (speech bubbles)
 * 
 * Run: npm install && npm run dev
 */

import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Socket.io server with CORS configured
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || "*", // Allow specific origins in production
    methods: ["GET", "POST"],
    credentials: true
  }
});

// ============================================
// PERSISTENT STORAGE (JSON Files)
// ============================================
const DATA_DIR = path.join(__dirname, '..', 'data');
const VISITORS_FILE = path.join(DATA_DIR, 'usermap-visitors.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'usermap-messages.json');

// Ensure data directory and files exist
async function ensureDataFiles() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
  
  try {
    await fs.access(VISITORS_FILE);
  } catch {
    await fs.writeFile(VISITORS_FILE, '[]', 'utf-8');
  }
  
  try {
    await fs.access(MESSAGES_FILE);
  } catch {
    await fs.writeFile(MESSAGES_FILE, '[]', 'utf-8');
  }
}

// Read all visitors from file (filter out any with corrupted coordinates)
async function readVisitors() {
  try {
    const data = await fs.readFile(VISITORS_FILE, 'utf-8');
    const visitors = JSON.parse(data);
    
    // Filter out any visitors with invalid coordinates
    const validVisitors = visitors.filter(v => {
      const valid = isValidCoordinates(v.coordinates);
      if (!valid) {
        console.warn('⚠️ Filtering out visitor with bad coordinates:', v.visitorId, v.coordinates);
      }
      return valid;
    });
    
    // If we filtered any out, save the cleaned version
    if (validVisitors.length !== visitors.length) {
      console.log(`🧹 Cleaned ${visitors.length - validVisitors.length} corrupted visitors from database`);
      await saveVisitors(validVisitors);
    }
    
    return validVisitors;
  } catch (error) {
    console.error('Error reading visitors:', error);
    return [];
  }
}

// Save all visitors to file
async function saveVisitors(visitors) {
  try {
    await fs.writeFile(VISITORS_FILE, JSON.stringify(visitors, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving visitors:', error);
  }
}

// Read all messages from file
async function readMessages() {
  try {
    const data = await fs.readFile(MESSAGES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading messages:', error);
    return [];
  }
}

// Save all messages to file (keep last 200)
async function saveMessages(messages) {
  try {
    const trimmed = messages.slice(-200); // Keep only last 200 messages
    await fs.writeFile(MESSAGES_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving messages:', error);
  }
}

// Add a new message
async function addMessage(messageData) {
  const messages = await readMessages();
  messages.push({
    ...messageData,
    timestamp: Date.now(),
    createdAt: new Date().toISOString()
  });
  await saveMessages(messages);
  return messages;
}

// Comprehensive coordinate validation
function isValidCoordinates(coordinates) {
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
    return false;
  }
  
  const [lng, lat] = coordinates;
  
  // Check if they're numbers
  if (typeof lng !== 'number' || typeof lat !== 'number') {
    return false;
  }
  
  // Check for NaN, Infinity
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return false;
  }
  
  // Check valid ranges: lng [-180, 180], lat [-90, 90]
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    return false;
  }
  
  // Check for [0, 0] (default/error value)
  if (lng === 0 && lat === 0) {
    return false;
  }
  
  return true;
}

// Update or add a single visitor (ONLY if they have valid coordinates)
async function upsertVisitor(visitorData) {
  // Validate coordinates before persisting
  if (!isValidCoordinates(visitorData.coordinates)) {
    console.warn('⚠️ Attempted to save visitor with invalid coordinates:', visitorData.coordinates);
    return await readVisitors(); // Return current state without modifying
  }
  
  const visitors = await readVisitors();
  const index = visitors.findIndex(v => v.visitorId === visitorData.visitorId);
  
  if (index >= 0) {
    // Update existing visitor
    visitors[index] = {
      ...visitors[index],
      ...visitorData,
      lastSeen: new Date().toISOString()
    };
  } else {
    // Add new visitor
    visitors.push({
      ...visitorData,
      firstVisit: new Date().toISOString(),
      lastSeen: new Date().toISOString()
    });
  }
  
  await saveVisitors(visitors);
  return visitors;
}

// ============================================
// IN-MEMORY: Track who's currently online
// ============================================
// Map: visitorId -> { socketId, nickname, coordinates }
const onlineUsers = new Map();

// Helper: Get array of online visitor IDs
function getOnlineIds() {
  return Array.from(onlineUsers.keys());
}

// ============================================
// SOCKET.IO CONNECTION HANDLING
// ============================================

io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  // ----------------------------------------
  // Handle initial connection sync (always sent on connect)
  // ----------------------------------------
  socket.on('client:ready', async () => {
    console.log(`📡 Client ready, sending sync data`);
    
    const visitors = await readVisitors(); // Already filtered by readVisitors()
    const messages = await readMessages();
    
    // One final safety check - filter visitors with valid coordinates only
    const safeVisitors = visitors.filter(v => isValidCoordinates(v.coordinates));
    
    if (safeVisitors.length !== visitors.length) {
      console.warn(`⚠️ Filtered ${visitors.length - safeVisitors.length} visitors before sync`);
    }
    
    socket.emit('initial:sync', {
      visitors: safeVisitors,
      onlineIds: getOnlineIds(),
      messages
    });
  });

  // ----------------------------------------
  // Handle visitor joining (with pin dropped)
  // ----------------------------------------
  socket.on('visitor:join', async ({ visitorId, nickname, coordinates }) => {
    console.log(`👤 Visitor join attempt: ${nickname} (${visitorId})`);
    
    // Validate coordinates
    if (!isValidCoordinates(coordinates)) {
      console.warn(`⚠️ Invalid coordinates for ${visitorId}:`, coordinates);
      return;
    }
    
    console.log(`✅ Valid coordinates, proceeding with join`);
    
    // Store in socket data for later (disconnect handling)
    socket.data.visitorId = visitorId;
    socket.data.nickname = nickname;
    socket.data.coordinates = coordinates;
    socket.data.hasPinDropped = true;
    
    // Add to online users
    onlineUsers.set(visitorId, {
      socketId: socket.id,
      nickname,
      coordinates
    });
    
    // Persist to JSON file (only visitors with valid pins)
    await upsertVisitor({
      visitorId,
      nickname,
      coordinates
    });
    
    // Notify all OTHER clients that someone came online
    // Double-check coordinates one more time before broadcasting
    if (isValidCoordinates(coordinates)) {
      socket.broadcast.emit('visitor:online', {
        visitorId,
        nickname,
        coordinates
      });
    } else {
      console.error('❌ CRITICAL: Tried to broadcast invalid coordinates!', coordinates);
    }
  });

  // ----------------------------------------
  // Handle nickname updates
  // ----------------------------------------
  socket.on('visitor:update', async ({ visitorId, nickname }) => {
    console.log(`✏️ Nickname update: ${visitorId} -> ${nickname}`);
    
    // Update socket data
    socket.data.nickname = nickname;
    
    // Update online users map
    const userData = onlineUsers.get(visitorId);
    if (userData) {
      userData.nickname = nickname;
      onlineUsers.set(visitorId, userData);
    }
    
    // Only persist if they have a pin dropped (valid coordinates)
    if (socket.data.hasPinDropped && socket.data.coordinates) {
      await upsertVisitor({
        visitorId,
        nickname,
        coordinates: socket.data.coordinates
      });
    }
    
    // Broadcast nickname change to all clients (even chat-only users)
    io.emit('visitor:updated', {
      visitorId,
      nickname
    });
  });

  // ----------------------------------------
  // Handle message broadcasting
  // ----------------------------------------
  socket.on('message:send', async ({ visitorId, text }) => {
    const nickname = socket.data.nickname || 'Anonymous';
    console.log(`💬 Message from ${nickname}: ${text}`);
    
    const message = {
      visitorId,
      nickname,
      text,
      timestamp: Date.now()
    };
    
    // Persist message to JSON file
    await addMessage(message);
    
    // Broadcast to ALL clients (including sender)
    io.emit('message:broadcast', message);
  });

  // ----------------------------------------
  // Handle disconnection
  // ----------------------------------------
  socket.on('disconnecting', async () => {
    const { visitorId, nickname, hasPinDropped, coordinates } = socket.data;
    
    if (visitorId) {
      console.log(`👋 Visitor left: ${nickname} (${visitorId})`);
      
      // Remove from online users
      onlineUsers.delete(visitorId);
      
      // Only update lastSeen if they had a pin dropped
      if (hasPinDropped && coordinates) {
        await upsertVisitor({
          visitorId,
          nickname,
          coordinates
        });
      }
      
      // Notify all other clients (even if they were chat-only)
      socket.broadcast.emit('visitor:offline', { visitorId });
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    onlineCount: onlineUsers.size,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3002;

async function start() {
  await ensureDataFiles();
  
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║           🗺️  UserMap Server Started!                    ║
╠══════════════════════════════════════════════════════════╣
║  🚀 Server running on port ${PORT}                          ║
║  📡 Socket.io ready for connections                      ║
╠══════════════════════════════════════════════════════════╣
║  🏠 Local:    http://localhost:${PORT}                      ║
║  💚 Health:   http://localhost:${PORT}/health               ║
╚══════════════════════════════════════════════════════════╝
    `);
  });
}

start();

