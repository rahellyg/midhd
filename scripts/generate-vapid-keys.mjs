#!/usr/bin/env node
/**
 * Generate VAPID keys for Web Push. Run once and put the output in .env.push
 * as WEB_PUSH_PUBLIC_KEY and WEB_PUSH_PRIVATE_KEY.
 */
import webpush from 'web-push';

const { publicKey, privateKey } = webpush.generateVAPIDKeys();
console.log('Add these to .env.push (or .env):\n');
console.log('WEB_PUSH_PUBLIC_KEY=' + publicKey);
console.log('WEB_PUSH_PRIVATE_KEY=' + privateKey);
console.log('\nAlso set VITE_WEB_PUSH_PUBLIC_KEY=' + publicKey + ' for the frontend (or use the same in your app env).');
