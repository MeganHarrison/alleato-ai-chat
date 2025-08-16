// Validate Notion webhook signatures
export async function validateWebhook(
  request: Request,
  secret: string
): Promise<boolean> {
  try {
    const signature = request.headers.get('X-Notion-Signature');
    if (!signature) return false;

    const timestamp = request.headers.get('X-Notion-Request-Timestamp');
    if (!timestamp) return false;

    // Check timestamp is recent (within 5 minutes)
    const requestTime = parseInt(timestamp);
    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - requestTime) > 300) {
      return false;
    }

    // Get request body
    const body = await request.text();

    // Create signature
    const encoder = new TextEncoder();
    const data = encoder.encode(`${timestamp}.${body}`);
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, data);
    const computedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

    return computedSignature === signature;
  } catch (error) {
    console.error('Webhook validation error:', error);
    return false;
  }
}