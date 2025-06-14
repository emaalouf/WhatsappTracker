const { Command } = require('commander');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const WhatsAppClient = require('./whatsapp');
const db = require('./database');

class CLI {
  constructor() {
    this.whatsapp = null;
    this.program = new Command();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.setupCommands();
  }

  setupCommands() {
    this.program
      .name('whatsapp-tracker')
      .description('Terminal-based WhatsApp tracker')
      .version('1.0.0');

    this.program
      .command('start')
      .description('Start tracking WhatsApp messages')
      .action(async () => {
        await this.startTracking();
      });

    this.program
      .command('list-contacts')
      .description('List all tracked contacts')
      .action(async () => {
        await this.listContacts();
      });

    this.program
      .command('history <chatId> [limit]')
      .description('Show message history for a specific chat')
      .action(async (chatId, limit = 20) => {
        await this.showMessageHistory(chatId, parseInt(limit));
      });

    this.program
      .command('media <messageId>')
      .description('Show media info for a specific message')
      .action(async (messageId) => {
        await this.showMediaInfo(messageId);
      });

    this.program
      .command('export-media <chatId> <targetDir>')
      .description('Export all media from a specific chat')
      .action(async (chatId, targetDir) => {
        await this.exportMedia(chatId, targetDir);
      });

    this.program
      .command('send <chatId> <message>')
      .description('Send a message to a specific chat')
      .action(async (chatId, message) => {
        await this.sendMessage(chatId, message);
      });

    this.program
      .command('logout')
      .description('Logout from WhatsApp')
      .action(async () => {
        await this.logout();
      });
  }

  async initialize() {
    try {
      await db.initDatabase();
      this.program.parse(process.argv);
      
      // If no command was provided, display help
      if (!process.argv.slice(2).length) {
        this.program.outputHelp();
      }
    } catch (error) {
      console.error('Error initializing CLI:', error);
      process.exit(1);
    }
  }

  async startTracking() {
    try {
      console.log('Starting WhatsApp tracker...');
      this.whatsapp = new WhatsAppClient();
      await this.whatsapp.initialize();
      
      // Setup interactive commands
      this.setupInteractiveMode();
    } catch (error) {
      console.error('Error starting tracker:', error);
      process.exit(1);
    }
  }

  setupInteractiveMode() {
    console.log('\nInteractive mode enabled. Type commands or press Ctrl+C to exit.');
    console.log('Available commands:');
    console.log('  contacts - List all contacts');
    console.log('  history <chatId> [limit] - Show message history');
    console.log('  media <messageId> - Show media info for a message');
    console.log('  export <chatId> <directory> - Export all media from a chat');
    console.log('  send <chatId> <message> - Send a message');
    console.log('  exit - Exit the application');
    console.log('');

    this.rl.on('line', async (input) => {
      const args = input.trim().split(' ');
      const command = args[0];

      try {
        switch (command) {
          case 'contacts':
            await this.listContacts();
            break;
          case 'history':
            if (args.length < 2) {
              console.log('Usage: history <chatId> [limit]');
            } else {
              await this.showMessageHistory(args[1], args[2] ? parseInt(args[2]) : 20);
            }
            break;
          case 'media':
            if (args.length < 2) {
              console.log('Usage: media <messageId>');
            } else {
              await this.showMediaInfo(args[1]);
            }
            break;
          case 'export':
            if (args.length < 3) {
              console.log('Usage: export <chatId> <directory>');
            } else {
              await this.exportMedia(args[1], args[2]);
            }
            break;
          case 'send':
            if (args.length < 3) {
              console.log('Usage: send <chatId> <message>');
            } else {
              const message = args.slice(2).join(' ');
              await this.sendMessage(args[1], message);
            }
            break;
          case 'exit':
            console.log('Exiting application...');
            await this.cleanup();
            process.exit(0);
            break;
          default:
            console.log('Unknown command. Type "help" for available commands.');
        }
      } catch (error) {
        console.error('Error executing command:', error);
      }
    });

    this.rl.on('close', async () => {
      await this.cleanup();
      process.exit(0);
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      console.log('\nReceived SIGINT. Cleaning up...');
      await this.cleanup();
      process.exit(0);
    });
  }

