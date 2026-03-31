// popup.js — WP Plugin Checker

// ── Constants ──────────────────────────────────────────────────────────────────

const PRO_PATH  = '/wp-content/plugins/wp-mail-smtp-pro/CHANGELOG.md';
const LITE_PATH = '/wp-content/plugins/wp-mail-smtp/changelog.txt';

const WPFORMS_PRO_PATH  = '/wp-content/plugins/wpforms/CHANGELOG.md';
const WPFORMS_LITE_PATH = '/wp-content/plugins/wpforms-lite/changelog.txt';

// Matches: ## [4.0.0], ## 4.0.0, = 4.0.0 =
// Captures X.X.X or X.X.X.X (WPForms uses 4-segment versioning)
const VERSION_REGEX = /(?:##\s*\[?|=\s*)(\d+\.\d+\.\d+(?:\.\d+)?)/;

const FETCH_TIMEOUT_MS = 10000;
const WPORG_TIMEOUT_MS = 5000;

const WPORG_API_SMTP  = 'https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&slug=wp-mail-smtp';
const WPORG_API_FORMS = 'https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&slug=wpforms-lite';

// Competitor plugins — third-party alternatives to AM products.
// When detected, the agent should send a CSX offer and tag the ticket: csx: competitor
const COMPETITOR_PLUGINS = [
  // SMTP → offer WP Mail SMTP
  { name: 'FluentSMTP',   slug: 'fluent-smtp',   path: '/wp-content/plugins/fluent-smtp/readme.txt',   offer: 'WP Mail SMTP' },
  { name: 'Postman SMTP', slug: 'postman-smtp',  path: '/wp-content/plugins/postman-smtp/readme.txt',  offer: 'WP Mail SMTP' },
  { name: 'WP SMTP',      slug: 'wp-smtp',       path: '/wp-content/plugins/wp-smtp/readme.txt',       offer: 'WP Mail SMTP' },
  { name: 'SMTP Mailer',  slug: 'smtp-mailer',   path: '/wp-content/plugins/smtp-mailer/readme.txt',   offer: 'WP Mail SMTP' },
  { name: 'Mailgun',      slug: 'mailgun',       path: '/wp-content/plugins/mailgun/readme.txt',       offer: 'WP Mail SMTP' },
  // Forms → offer WPForms
  { name: 'Gravity Forms',    slug: 'gravityforms',   path: '/wp-content/plugins/gravityforms/changelog.txt', offer: 'WPForms' },
  { name: 'Ninja Forms',      slug: 'ninja-forms',    path: '/wp-content/plugins/ninja-forms/readme.txt',    offer: 'WPForms' },
  { name: 'Contact Form 7',   slug: 'contact-form-7', path: '/wp-content/plugins/contact-form-7/readme.txt', offer: 'WPForms' },
  { name: 'Fluent Forms',     slug: 'fluentform',     path: '/wp-content/plugins/fluentform/readme.txt',     offer: 'WPForms' },
  { name: 'Formidable Forms', slug: 'formidable',     path: '/wp-content/plugins/formidable/readme.txt',     offer: 'WPForms' },
  { name: 'WS Form',          slug: 'ws-form-lite',   path: '/wp-content/plugins/ws-form-lite/readme.txt',   offer: 'WPForms' },
  // Popup / lead capture → offer OptinMonster
  { name: 'Popup Maker', slug: 'popup-maker',      path: '/wp-content/plugins/popup-maker/readme.txt',      offer: 'OptinMonster' },
  { name: 'Hustle',      slug: 'wordpress-popup',  path: '/wp-content/plugins/wordpress-popup/readme.txt',  offer: 'OptinMonster' },
  { name: 'Sumo',        slug: 'sumome',           path: '/wp-content/plugins/sumome/readme.txt',           offer: 'OptinMonster' },
  { name: 'ConvertPro',  slug: 'convertpro',       path: '/wp-content/plugins/convertpro/readme.txt',       offer: 'OptinMonster' },
  // Analytics → offer MonsterInsights
  { name: 'Analytify',          slug: 'analytify',       path: '/wp-content/plugins/analytify/readme.txt',       offer: 'MonsterInsights' },
  { name: 'Site Kit by Google', slug: 'google-site-kit', path: '/wp-content/plugins/google-site-kit/readme.txt', offer: 'MonsterInsights' },
  { name: 'WP Statistics',      slug: 'wp-statistics',   path: '/wp-content/plugins/wp-statistics/readme.txt',   offer: 'MonsterInsights' },
  { name: 'Matomo',             slug: 'wp-piwik',        path: '/wp-content/plugins/wp-piwik/readme.txt',        offer: 'MonsterInsights' },
  // Events / calendar → offer Sugar Calendar
  { name: 'The Events Calendar',    slug: 'the-events-calendar',         path: '/wp-content/plugins/the-events-calendar/readme.txt',         offer: 'Sugar Calendar' },
  { name: 'Modern Events Calendar', slug: 'modern-events-calendar-lite', path: '/wp-content/plugins/modern-events-calendar-lite/readme.txt', offer: 'Sugar Calendar' },
  { name: 'Amelia',                 slug: 'ameliabooking',               path: '/wp-content/plugins/ameliabooking/readme.txt',               offer: 'Sugar Calendar' },
  { name: 'Bookly',                 slug: 'bookly-responsive-appointment-booking-tool', path: '/wp-content/plugins/bookly-responsive-appointment-booking-tool/readme.txt', offer: 'Sugar Calendar' },
  // Donations → offer WPCharitable
  { name: 'GiveWP', slug: 'give', path: '/wp-content/plugins/give/readme.txt', offer: 'WPCharitable' },
  // SEO → offer AIOSEO
  { name: 'Yoast SEO',         slug: 'wordpress-seo',    path: '/wp-content/plugins/wordpress-seo/readme.txt',    offer: 'AIOSEO' },
  { name: 'RankMath',          slug: 'seo-by-rank-math', path: '/wp-content/plugins/seo-by-rank-math/readme.txt', offer: 'AIOSEO' },
  { name: 'SEOPress',          slug: 'wp-seopress',      path: '/wp-content/plugins/wp-seopress/readme.txt',      offer: 'AIOSEO' },
  { name: 'The SEO Framework', slug: 'autodescription',  path: '/wp-content/plugins/autodescription/readme.txt',  offer: 'AIOSEO' },
  // Cookie consent → offer WPConsent
  { name: 'CookieYes',           slug: 'cookie-law-info',        path: '/wp-content/plugins/cookie-law-info/readme.txt',        offer: 'WPConsent' },
  { name: 'Complianz',           slug: 'complianz-gdpr',         path: '/wp-content/plugins/complianz-gdpr/readme.txt',         offer: 'WPConsent' },
  { name: 'Cookie Notice',       slug: 'cookie-notice',          path: '/wp-content/plugins/cookie-notice/readme.txt',          offer: 'WPConsent' },
  { name: 'GDPR Cookie Consent', slug: 'gdpr-cookie-compliance', path: '/wp-content/plugins/gdpr-cookie-compliance/readme.txt', offer: 'WPConsent' },
];

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
const competitorSection  = document.getElementById('competitor-section');
const competitorCards    = document.getElementById('competitor-cards');
const modeBadge          = document.getElementById('mode-badge');

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

/**
 * Compares two version strings (X.Y.Z or X.Y.Z.W).
 * Returns -1 if a < b, 0 if equal, 1 if a > b.
 */
function compareVersions(a, b) {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA > numB) return  1;
    if (numA < numB) return -1;
  }
  return 0;
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

