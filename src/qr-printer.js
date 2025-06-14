#!/usr/bin/env node

const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// QR code content can be provided as an argument or read from a file
const filePath = path.join(__dirname, '..', 'whatsapp_qr.txt');

function printQrCode() {
  try {
    // Check if QR file exists
    if (!fs.existsSync(filePath)) {
      console.error('QR code file not found. Please start the WhatsApp tracker first.');
      process.exit(1);
    }
    
    // Read the QR file content
    const qrFileContent = fs.readFileSync(filePath, 'utf8');
    
    // Extract the QR code data
    // The format is typically like: 1@abcdef,ghijkl,mnopqr=,stuvwx=,1
    const qrMatch = qrFileContent.match(/\d@[A-Za-z0-9+/=,]+/);
    
    if (!qrMatch) {
      console.error('Could not find valid QR code data in the file.');
      console.log('File content:');
      console.log(qrFileContent);
      process.exit(1);
    }
    
    const qrData = qrMatch[0];
    
    console.log('\n============= WhatsApp QR Code =============');
    qrcode.generate(qrData, { small: false });
    console.log('===========================================');
    console.log('Scan this QR code with your WhatsApp mobile app.');
    console.log('Go to WhatsApp > Settings > Linked Devices > Link a Device');
    console.log('===========================================');
    
  } catch (error) {
    console.error('Error printing QR code:', error.message);
    process.exit(1);
  }
}

printQrCode(); 