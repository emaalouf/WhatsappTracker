const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config();
const db = require('./database');

class WhatsAppClient {
  constructor() {
    // Get session path from .env or use default
    const sessionPath = process.env.SESSION_PATH || './session';
    
    // Ensure session directory exists
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }
    
    // Ensure media directory exists
    this.mediaPath = process.env.MEDIA_PATH || './media';
    if (!fs.existsSync(this.mediaPath)) {
      fs.mkdirSync(this.mediaPath, { recursive: true });
    }

    // Store QR code for later retrieval in headless mode
    this.qrCode = null;
    this.lastQR = null;
    
    // Get boolean for headless mode
    const isHeadless = process.env.HEADLESS !== 'false';

    // Add extra options for Docker/Containerized environments
    const puppeteerOptions = {
      headless: isHeadless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    };

    // Check if running in a container or minimal environment
    if (process.env.CONTAINER_ENV === 'true' || process.env.MINIMAL_ENV === 'true') {
      console.log('Running in container/minimal environment - applying additional compatibility options');
      puppeteerOptions.executablePath = process.env.CHROME_PATH || null;
      puppeteerOptions.args.push(
        '--single-process',
        '--disable-extensions',
        '--disable-sync',
        '--disable-translate'
      );
    }

    // Initialize WhatsApp client with local authentication
    try {
      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: sessionPath
        }),
        puppeteer: puppeteerOptions
      });
      
      this.setupEventListeners();
    } catch (error) {
      console.error('Error initializing WhatsApp client:', error);
      this.client = null;
    }
  }

  // Setup WhatsApp client event listeners
  setupEventListeners() {
    // Generate QR code for authentication
    this.client.on('qr', (qr) => {
      this.qrCode = qr;
      this.lastQR = new Date().getTime();
      
      console.log('\n============= WhatsApp QR Code =============');
      // Generate QR with larger size for better visibility
      qrcode.generate(qr, { small: false });
      console.log('===========================================');
      console.log('Scan this QR code with your WhatsApp mobile app');
      console.log('Go to WhatsApp > Settings > Linked Devices > Link a Device');
      console.log('===========================================\n');
      
      // Also save QR code to file for PM2 headless mode
      const qrFilePath = path.join(process.cwd(), 'whatsapp_qr.txt');
      fs.writeFileSync(qrFilePath, 
        `QR Code generated at ${new Date().toLocaleString()}\n` +
        `Scan this QR code with your phone's WhatsApp app to authenticate.\n\n` +
        `${qr}\n\n` +
        `If you can't see the QR code in the terminal, run:\n` +
        `npm run qr\n\n` +
        `This will display a nicely formatted QR code in your terminal.`
      );
      console.log(`QR code also saved to ${qrFilePath}`);
      console.log(`If you can't see the QR code clearly, run: npm run qr`);
    });

    // Authentication successful
    this.client.on('authenticated', () => {
      console.log('Authentication successful!');
      // Clear QR code file after successful authentication
      const qrFilePath = path.join(process.cwd(), 'whatsapp_qr.txt');
      if (fs.existsSync(qrFilePath)) {
        fs.unlinkSync(qrFilePath);
      }
      this.qrCode = null;
    });

    // Authentication failure
    this.client.on('auth_failure', (msg) => {
      console.error('Authentication failed:', msg);
    });

    // Client ready
    this.client.on('ready', () => {
      console.log('WhatsApp client is ready!');
      console.log('Tracking messages... Press Ctrl+C to exit (or use PM2 commands to manage).');
    });

    // Handle incoming messages
    this.client.on('message', async (message) => {
      try {
        await this.handleMessage(message);
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });

    // Handle message status updates
    this.client.on('message_ack', (msg, ack) => {
      // Store message acknowledgment status if needed
    });
    
    // Handle disconnect/reconnect events for PM2
    this.client.on('disconnected', (reason) => {
      console.log('WhatsApp client disconnected:', reason);
      // If running under PM2, it will auto-restart
    });
  }

  // Get QR code (useful for API endpoints to retrieve QR when using PM2)
  getQR() {
    return {
      qr: this.qrCode,
      timestamp: this.lastQR
    };
  }

  // Initialize client
  async initialize() {
    try {
      // Initialize database
      await db.initDatabase();
      console.log('Database initialized successfully');

      // Initialize WhatsApp client
      await this.client.initialize();
      console.log('WhatsApp client initialized');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize:', error);
      return false;
    }
  }

  // Generate a unique filename for media
  generateUniqueFilename(messageId, mimetype) {
    const hash = crypto.createHash('md5').update(messageId).digest('hex');
    const extension = this.getFileExtension(mimetype);
    return `${hash}${extension}`;
  }

  // Get file extension from mimetype
  getFileExtension(mimetype) {
    const mimeMap = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'video/mp4': '.mp4',
      'audio/ogg': '.ogg',
      'audio/mpeg': '.mp3',
      'application/pdf': '.pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx'
    };
    
    return mimeMap[mimetype] || '.bin';
  }

  // Save media file to disk
  async saveMediaToDisk(media, messageId) {
    try {
      if (!media || !media.data) {
        return null;
      }
      
      const filename = this.generateUniqueFilename(messageId, media.mimetype);
      const filePath = path.join(this.mediaPath, filename);
      
      // Convert base64 to buffer and save file
      const buffer = Buffer.from(media.data, 'base64');
      
      // Create directory structure if needed
      const dirname = path.dirname(filePath);
      if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true });
      }
      
      // Write file
      fs.writeFileSync(filePath, buffer);
      
      return filePath;
    } catch (error) {
      console.error('Error saving media to disk:', error);
      return null;
    }
  }

  // Handle incoming messages
  async handleMessage(message) {
    try {
      // Save message to database
      await db.saveMessage(message);
      
      // If message has media, download and save it
      if (message.hasMedia) {
        try {
          const media = await message.downloadMedia();
          
          if (media) {
            // Save media file to disk
            const filePath = await this.saveMediaToDisk(media, message.id._serialized || message.id);
            
            // Save media metadata with file path to database
            if (filePath) {
              await db.saveMedia(message.id._serialized || message.id, media, filePath);
              console.log(`Media saved: ${filePath}`);
            }
          }
        } catch (mediaError) {
          console.error('Error downloading media:', mediaError);
        }
      }
      
      // Get chat info and save contact
      const chat = await message.getChat();
      await db.saveContact({
        id: chat.id._serialized,
        name: chat.name,
        isGroup: chat.isGroup,
        pushname: chat.contact ? chat.contact.pushname : ''
      });
      
      // Log message in console
      console.log(`New message ${message.id._serialized || message.id} from ${chat.name || 'Unknown'}: ${message.body.substring(0, 30)}${message.body.length > 30 ? '...' : ''}`);
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  // Get message history from a specific chat
  async getMessageHistory(chatId, limit = 50) {
    try {
      return await db.getMessagesByChatId(chatId, limit);
    } catch (error) {
      console.error('Error fetching message history:', error);
      return [];
    }
  }

  // Get all contacts
  async getContacts() {
    try {
      return await db.getAllContacts();
    } catch (error) {
      console.error('Error fetching contacts:', error);
      return [];
    }
  }

  // Get media for a message
  async getMediaByMessageId(messageId) {
    try {
      return await db.getMediaByMessageId(messageId);
    } catch (error) {
      console.error('Error fetching media:', error);
      return null;
    }
  }

  // Send a message to a specific chat
  async sendMessage(chatId, message) {
    try {
      await this.client.sendMessage(chatId, message);
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }

  // Logout and stop client
  async logout() {
    try {
      await this.client.logout();
      console.log('Logged out successfully');
      return true;
    } catch (error) {
      console.error('Error logging out:', error);
      return false;
    }
  }

  // Destroy client
  async destroy() {
    try {
      if (this.client) {
        try {
          await this.client.destroy();
          console.log('Client destroyed successfully');
        } catch (destroyError) {
          console.error('Error during client destroy:', destroyError.message);
        }
      }
      return true;
    } catch (error) {
      console.error('Error destroying client:', error);
      return false;
    }
  }
}

module.exports = WhatsAppClient; 