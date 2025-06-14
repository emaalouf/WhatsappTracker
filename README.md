# WhatsApp Tracker

A terminal-based WhatsApp tracker that captures data from your WhatsApp account and stores it in a MySQL database, including media files.

## Features

- Connect to WhatsApp Web via QR code authentication
- Track and store all incoming and outgoing messages
- Download and save media files (images, videos, audio, documents)
- Track contacts and group information
- Interactive command-line interface
- MySQL database storage
- Media export functionality
- PM2 support for running as a daemon

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- MySQL server (v5.7 or higher)
- PM2 (installed globally with `npm install pm2 -g`)
- Internet connection for WhatsApp Web

## Installation

1. Clone this repository:
```
git clone https://github.com/yourusername/whatsapp-tracker.git
cd whatsapp-tracker
```

2. Install dependencies:
```
npm install
```

3. Configure environment variables:
Create a `.env` file in the project root with the following options:
```
# MySQL Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=whatsapp_tracker
DB_PORT=3306

# Application Settings
SESSION_PATH=./session

# Media Storage
MEDIA_PATH=./media

# PM2 and WhatsApp Settings
HEADLESS=true  # true for production, false for development with visual browser
NODE_ENV=production
```

4. Create MySQL database:
```
mysql -u root -p
CREATE DATABASE whatsapp_tracker;
exit
```

## Usage

### Start Tracking (Interactive Mode)

To start tracking WhatsApp messages in interactive mode:

```
npm run dev
```

This will display a QR code in your terminal. Scan it with your phone's WhatsApp app to authenticate.

### Using PM2 (Background/Daemon Mode)

To run WhatsApp tracker as a background service with PM2:

1. Start the tracker:
```
npm run pm2:start
```

2. View the QR code for authentication:
```
pm2 logs whatsapp-tracker
```
Or check the `whatsapp_qr.txt` file in the project directory.

3. Check status:
```
npm run pm2:status
```

4. View logs:
```
npm run pm2:logs
```

5. Restart the tracker:
```
npm run pm2:restart
```

6. Stop the tracker:
```
npm run pm2:stop
```

7. Make WhatsApp tracker start automatically on system boot:
```
npm run pm2:startup
```

### Interactive Commands

When the tracker is running in interactive mode, you can use the following commands:

- `contacts` - List all contacts
- `history <chatId> [limit]` - Show message history for a specific chat
- `media <messageId>` - Show media info for a specific message
- `export <chatId> <directory>` - Export all media from a chat
- `send <chatId> <message>` - Send a message to a specific chat
- `exit` - Exit the application

### CLI Commands

You can also use CLI commands:

- `npm start` - Start the application and show help
- `npm run dev` - Start tracking WhatsApp messages
- `npm run list` - List all tracked contacts
- `npm run history <chatId> [limit]` - Show message history for a specific chat
- `npm run media <messageId>` - Show media info for a message
- `npm run export-media <chatId> <directory>` - Export all media from a chat

## Data Storage

All data is stored in a MySQL database. The database schema includes the following tables:
- `messages` - Stores message data
- `contacts` - Stores contact and group information
- `media` - Stores media metadata and file paths

Media files are downloaded and stored in the `./media` directory (configurable in .env).

## PM2 Configuration

The application includes an `ecosystem.config.js` file that configures PM2 with the following settings:

- Application name: `whatsapp-tracker`
- Auto restart: Enabled
- Max memory restart: 1GB
- Number of instances: 1 (WhatsApp Web doesn't support multiple instances)

You can modify these settings in the `ecosystem.config.js` file.

## Security

- Authentication sessions are saved in the `./session` directory
- Media files are stored locally in the `./media` directory
- Database credentials should be kept secure in the `.env` file
- No data is sent to external servers

## License

ISC 