const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Enable request logging
  page.on('request', request => {
    if (request.url().includes('localhost')) {
      console.log('>>>', request.method(), request.url());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('localhost') && response.status() >= 300 && response.status() < 400) {
      console.log('<<< REDIRECT:', response.status(), response.url(), '->', response.headers()['location']);
    }
  });

  console.log('Navigating to http://localhost:3001...');
  
  try {
    await page.goto('http://localhost:3001', { 
      waitUntil: 'networkidle',
      timeout: 10000 
    });
    console.log('Successfully loaded:', page.url());
  } catch (error) {
    console.error('Error:', error.message);
    console.log('Current URL:', page.url());
  }
  
  await browser.close();
})();