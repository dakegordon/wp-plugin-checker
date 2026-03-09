// background.js — Service worker for WP Plugin Checker
// Sole responsibility: manage the extension action badge.

// Badge shows how many distinct plugins are detected out of 2 (WP Mail SMTP + WPForms)
const BADGE_CONFIG = {
  0: { text: 'NONE', color: '#EF4444' }, // red   — neither plugin found
  1: { text: '1/2',  color: '#F97316' }, // orange — one plugin found
  2: { text: '2/2',  color: '#22C55E' }, // green  — both plugins found
};

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== 'UPDATE_BADGE') return;

  const config = BADGE_CONFIG[message.count];
  if (!config) return;

  chrome.action.setBadgeText({ text: config.text });
  chrome.action.setBadgeBackgroundColor({ color: config.color });
});

// Clear badge on install or browser startup
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: '' });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.action.setBadgeText({ text: '' });
});
