const fs = require('fs');

// Mock context
const mockContext = {
  payload: {
    issue: {
      user: {
        login: 'cvega' // Change this to test different users
      }
    }
  }
};

// Mock core
const mockCore = {
  setOutput: (name, value) => console.log(`OUTPUT ${name}=${value}`),
  setFailed: (message) => console.error(`FAILED: ${message}`)
};

// Mock environment
process.env.SOURCE_INSTANCE = 'GHEC';
process.env.TARGET_INSTANCE = 'GHEC EMU';

// Run the script - FIXED PATH (same directory)
const script = require('./filter-orgs-by-instance.js');
script({ context: mockContext, core: mockCore, github: {} });