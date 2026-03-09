// popup.js — WP Plugin Checker

// ── Constants ──────────────────────────────────────────────────────────────────

const PRO_PATH  = '/wp-content/plugins/wp-mail-smtp-pro/CHANGELOG.md';
const LITE_PATH = '/wp-content/plugins/wp-mail-smtp/changelog.txt';

const WPFORMS_PRO_PATH  = '/wp-content/plugins/wpforms/CHANGELOG.md';
const WPFORMS_LITE_PATH = '/wp-content/plugins/wpforms-lite/changelog.txt';

// Matches: ## [4.0.0], ## 4.0.0, = 4.0.0 =
// Captures just the X.X.X version number
const VERSION_REGEX = /(?:##\s*\[?|=\s*)(\d+\.\d+\.\d+)/;

const FETCH_TIMEOUT_MS = 10000;

// ── DOM References ─────────────────────────────────────────────────────────────

const domainInput        = document.getElementById('domain-input');
const checkBtn           = document.getElementById('check-btn');
const currentTabHint     = document.getElementById('current-tab-hint');
const loadingSection     = document.getElementById('loading-section');
const errorSection       = document.getElementById('error-section');
const errorMessage       = document.getElementById('error-message');
const resultsSection     = document.getElementById('results-section');
const proStatus          = document.getElementById('pro-status');
const liteStatus         = document.getElementById('lite-status');
const wpformsProStatus   = document.getElementById('wpforms-pro-status');
const wpformsLiteStatus  = document.getElementById('wpforms-lite-status');
const checkedDomainLabel = document.getElementById('checked-domain-label');

// ── Initialization ─────────────────────────────────────────────────────────────

async function init() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && tab.url.startsWith('http')) {
      const rootDomain = extractRootDomain(tab.url);
      domainInput.value = rootDomain;
      currentTabHint.textContent = `Current tab: ${rootDomain}`;
    } else {
      currentTabHint.textContent = 'No HTTP tab detected. Enter a domain manually.';
    }
  } catch (_) {
    currentTabHint.textContent = 'Enter a domain to check.';
  }
}

// ── URL Utilities ──────────────────────────────────────────────────────────────

/**
 * Extracts scheme + host from any URL string.
 * Prepends https:// if no scheme is present.
 * Throws if the result is not a valid URL.
 */
function extractRootDomain(rawInput) {
  let normalized = rawInput.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }
  try {
    const url = new URL(normalized);
    return url.origin; // e.g. "https://example.com"
  } catch (_) {
    throw new Error(`"${rawInput}" is not a valid URL.`);
  }
}

// ── Version Parsing ────────────────────────────────────────────────────────────

/**
 * Scans the first 2000 characters of a changelog file for a semver string.
 * Returns the version string (e.g. "4.0.0") or null if not found.
 */
function parseVersion(content) {
  const head = content.substring(0, 2000);
  const match = head.match(VERSION_REGEX);
  return match ? match[1] : null;
}

// ── Fetch Logic ────────────────────────────────────────────────────────────────

/**
 * Fetches a plugin changelog URL.
 * Returns { found: true, version: string|null } or { found: false }.
 * Throws on genuine network errors (DNS failure, SSL error, timeout).
 */
async function checkPluginUrl(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      credentials: 'omit',
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { found: false };
    }

    const text = await response.text();

    // Guard: if the server redirected to an HTML login/error page, treat as not found
    const trimmed = text.trimStart().toLowerCase();
    if (trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')) {
      return { found: false };
    }

    const version = parseVersion(text);
    return { found: true, version };

  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${FETCH_TIMEOUT_MS / 1000}s. The site may be slow or unreachable.`);
    }

    throw new Error(`Network error: ${err.message}`);
  }
}

// ── UI State Management ────────────────────────────────────────────────────────

function showLoading() {
  loadingSection.classList.remove('hidden');
  errorSection.classList.add('hidden');
  resultsSection.classList.add('hidden');
  checkBtn.disabled = true;
  checkBtn.textContent = 'Checking…';
}

function showError(message) {
  loadingSection.classList.add('hidden');
  errorSection.classList.remove('hidden');
  resultsSection.classList.add('hidden');
  errorMessage.textContent = message;
  checkBtn.disabled = false;
  checkBtn.textContent = 'Check';
}

function renderStatus(el, result) {
  if (result.found) {
    el.innerHTML =
      '<span class="found">&#10003; Installed</span>' +
      (result.version
        ? `<span class="version">v${result.version}</span>`
        : '<span class="version-unknown">version unknown</span>');
  } else {
    el.innerHTML = '<span class="not-found">&#10007; Not Found</span>';
  }
}

function showResults(rootDomain, smtpPro, smtpLite, formsPro, formsLite) {
  loadingSection.classList.add('hidden');
  errorSection.classList.add('hidden');
  resultsSection.classList.remove('hidden');
  checkBtn.disabled = false;
  checkBtn.textContent = 'Check Again';

  renderStatus(proStatus, smtpPro);
  renderStatus(liteStatus, smtpLite);
  renderStatus(wpformsProStatus, formsPro);
  renderStatus(wpformsLiteStatus, formsLite);

  checkedDomainLabel.textContent = `Checked: ${rootDomain}`;

  // Badge count = number of distinct plugins detected (0, 1, or 2)
  const smtpFound  = smtpPro.found  || smtpLite.found;
  const formsFound = formsPro.found || formsLite.found;
  const count = (smtpFound ? 1 : 0) + (formsFound ? 1 : 0);
  chrome.runtime.sendMessage({ type: 'UPDATE_BADGE', count });
}

// ── Main Check ─────────────────────────────────────────────────────────────────

async function runCheck() {
  const rawInput = domainInput.value.trim();

  if (!rawInput) {
    showError('Please enter a domain to check.');
    return;
  }

  let rootDomain;
  try {
    rootDomain = extractRootDomain(rawInput);
  } catch (err) {
    showError(err.message);
    return;
  }

  showLoading();

  try {
    const [smtpPro, smtpLite, formsPro, formsLite] = await Promise.all([
      checkPluginUrl(rootDomain + PRO_PATH),
      checkPluginUrl(rootDomain + LITE_PATH),
      checkPluginUrl(rootDomain + WPFORMS_PRO_PATH),
      checkPluginUrl(rootDomain + WPFORMS_LITE_PATH),
    ]);
    showResults(rootDomain, smtpPro, smtpLite, formsPro, formsLite);
  } catch (err) {
    showError(err.message);
  }
}

// ── Event Listeners ────────────────────────────────────────────────────────────

checkBtn.addEventListener('click', runCheck);

domainInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') runCheck();
});

// ── Boot ───────────────────────────────────────────────────────────────────────

init();