  async cleanup() {
    try {
      if (this.whatsapp) {
        await this.whatsapp.destroy();
      }
      this.rl.close();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  async listContacts() {
    try {
      if (!this.whatsapp) {
        this.whatsapp = new WhatsAppClient();
        await this.whatsapp.initialize();
      }
      
      const contacts = await this.whatsapp.getContacts();
      
      console.log('\n=== Contacts ===');
      if (contacts.length === 0) {
        console.log('No contacts found.');
      } else {
        contacts.forEach((contact, index) => {
          console.log(`${index + 1}. ${contact.name || 'Unknown'} (ID: ${contact.id})`);
          console.log(`   Type: ${contact.isGroup ? 'Group' : 'Individual'}`);
          if (contact.pushname) console.log(`   Push name: ${contact.pushname}`);
          console.log('');
        });
      }
    } catch (error) {
      console.error('Error listing contacts:', error);
    }
  }

  async showMessageHistory(chatId, limit = 20) {
    try {
      if (!this.whatsapp) {
        this.whatsapp = new WhatsAppClient();
        await this.whatsapp.initialize();
      }
      
      const messages = await this.whatsapp.getMessageHistory(chatId, limit);
      
      console.log(`\n=== Message History (${chatId}) ===`);
      if (messages.length === 0) {
        console.log('No messages found.');
      } else {
        messages.forEach((msg) => {
          const timestamp = new Date(msg.timestamp).toLocaleString();
          const direction = msg.fromMe ? 'Outgoing' : 'Incoming';
          
          console.log(`[${timestamp}] ${direction}`);
          if (msg.author && !msg.fromMe) console.log(`From: ${msg.author}`);
          console.log(`Message: ${msg.body}`);
          
          if (msg.hasMedia) {
            console.log(`Media: Yes (ID: ${msg.id})`);
            console.log(`Use 'media ${msg.id}' to view media details`);
          }
          
          console.log('');
        });
      }
    } catch (error) {
      console.error('Error showing message history:', error);
    }
  }

  async showMediaInfo(messageId) {
    try {
      if (!this.whatsapp) {
        this.whatsapp = new WhatsAppClient();
        await this.whatsapp.initialize();
      }
      
      const media = await this.whatsapp.getMediaByMessageId(messageId);
      
      if (!media) {
        console.log('No media found for this message ID.');
        return;
      }
      
      console.log(`\n=== Media Info (${messageId}) ===`);
      console.log(`Type: ${media.mimetype}`);
      console.log(`File: ${media.filename || 'N/A'}`);
      console.log(`Size: ${this.formatBytes(media.filesize)}`);
      
      if (media.caption) {
        console.log(`Caption: ${media.caption}`);
      }
      
      if (media.filePath) {
        console.log(`Stored at: ${media.filePath}`);
        
        if (fs.existsSync(media.filePath)) {
          console.log('Status: File exists');
        } else {
          console.log('Status: File not found (may have been moved or deleted)');
        }
      } else {
        console.log('Status: Media not saved locally');
      }
      
    } catch (error) {
      console.error('Error showing media info:', error);
    }
  }

  formatBytes(bytes, decimals = 2) {
    if (!bytes) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  async exportMedia(chatId, targetDir) {
    try {
      if (!this.whatsapp) {
        this.whatsapp = new WhatsAppClient();
        await this.whatsapp.initialize();
      }
      
      // Ensure target directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // Get messages with media from this chat
      const messages = await this.whatsapp.getMessageHistory(chatId, 1000);
      const mediaMessages = messages.filter(msg => msg.hasMedia);
      
      console.log(`Found ${mediaMessages.length} messages with media in chat ${chatId}`);
      
      if (mediaMessages.length === 0) {
        console.log('No media to export.');
        return;
      }
      
      let exportCount = 0;
      
      for (const msg of mediaMessages) {
        const media = await this.whatsapp.getMediaByMessageId(msg.id);
        
        if (media && media.filePath && fs.existsSync(media.filePath)) {
          const timestamp = new Date(msg.timestamp).toISOString().replace(/[:.]/g, '-');
          const sourceFilename = path.basename(media.filePath);
          const fileExtension = path.extname(media.filePath);
          const targetFilename = `${timestamp}_${sourceFilename}`;
          const targetPath = path.join(targetDir, targetFilename);
          
          // Copy file to target directory
          fs.copyFileSync(media.filePath, targetPath);
          exportCount++;
          
          console.log(`Exported: ${targetFilename}`);
        }
      }
      
      console.log(`\nExport complete: ${exportCount} files exported to ${targetDir}`);
    } catch (error) {
      console.error('Error exporting media:', error);
    }
  }

  async sendMessage(chatId, message) {
    try {
      if (!this.whatsapp) {
        this.whatsapp = new WhatsAppClient();
        await this.whatsapp.initialize();
      }
      
      console.log(`Sending message to ${chatId}...`);
      const success = await this.whatsapp.sendMessage(chatId, message);
      
      if (success) {
        console.log('Message sent successfully.');
      } else {
        console.log('Failed to send message.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  async logout() {
    try {
      if (!this.whatsapp) {
        this.whatsapp = new WhatsAppClient();
        await this.whatsapp.initialize();
      }
      
      console.log('Logging out from WhatsApp...');
      await this.whatsapp.logout();
      console.log('Logged out successfully.');
      
      await this.cleanup();
      process.exit(0);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }
}

module.exports = CLI; 