/**
 * Fetches the latest plugin version from the WordPress.org plugins API.
 * Returns the version string (e.g. "4.7.1") on success, or null on any failure.
 * Never throws.
 */
async function fetchLatestVersionFromWpOrg(apiUrl) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WPORG_TIMEOUT_MS);

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      signal: controller.signal,
      credentials: 'omit',
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data = await response.json();
    const version = typeof data.version === 'string' ? data.version.trim() : null;
    return version && /^\d+\.\d+\.\d+(?:\.\d+)?$/.test(version) ? version : null;

  } catch (_) {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Checks all competitor plugins against the given origin by fetching their
 * readme/changelog paths in parallel. Silently ignores per-plugin failures.
 * Returns an array of matched COMPETITOR_PLUGINS entries.
 */
async function checkCompetitorPlugins(origin) {
  const results = await Promise.all(
    COMPETITOR_PLUGINS.map(async (plugin) => {
      try {
        const r = await checkPluginUrl(origin + plugin.path);
        return r.found ? plugin : null;
      } catch (_) {
        return null;
      }
    })
  );
  return results.filter(Boolean);
}

/**
 * If the current tab is wp-admin/plugins.php, executes a script in the tab
 * to read the installed plugins list directly from the DOM.
 * Returns an array of { slug, name, active, version } or null if not on admin page.
 */
async function tryGetAdminPlugins(tabId, tabUrl) {
  if (!tabUrl || !tabUrl.includes('/wp-admin/plugins.php')) return null;
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const rows = document.querySelectorAll('#the-list tr[data-plugin]');
        return Array.from(rows).map(row => ({
          slug:    row.dataset.plugin.split('/')[0],
          name:    row.querySelector('.plugin-title strong')?.textContent?.trim() ?? '',
          active:  row.classList.contains('active'),
          version: row.querySelector('.plugin-version-author-uri')
            ?.textContent?.match(/Version\s+(\d+\.\d+\.\d+(?:\.\d+)?)/)?.[1] ?? null,
        })).filter(p => p.name);
      },
    });
    return result ?? null;
  } catch (_) {
    return null;
  }
}

