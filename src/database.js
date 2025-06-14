const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// MySQL connection pool configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'whatsapp_tracker',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000 // 10 second timeout
  // Removed unsupported options
};

let pool = null;

// Helper function to check MySQL connection
async function checkMySQLConnection() {
  try {
    const tempConfig = {
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      port: dbConfig.port,
      connectTimeout: 5000
    };
    
    // Try to create a connection to check if MySQL is available
    const tempConn = await mysql.createConnection(tempConfig);
    await tempConn.end();
    return true;
  } catch (error) {
    console.error(`MySQL connection check failed: ${error.message || error}`);
    return false;
  }
}

// Initialize database connection
async function initializeConnection() {
  // Check if MySQL is available
  const mysqlAvailable = await checkMySQLConnection();
  
  if (!mysqlAvailable) {
    throw new Error('Cannot connect to MySQL. Please check that MySQL is running and credentials are correct in .env file.');
  }
  
  try {
    // Create connection pool
    pool = mysql.createPool(dbConfig);
    
    // Test the connection
    const connection = await pool.getConnection();
    connection.release();
    
    console.log('Successfully connected to MySQL server.');
    return true;
  } catch (error) {
    console.error(`Failed to create connection pool: ${error.message || error}`);
    throw error;
  }
}

// Initialize database tables
async function initDatabase() {
  try {
    // Initialize connection first
    await initializeConnection();
    
    // Create database if it doesn't exist
    try {
      await pool.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
      console.log(`Database '${dbConfig.database}' checked/created.`);
    } catch (error) {
      console.error(`Error creating database: ${error.message}`);
      throw error;
    }
    
    // Create tables
    const conn = await pool.getConnection();
    
    // Messages table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(255) PRIMARY KEY,
        chatId VARCHAR(255) NOT NULL,
        body TEXT,
        fromMe BOOLEAN,
        author VARCHAR(255),
        timestamp BIGINT,
        type VARCHAR(50),
        hasMedia BOOLEAN,
        hasQuotedMsg BOOLEAN,
        INDEX idx_chatId (chatId),
        INDEX idx_timestamp (timestamp)
      )
    `);
    console.log('Messages table checked/created.');

    // Contacts table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        number VARCHAR(50),
        pushname VARCHAR(255),
        isGroup BOOLEAN,
        lastUpdated BIGINT,
        INDEX idx_name (name),
        INDEX idx_number (number)
      )
    `);
    console.log('Contacts table checked/created.');
    
    // Media table with file paths
    await conn.query(`
      CREATE TABLE IF NOT EXISTS media (
        messageId VARCHAR(255) PRIMARY KEY,
        mimetype VARCHAR(100),
        filename VARCHAR(255),
        filesize INT,
        caption TEXT,
        filePath VARCHAR(512),
        FOREIGN KEY (messageId) REFERENCES messages(id) ON DELETE CASCADE
      )
    `);
    console.log('Media table checked/created.');
    
    conn.release();
    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Save message to database
async function saveMessage(message) {
  try {
    if (!pool) await initializeConnection();
    
    const {
      id,
      body = '',
      from: chatId = '',
      fromMe = false, 
      author = '',
      timestamp = Date.now(),
      type = 'unknown',
      hasMedia = false,
      hasQuotedMsg = false
    } = message;

    const [result] = await pool.query(
      `INSERT INTO messages (id, chatId, body, fromMe, author, timestamp, type, hasMedia, hasQuotedMsg) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       body = VALUES(body),
       fromMe = VALUES(fromMe),
       author = VALUES(author),
       timestamp = VALUES(timestamp),
       type = VALUES(type),
       hasMedia = VALUES(hasMedia),
       hasQuotedMsg = VALUES(hasQuotedMsg)`,
      [id, chatId, body, fromMe, author, timestamp, type, hasMedia, hasQuotedMsg]
    );
    
    return result.insertId;
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
}

// Save contact to database
async function saveContact(contact) {
  try {
    if (!pool) await initializeConnection();
    
    const {
      id,
      name = '',
      number = '',
      pushname = '',
      isGroup = false
    } = contact;

    const [result] = await pool.query(
      `INSERT INTO contacts (id, name, number, pushname, isGroup, lastUpdated) 
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       name = VALUES(name),
       number = VALUES(number),
       pushname = VALUES(pushname),
       isGroup = VALUES(isGroup),
       lastUpdated = VALUES(lastUpdated)`,
      [id, name, number, pushname, isGroup, Date.now()]
    );
    
    return result.insertId;
  } catch (error) {
    console.error('Error saving contact:', error);
    throw error;
  }
}

// Save media metadata and file path
async function saveMedia(messageId, media, filePath) {
  try {
    if (!pool) await initializeConnection();
    
    const {
      mimetype = '',
      filename = '',
      filesize = 0,
      caption = ''
    } = media;

    const [result] = await pool.query(
      `INSERT INTO media (messageId, mimetype, filename, filesize, caption, filePath) 
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       mimetype = VALUES(mimetype),
       filename = VALUES(filename),
       filesize = VALUES(filesize),
       caption = VALUES(caption),
       filePath = VALUES(filePath)`,
      [messageId, mimetype, filename, filesize, caption, filePath]
    );
    
    return result.insertId;
  } catch (error) {
    console.error('Error saving media:', error);
    throw error;
  }
}

// Get messages by chat ID
async function getMessagesByChatId(chatId, limit = 50) {
  try {
    if (!pool) await initializeConnection();
    
    const [rows] = await pool.query(
      `SELECT * FROM messages 
       WHERE chatId = ? 
       ORDER BY timestamp DESC 
       LIMIT ?`,
      [chatId, limit]
    );
    
    return rows;
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
}

// Get all contacts
async function getAllContacts() {
  try {
    if (!pool) await initializeConnection();
    
    const [rows] = await pool.query(
      `SELECT * FROM contacts 
       ORDER BY lastUpdated DESC`
    );
    
    return rows;
  } catch (error) {
    console.error('Error getting contacts:', error);
    throw error;
  }
}

// Get media for a message
async function getMediaByMessageId(messageId) {
  try {
    if (!pool) await initializeConnection();
    
    const [rows] = await pool.query(
      `SELECT * FROM media 
       WHERE messageId = ?`,
      [messageId]
    );
    
    return rows[0];
  } catch (error) {
    console.error('Error getting media:', error);
    throw error;
  }
}

module.exports = {
  initDatabase,
  saveMessage,
  saveContact,
  saveMedia,
  getMessagesByChatId,
  getAllContacts,
  getMediaByMessageId,
  pool
}; 