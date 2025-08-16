import { test, expect } from '@playwright/test';

test.describe('Redirect Loop Investigation', () => {
  test('should not have redirect loops on home page', async ({ page }) => {
    const redirects: string[] = [];
    
    // Track all navigation events
    page.on('request', (request) => {
      if (request.isNavigationRequest()) {
        console.log('Navigation to:', request.url());
      }
    });
    
    page.on('response', (response) => {
      if (response.status() >= 300 && response.status() < 400) {
        const location = response.headers()['location'];
        console.log('Redirect:', response.url(), '->', location);
        redirects.push(`${response.url()} -> ${location}`);
      }
    });

    try {
      await page.goto('http://localhost:3001', { 
        waitUntil: 'networkidle',
        timeout: 10000 
      });
      
      console.log('Final URL:', page.url());
      console.log('Total redirects:', redirects.length);
      redirects.forEach(r => console.log('  ', r));
      
      // Check we're not stuck in a loop
      expect(redirects.length).toBeLessThan(5);
      
    } catch (error) {
      console.error('Navigation failed:', error);
      console.log('Redirects captured:', redirects);
      throw error;
    }
  });

  test('should handle unauthenticated access correctly', async ({ page, context }) => {
    // Clear any existing auth cookies
    await context.clearCookies();
    
    const response = await page.goto('http://localhost:3001');
    console.log('Response status:', response?.status());
    console.log('Final URL:', page.url());
    
    // Should redirect to login
    expect(page.url()).toContain('/login');
  });
});