/**
 * Converts an admin plugins list entry to the same shape as checkPluginUrl().
 */
function getAmPluginFromAdmin(adminPlugins, slug) {
  const p = adminPlugins.find(ap => ap.slug === slug);
  return p ? { found: true, version: p.version ?? null } : { found: false };
}

/**
 * Matches admin plugins list against COMPETITOR_PLUGINS by slug.
 * Returns matching COMPETITOR_PLUGINS entries.
 */
function matchCompetitorsFromAdminPlugins(adminPlugins) {
  const adminSlugs = new Set(adminPlugins.map(p => p.slug));
  return COMPETITOR_PLUGINS.filter(c => adminSlugs.has(c.slug));
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

function renderStatus(el, result, latestVersion) {
  if (!result.found) {
    el.innerHTML = '<span class="not-found">&#10007; Not Found</span>';
    return;
  }

  const versionBadge = result.version
    ? `<span class="version">v${result.version}</span>`
    : '<span class="version-unknown">version unknown</span>';

  let updateLine = '';
  if (result.version) {
    if (latestVersion) {
      if (compareVersions(result.version, latestVersion) >= 0) {
        updateLine = '<div class="update-line"><span class="update-status up-to-date">&#10003; Up to date</span></div>';
      } else {
        updateLine = `<div class="update-line"><span class="update-status update-available">&#8593; v${latestVersion} available</span></div>`;
      }
    } else {
      updateLine = '<div class="update-line"><span class="update-status update-unknown">latest version unknown</span></div>';
    }
  }

  el.innerHTML =
    '<div class="install-line"><span class="found">&#10003; Installed</span>' + versionBadge + '</div>' +
    updateLine;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderCompetitorSection(competitors) {
  if (!competitors.length) {
    competitorSection.classList.add('hidden');
    return;
  }

  // Group competitors by the AM product to offer
  const byOffer = {};
  for (const c of competitors) {
    if (!byOffer[c.offer]) byOffer[c.offer] = [];
    byOffer[c.offer].push(c.name);
  }

  competitorCards.innerHTML = '';
  for (const [offer, names] of Object.entries(byOffer)) {
    const card = document.createElement('div');
    card.className = 'competitor-card';
    card.innerHTML =
      `<div class="competitor-row">` +
        `<span class="competitor-meta-label">Detected</span>` +
        `<span class="competitor-plugin-names">${escapeHtml(names.join(', '))}</span>` +
      `</div>` +
      `<div class="competitor-row">` +
        `<span class="competitor-meta-label">Offer</span>` +
        `<span class="competitor-offer-name">${escapeHtml(offer)}</span>` +
      `</div>` +
      `<div class="competitor-tag-row">` +
        `<span class="csx-tag">csx: competitor</span>` +
      `</div>`;
    competitorCards.appendChild(card);
  }

  competitorSection.classList.remove('hidden');
}

function showResults(rootDomain, smtpPro, smtpLite, formsPro, formsLite, latestSmtp, latestForms, competitors, isAdminMode) {
  loadingSection.classList.add('hidden');
  errorSection.classList.add('hidden');
  resultsSection.classList.remove('hidden');
  checkBtn.disabled = false;
  checkBtn.textContent = 'Check Again';

  renderStatus(proStatus,         smtpPro,   latestSmtp);
  renderStatus(liteStatus,        smtpLite,  latestSmtp);
  renderStatus(wpformsProStatus,  formsPro,  latestForms);
  renderStatus(wpformsLiteStatus, formsLite, latestForms);

  modeBadge.textContent = isAdminMode ? 'Admin Mode' : '';
  modeBadge.classList.toggle('hidden', !isAdminMode);

  checkedDomainLabel.textContent = `Checked: ${rootDomain}`;

  renderCompetitorSection(competitors);

  // Badge count = number of distinct AM plugins detected (0, 1, or 2)
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
    // Get current tab for admin mode detection
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId  = tab?.id;
    const tabUrl = tab?.url ?? '';

    // Kick off WP.org latest-version fetches immediately — they don't depend on mode
    const wpOrgPromise = Promise.all([
      fetchLatestVersionFromWpOrg(WPORG_API_SMTP),
      fetchLatestVersionFromWpOrg(WPORG_API_FORMS),
    ]);

    // Attempt admin mode — reads the plugins list directly from wp-admin/plugins.php
    const adminPlugins = await tryGetAdminPlugins(tabId, tabUrl);
    const isAdminMode  = adminPlugins !== null;

    let smtpPro, smtpLite, formsPro, formsLite, competitors;

    if (isAdminMode) {
      // Get plugin status and competitors directly from the DOM — faster and more reliable
      smtpPro     = getAmPluginFromAdmin(adminPlugins, 'wp-mail-smtp-pro');
      smtpLite    = getAmPluginFromAdmin(adminPlugins, 'wp-mail-smtp');
      formsPro    = getAmPluginFromAdmin(adminPlugins, 'wpforms');
      formsLite   = getAmPluginFromAdmin(adminPlugins, 'wpforms-lite');
      competitors = matchCompetitorsFromAdminPlugins(adminPlugins);
    } else {
      // Public scan: fetch changelogs and competitor readme files in parallel
      [smtpPro, smtpLite, formsPro, formsLite, competitors] = await Promise.all([
        checkPluginUrl(rootDomain + PRO_PATH),
        checkPluginUrl(rootDomain + LITE_PATH),
        checkPluginUrl(rootDomain + WPFORMS_PRO_PATH),
        checkPluginUrl(rootDomain + WPFORMS_LITE_PATH),
        checkCompetitorPlugins(rootDomain),
      ]);
    }

    const [latestSmtp, latestForms] = await wpOrgPromise;

    showResults(rootDomain, smtpPro, smtpLite, formsPro, formsLite, latestSmtp, latestForms, competitors, isAdminMode);
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
