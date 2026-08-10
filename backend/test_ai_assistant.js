const http = require('http');

async function makeRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testNonStreaming() {
  console.log('Testing Non-Streaming POST /api/ai/chat...');
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/ai/chat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const payload = {
    message: 'Hi, who are you?',
    conversation: [],
    stream: false
  };

  try {
    const res = await makeRequest(options, payload);
    console.log(`Response Code: ${res.statusCode}`);
    console.log(`Response Body: ${res.body}`);
    const parsed = JSON.parse(res.body);
    if (parsed.success && parsed.message) {
      console.log('✅ Non-streaming test passed!');
    } else {
      console.log('❌ Non-streaming test failed: response lacks expected properties');
    }
  } catch (err) {
    console.error('❌ Non-streaming test failed with error:', err.message);
  }
}

async function testStreaming() {
  console.log('\nTesting Streaming POST /api/ai/chat...');
  const payload = {
    message: 'Explain what ATS is in one short sentence.',
    conversation: [],
    stream: true
  };

  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/ai/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
      console.log(`Response Code: ${res.statusCode}`);
      console.log('Response Headers:', res.headers['content-type']);
      
      let streamData = '';
      res.on('data', (chunk) => {
        const text = chunk.toString();
        streamData += text;
        process.stdout.write(text);
      });

      res.on('end', () => {
        console.log('\nStream completed.');
        if (streamData.includes('data: ') && streamData.includes('[DONE]')) {
          console.log('✅ Streaming test passed!');
        } else {
          console.log('❌ Streaming test failed: stream output incorrect');
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      console.error('❌ Streaming request error:', err.message);
      resolve();
    });

    req.write(JSON.stringify(payload));
    req.end();
  });
}

async function runTests() {
  // Give the server a moment to make sure it's initialized
  setTimeout(async () => {
    await testNonStreaming();
    await testStreaming();
  }, 1000);
}

runTests();
