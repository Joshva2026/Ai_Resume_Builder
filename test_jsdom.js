const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('Fontend/pages/ai-assistant.html', 'utf-8');
const js = fs.readFileSync('Fontend/js/pages/ai-assistant.js', 'utf-8');

const dom = new JSDOM(html, { runScripts: "outside-only", url: "http://localhost/Fontend/pages/ai-assistant.html" });
const window = dom.window;
const document = window.document;

global.window = window;
global.document = document;

// Mock globals needed by script
window.ApiService = {
  BASE_URL: 'http://localhost:5000/api',
  getToken: () => 'mock_token',
  resumes: {
    list: async () => []
  }
};
window.AppShell = {
  render: () => {}
};

// Execute inline scripts to setup template
const appContent = document.createElement('div');
appContent.id = 'appContent';
document.body.appendChild(appContent);
appContent.appendChild(document.getElementById('aiAssistantTemplate').content.cloneNode(true));

// Run the script
try {
  window.eval(js);
  console.log('Script evaluated successfully.');
} catch (e) {
  console.error('Script evaluation failed:', e);
}

// Trigger DOMContentLoaded
const event = document.createEvent('Event');
event.initEvent('DOMContentLoaded', true, true);
document.dispatchEvent(event);

// Simulate typing and clicking send
setTimeout(() => {
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  
  if (!chatInput || !sendBtn) {
    console.error('Could not find chatInput or sendBtn');
    return;
  }
  
  chatInput.value = 'What are 5 common Java interview questions?';
  
  // Override fetch
  window.fetch = async (url, options) => {
    console.log('[MOCK FETCH] called to', url);
    return {
      ok: true,
      body: {
        getReader: () => {
          return {
            read: async () => {
              console.log('[MOCK STREAM] reading...');
              return { done: true, value: undefined };
            }
          }
        }
      }
    };
  };
  
  console.log('Clicking sendBtn...');
  const clickEvent = document.createEvent('Event');
  clickEvent.initEvent('click', true, true);
  sendBtn.dispatchEvent(clickEvent);
  
}, 500);
