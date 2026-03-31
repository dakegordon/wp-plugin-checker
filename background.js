// background.js — Service worker for CSX WP Plugin Checker

// Open the side panel when the extension icon is clicked
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(() => {});

// Badge shows how many of the two primary AM plugins are detected (WP Mail SMTP + WPForms)
const BADGE_CONFIG = {
  0: { text: 'NONE', color: '#EF4444' },
  1: { text: '1/2',  color: '#F97316' },
  2: { text: '2/2',  color: '#22C55E' },
};

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== 'UPDATE_BADGE') return;
  const config = BADGE_CONFIG[message.count];
  if (!config) return;
  chrome.action.setBadgeText({ text: config.text });
  chrome.action.setBadgeBackgroundColor({ color: config.color });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: '' });
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  chrome.action.setBadgeText({ text: '' });
});
