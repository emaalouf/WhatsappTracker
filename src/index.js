#!/usr/bin/env node

const CLI = require('./cli');

// Create and initialize CLI
const cli = new CLI();
cli.initialize().catch(error => {
  console.error('Error initializing application:', error);
  process.exit(1);
}); 