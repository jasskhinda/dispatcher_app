import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import * as http from 'http';

// Load environment variables
dotenv.config({ path: '.env.test' });

const execAsync = promisify(exec);

// Time to wait for the app to start (ms)
const APP_STARTUP_WAIT = 15000;

// Enhanced debug info
const DEBUG_MODE = true;

// Detect if app is already running
async function isAppRunning(port) {
  try {
    const { stdout } = await execAsync(`lsof -i:${port} -t`);
    return !!stdout.trim();
  } catch (error) {
    return false;
  }
}

// Test if we can actually connect to the server
async function canConnectToServer(url) {
  if (DEBUG_MODE) console.log(`Testing connection to: ${url}`);
  
  return new Promise((resolve) => {
    const request = http.get(url, (res) => {
      if (DEBUG_MODE) console.log(`Connection successful - Status: ${res.statusCode}`);
      resolve(true);
      res.resume();
    });
    
    request.on('error', (err) => {
      if (DEBUG_MODE) console.log(`Connection failed: ${err.message}`);
      resolve(false);
    });
    
    request.setTimeout(5000, () => {
      if (DEBUG_MODE) console.log('Connection timeout');
      request.destroy();
      resolve(false);
    });
  });
}

// Global setup function
async function globalSetup() {
  const port = process.env.TEST_PORT || 3015;
  const serverUrl = `http://localhost:${port}`;
  
  console.log(`\n🔍 Checking if app is already running on port ${port}...`);
  
  const running = await isAppRunning(port);
  
  if (running) {
    console.log(`✅ App appears to be running on port ${port}`);
    
    // Double check we can connect to it
    const canConnect = await canConnectToServer(serverUrl);
    if (canConnect) {
      console.log(`✅ Successfully connected to ${serverUrl}`);
    } else {
      console.log(`⚠️ App is running on port ${port} but we can't connect to it.`);
      console.log(`   It might be a different process - attempting to start our own server...`);
      startApplication(port);
    }
  } else {
    console.log(`⚙️ Starting application on port ${port}...`);
    startApplication(port);
  }
  
  // Final connection check and URL verification
  console.log(`\n🔄 Verifying server connection...`);
  let connectionAttempts = 0;
  const maxAttempts = 5;
  let connected = false;
  
  while (connectionAttempts < maxAttempts && !connected) {
    connectionAttempts++;
    connected = await canConnectToServer(serverUrl);
    
    if (connected) {
      console.log(`✅ Connection to ${serverUrl} verified (attempt ${connectionAttempts}/${maxAttempts})`);
      
      // Log the final baseURL that tests will use
      console.log(`\n📌 Tests will use baseURL: ${serverUrl}`);
      
      // Print the exact URLs that will be used in tests for debugging
      console.log(`   => Login URL: ${serverUrl}/login`);
      console.log(`   => Dashboard URL: ${serverUrl}/dashboard`);
      
      break;
    } else {
      console.log(`⏳ Waiting for server to be ready (attempt ${connectionAttempts}/${maxAttempts})...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  if (!connected) {
    console.error(`\n❌ ERROR: Could not connect to server at ${serverUrl} after ${maxAttempts} attempts`);
    console.error(`   Tests will likely fail with "Cannot navigate to invalid URL" errors`);
    console.error(`   Please start the server manually with: PORT=${port} yarn dev\n`);
  }
}

// Start the application
function startApplication(port) {
  // Start the Next.js application in the background
  const child = exec(`PORT=${port} npm run dev`);
  
  // Log output for debugging
  child.stdout.on('data', (data) => {
    if (DEBUG_MODE) {
      process.stdout.write(`[App] ${data}`);
    }
    
    if (data.includes('started server') || data.includes('ready')) {
      console.log(`✅ Next.js app started successfully on port ${port}`);
    }
  });
  
  child.stderr.on('data', (data) => {
    console.error(`⚠️ App startup error: ${data}`);
  });
  
  // Save the child process ID for teardown
  global.__APP_PROCESS__ = child;
  
  // Wait for app to start
  console.log(`⏳ Waiting ${APP_STARTUP_WAIT/1000} seconds for app to start...`);
  return new Promise(resolve => setTimeout(resolve, APP_STARTUP_WAIT));
}

// This function will be called after tests are complete
async function globalTeardown() {
  if (global.__APP_PROCESS__) {
    console.log('\n🛑 Shutting down test app instance...');
    global.__APP_PROCESS__.kill();
    console.log('✅ Test app instance shut down successfully\n');
  }
}

export { globalSetup, globalTeardown };
export default globalSetup;