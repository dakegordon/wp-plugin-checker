// popup.js — CSX WP Plugin Checker

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

// All 31 WPForms add-on slugs. Checked when WPForms is detected.
const WPFORMS_ADDONS = [
  'wpforms-stripe', 'wpforms-paypal-commerce', 'wpforms-square',
  'wpforms-authorize-net', 'wpforms-calculations', 'wpforms-coupons',
  'wpforms-form-abandonment', 'wpforms-lead-forms', 'wpforms-conversational-forms',
  'wpforms-surveys-polls', 'wpforms-signatures', 'wpforms-save-resume',
  'wpforms-form-locker', 'wpforms-user-registration', 'wpforms-post-submissions',
  'wpforms-geolocation', 'wpforms-google-sheets', 'wpforms-google-calendar',
  'wpforms-google-drive', 'wpforms-dropbox', 'wpforms-airtable',
  'wpforms-hubspot', 'wpforms-salesforce', 'wpforms-pipedrive',
  'wpforms-zoho-crm', 'wpforms-notion', 'wpforms-slack',
  'wpforms-zapier', 'wpforms-webhooks', 'wpforms-entry-automation',
  'wpforms-pdf',
];

// AM products offered via CSX — maps offer name to known plugin paths (both lite and pro).
// Used to suppress competitor cards when the AM product is already installed.
const AM_PRODUCTS = {
  'WP Mail SMTP': [
    '/wp-content/plugins/wp-mail-smtp-pro/CHANGELOG.md',
    '/wp-content/plugins/wp-mail-smtp/changelog.txt',
  ],
  'WPForms': [
    '/wp-content/plugins/wpforms/CHANGELOG.md',
    '/wp-content/plugins/wpforms-lite/changelog.txt',
  ],
  'OptinMonster': [
    '/wp-content/plugins/optinmonster/readme.txt',
  ],
  'MonsterInsights': [
    '/wp-content/plugins/google-analytics-for-wordpress/readme.txt',
    '/wp-content/plugins/google-analytics-premium/readme.txt',
  ],
  'Sugar Calendar': [
    '/wp-content/plugins/sugar-calendar/readme.txt',
    '/wp-content/plugins/sugar-calendar-lite/readme.txt',
  ],
  'WPCharitable': [
    '/wp-content/plugins/charitable/readme.txt',
  ],
  'AIOSEO': [
    '/wp-content/plugins/all-in-one-seo-pack/readme.txt',
  ],
  'WPConsent': [
    '/wp-content/plugins/wpconsent/readme.txt',
  ],
};

// Competitor plugins — third-party alternatives to AM products.
// paths: array so we try multiple locations and pro/free variants.
// When detected (and the AM product isn't already installed), show a CSX opportunity card.
const COMPETITOR_PLUGINS = [
  // SMTP → offer WP Mail SMTP
  { name: 'FluentSMTP',   slug: 'fluent-smtp',   paths: ['/wp-content/plugins/fluent-smtp/readme.txt'],   offer: 'WP Mail SMTP' },
  { name: 'Postman SMTP', slug: 'postman-smtp',  paths: ['/wp-content/plugins/postman-smtp/readme.txt'],  offer: 'WP Mail SMTP' },
  { name: 'WP SMTP',      slug: 'wp-smtp',       paths: ['/wp-content/plugins/wp-smtp/readme.txt'],       offer: 'WP Mail SMTP' },
  { name: 'SMTP Mailer',  slug: 'smtp-mailer',   paths: ['/wp-content/plugins/smtp-mailer/readme.txt'],   offer: 'WP Mail SMTP' },
  { name: 'Mailgun',      slug: 'mailgun',       paths: ['/wp-content/plugins/mailgun/readme.txt'],       offer: 'WP Mail SMTP' },
  // Forms → offer WPForms
  { name: 'Gravity Forms',    slug: 'gravityforms',   paths: ['/wp-content/plugins/gravityforms/changelog.txt', '/wp-content/plugins/gravityforms/readme.txt'], offer: 'WPForms' },
  { name: 'Ninja Forms',      slug: 'ninja-forms',    paths: ['/wp-content/plugins/ninja-forms/readme.txt'],    offer: 'WPForms' },
  { name: 'Contact Form 7',   slug: 'contact-form-7', paths: ['/wp-content/plugins/contact-form-7/readme.txt'], offer: 'WPForms' },
  { name: 'Fluent Forms',     slug: 'fluentform',     paths: ['/wp-content/plugins/fluentform/readme.txt'],     offer: 'WPForms' },
  { name: 'Formidable Forms', slug: 'formidable',     paths: ['/wp-content/plugins/formidable/readme.txt'],     offer: 'WPForms' },
  { name: 'WS Form',          slug: 'ws-form-lite',   paths: ['/wp-content/plugins/ws-form-lite/readme.txt'],   offer: 'WPForms' },
  // Popup / lead capture → offer OptinMonster
  { name: 'Popup Maker', slug: 'popup-maker',     paths: ['/wp-content/plugins/popup-maker/readme.txt'],     offer: 'OptinMonster' },
  { name: 'Hustle',      slug: 'wordpress-popup', paths: ['/wp-content/plugins/wordpress-popup/readme.txt'], offer: 'OptinMonster' },
  { name: 'Sumo',        slug: 'sumome',          paths: ['/wp-content/plugins/sumome/readme.txt'],          offer: 'OptinMonster' },
  { name: 'ConvertPro',  slug: 'convertpro',      paths: ['/wp-content/plugins/convertpro/readme.txt'],      offer: 'OptinMonster' },
  // Analytics → offer MonsterInsights
  { name: 'Analytify',          slug: 'analytify',       paths: ['/wp-content/plugins/analytify/readme.txt'],       offer: 'MonsterInsights' },
  { name: 'Site Kit by Google', slug: 'google-site-kit', paths: ['/wp-content/plugins/google-site-kit/readme.txt'], offer: 'MonsterInsights' },
  { name: 'WP Statistics',      slug: 'wp-statistics',   paths: ['/wp-content/plugins/wp-statistics/readme.txt'],   offer: 'MonsterInsights' },
  { name: 'Matomo',             slug: 'wp-piwik',        paths: ['/wp-content/plugins/wp-piwik/readme.txt'],        offer: 'MonsterInsights' },
  // Events / calendar → offer Sugar Calendar
  { name: 'The Events Calendar',    slug: 'the-events-calendar',         paths: ['/wp-content/plugins/the-events-calendar/readme.txt', '/wp-content/plugins/tribe-events-calendar-pro/readme.txt'], offer: 'Sugar Calendar' },
  { name: 'Modern Events Calendar', slug: 'modern-events-calendar-lite', paths: ['/wp-content/plugins/modern-events-calendar-lite/readme.txt'], offer: 'Sugar Calendar' },
  { name: 'Amelia',                 slug: 'ameliabooking',               paths: ['/wp-content/plugins/ameliabooking/readme.txt'],               offer: 'Sugar Calendar' },
  { name: 'Bookly',                 slug: 'bookly-responsive-appointment-booking-tool', paths: ['/wp-content/plugins/bookly-responsive-appointment-booking-tool/readme.txt'], offer: 'Sugar Calendar' },
  // Donations → offer WPCharitable
  { name: 'GiveWP', slug: 'give', paths: ['/wp-content/plugins/give/readme.txt'], offer: 'WPCharitable' },
  // SEO → offer AIOSEO
  { name: 'Yoast SEO',         slug: 'wordpress-seo',    paths: ['/wp-content/plugins/wordpress-seo/readme.txt', '/wp-content/plugins/wordpress-seo-premium/readme.txt'], offer: 'AIOSEO' },
  { name: 'RankMath',          slug: 'seo-by-rank-math', paths: ['/wp-content/plugins/seo-by-rank-math/readme.txt'],  offer: 'AIOSEO' },
  { name: 'SEOPress',          slug: 'wp-seopress',      paths: ['/wp-content/plugins/wp-seopress/readme.txt'],       offer: 'AIOSEO' },
  { name: 'The SEO Framework', slug: 'autodescription',  paths: ['/wp-content/plugins/autodescription/readme.txt'],   offer: 'AIOSEO' },
  // Cookie consent → offer WPConsent
  { name: 'CookieYes',           slug: 'cookie-law-info',        paths: ['/wp-content/plugins/cookie-law-info/readme.txt'],        offer: 'WPConsent' },
  { name: 'Complianz',           slug: 'complianz-gdpr',         paths: ['/wp-content/plugins/complianz-gdpr/readme.txt'],         offer: 'WPConsent' },
  { name: 'Cookie Notice',       slug: 'cookie-notice',          paths: ['/wp-content/plugins/cookie-notice/readme.txt'],          offer: 'WPConsent' },
  { name: 'GDPR Cookie Consent', slug: 'gdpr-cookie-compliance', paths: ['/wp-content/plugins/gdpr-cookie-compliance/readme.txt'], offer: 'WPConsent' },
];

// ── DOM References ─────────────────────────────────────────────────────────────

const domainInput        = document.getElementById('domain-input');
const checkBtn           = document.getElementById('check-btn');
const currentTabHint     = document.getElementById('current-tab-hint');
const loadingSection     = document.getElementById('loading-section');
const loadingStatusText  = document.getElementById('loading-status-text');
const errorSection       = document.getElementById('error-section');
const errorMessage       = document.getElementById('error-message');
const resultsSection     = document.getElementById('results-section');
const notWpBanner        = document.getElementById('not-wp-banner');
const proStatus          = document.getElementById('pro-status');
const liteStatus         = document.getElementById('lite-status');
const wpformsProStatus   = document.getElementById('wpforms-pro-status');
const wpformsLiteStatus  = document.getElementById('wpforms-lite-status');
const addonSection       = document.getElementById('addon-section');
const addonList          = document.getElementById('addon-list');
const smtpCsxSection     = document.getElementById('smtp-csx-section');
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
    return url.origin;
  } catch (_) {
    throw new Error(`"${rawInput}" is not a valid URL.`);
  }
}

// ── Version Parsing ────────────────────────────────────────────────────────────

function parseVersion(content) {
  const head = content.substring(0, 2000);
  const match = head.match(VERSION_REGEX);
  return match ? match[1] : null;
}

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
 * Returns { found: true, version } or { found: false }.
 * Throws on network errors or timeout.
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

    if (!response.ok) return { found: false };

    const text = await response.text();

    // Guard: if the server returned an HTML page (e.g. login redirect), treat as not found
    const trimmed = text.trimStart().toLowerCase();
    if (trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')) {
      return { found: false };
    }

    return { found: true, version: parseVersion(text) };

  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`TIMEOUT`);
    }
    throw new Error(`NETWORK:${err.message}`);
  }
}

/**
 * Checks if a URL is reachable (any 200 response). Used for WordPress detection.
 * Unlike checkPluginUrl, HTML responses count as "found". Never throws.
 */
async function checkUrlExists(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      credentials: 'omit',
      cache: 'no-store',
    });
    clearTimeout(timeoutId);
    return r.ok;
  } catch (_) {
    clearTimeout(timeoutId);
    return false;
  }
}

/**
 * Tries multiple paths in parallel; returns the first found result, or { found: false }.
 * Never throws — per-path failures are silently caught.
 */
async function checkMultiplePaths(origin, paths) {
  const results = await Promise.all(
    paths.map(async (p) => {
      try { return await checkPluginUrl(origin + p); }
      catch (_) { return { found: false }; }
    })
  );
  return results.find(r => r.found) ?? { found: false };
}

/**
 * Fetches the latest plugin version from the WordPress.org plugins API.
 * Returns version string or null. Never throws.
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
 * Checks all competitor plugins in parallel.
 * Returns matched COMPETITOR_PLUGINS entries (each may have an .active property in admin mode).
 */
async function checkCompetitorPlugins(origin) {
  const results = await Promise.all(
    COMPETITOR_PLUGINS.map(async (plugin) => {
      const r = await checkMultiplePaths(origin, plugin.paths);
      return r.found ? plugin : null;
    })
  );
  return results.filter(Boolean);
}

/**
 * Checks which AM products (beyond WP Mail SMTP / WPForms) are already installed.
 * Returns a Set of offer names. Used to suppress irrelevant competitor cards.
 */
async function checkAmProducts(origin) {
  const entries = Object.entries(AM_PRODUCTS);
  const results = await Promise.all(
    entries.map(async ([offer, paths]) => {
      const r = await checkMultiplePaths(origin, paths);
      return r.found ? offer : null;
    })
  );
  return new Set(results.filter(Boolean));
}

/**
 * Checks which WPForms add-ons are installed. Only meaningful when WPForms is detected.
 * Returns array of installed addon slugs.
 */
async function checkWpformsAddons(origin) {
  const results = await Promise.all(
    WPFORMS_ADDONS.map(async (slug) => {
      try {
        const r = await checkPluginUrl(
          `${origin}/wp-content/plugins/${slug}/CHANGELOG.md`
        );
        return r.found ? slug : null;
      } catch (_) { return null; }
    })
  );
  return results.filter(Boolean);
}

/**
 * Returns true if the site appears to be WordPress.
 * Used as a diagnostic signal — does not block plugin checks.
 */
async function checkIsWordPress(origin) {
  const [a, b] = await Promise.all([
    checkUrlExists(origin + '/wp-login.php'),
    checkUrlExists(origin + '/wp-admin/'),
  ]);
  return a || b;
}

// ── Admin Mode Helpers ─────────────────────────────────────────────────────────

/**
 * If the current tab is wp-admin/plugins.php, executes a script in the tab
 * to read the installed plugins list from the DOM.
 * Returns array of { slug, name, active, version } or null if not on admin page.
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

function getAmPluginFromAdmin(adminPlugins, slug) {
  const p = adminPlugins.find(ap => ap.slug === slug);
  return p ? { found: true, version: p.version ?? null } : { found: false };
}

/**
 * Matches admin plugins list against COMPETITOR_PLUGINS by slug.
 * Includes the active status from the admin list.
 */
function matchCompetitorsFromAdminPlugins(adminPlugins) {
  const adminSlugMap = new Map(adminPlugins.map(p => [p.slug, p]));
  return COMPETITOR_PLUGINS
    .filter(c => adminSlugMap.has(c.slug))
    .map(c => ({ ...c, active: adminSlugMap.get(c.slug).active }));
}

/**
 * Derives which AM products are already installed from the admin plugins list.
 * Extracts slugs from AM_PRODUCTS paths and matches against admin list.
 */
function getInstalledAmProductsFromAdmin(adminPlugins) {
  const adminSlugs = new Set(adminPlugins.map(p => p.slug));
  const installed = new Set();
  for (const [offer, paths] of Object.entries(AM_PRODUCTS)) {
    const slugs = paths.map(p => p.split('/wp-content/plugins/')[1]?.split('/')[0]).filter(Boolean);
    if (slugs.some(s => adminSlugs.has(s))) installed.add(offer);
  }
  return installed;
}

function getAddonSlugsFromAdmin(adminPlugins) {
  const adminSlugs = new Set(adminPlugins.map(p => p.slug));
  return WPFORMS_ADDONS.filter(slug => adminSlugs.has(slug));
}

// ── UI Helpers ─────────────────────────────────────────────────────────────────

function addonSlugToName(slug) {
  return slug
    .replace('wpforms-', '')
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Creates a clickable tag pill that copies its text to the clipboard on click.
 */
function makeCopyableTag(text) {
  const el = document.createElement('span');
  el.className = 'csx-tag';
  el.textContent = text;
  el.title = 'Click to copy';
  el.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(text);
      el.textContent = 'Copied!';
      el.classList.add('csx-tag-copied');
      setTimeout(() => {
        el.textContent = text;
        el.classList.remove('csx-tag-copied');
      }, 1500);
    } catch (_) { /* clipboard permission denied */ }
  });
  return el;
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

function renderAddonSection(installedAddons, wpformsFound) {
  if (!wpformsFound) {
    addonSection.classList.add('hidden');
    return;
  }
  addonSection.classList.remove('hidden');
  if (!installedAddons.length) {
    addonList.textContent = 'None detected';
    return;
  }
  addonList.textContent = installedAddons.map(addonSlugToName).join(', ');
}

function renderSmtpCsxSection(wpformsFound, smtpFound) {
  if (!wpformsFound || smtpFound) {
    smtpCsxSection.classList.add('hidden');
    return;
  }
  // Replace tag placeholder with a copyable tag element
  const container = smtpCsxSection.querySelector('.csx-tag-container');
  container.innerHTML = '';
  container.appendChild(makeCopyableTag('csx: trigger – smtp'));
  smtpCsxSection.classList.remove('hidden');
}

function renderCompetitorSection(competitors, installedAmProducts, isAdminMode) {
  // Filter out offers where the AM product is already installed
  const actionable = competitors.filter(c => !installedAmProducts.has(c.offer));

  if (!actionable.length) {
    competitorSection.classList.add('hidden');
    return;
  }

  // Group by offer, preserving active status per plugin
  const byOffer = {};
  for (const c of actionable) {
    if (!byOffer[c.offer]) byOffer[c.offer] = [];
    byOffer[c.offer].push({ name: c.name, active: c.active });
  }

  competitorCards.innerHTML = '';
  for (const [offer, entries] of Object.entries(byOffer)) {
    const card = document.createElement('div');
    card.className = 'competitor-card';

    // Detected row — names with optional active/inactive badge
    const detectedRow = document.createElement('div');
    detectedRow.className = 'competitor-row';
    const metaLabel = document.createElement('span');
    metaLabel.className = 'competitor-meta-label';
    metaLabel.textContent = 'Detected';
    const namesEl = document.createElement('span');
    namesEl.className = 'competitor-plugin-names';
    entries.forEach((entry, i) => {
      if (i > 0) namesEl.append(', ');
      namesEl.append(entry.name);
      if (isAdminMode && entry.active !== undefined) {
        const badge = document.createElement('span');
        badge.className = `plugin-active-badge ${entry.active ? 'active' : 'inactive'}`;
        badge.textContent = entry.active ? 'Active' : 'Inactive';
        namesEl.appendChild(badge);
      }
    });
    detectedRow.appendChild(metaLabel);
    detectedRow.appendChild(namesEl);

    // Offer row
    const offerRow = document.createElement('div');
    offerRow.className = 'competitor-row';
    offerRow.innerHTML =
      `<span class="competitor-meta-label">Offer</span>` +
      `<span class="competitor-offer-name">${escapeHtml(offer)}</span>`;

    // Tag row — copyable
    const tagRow = document.createElement('div');
    tagRow.className = 'competitor-tag-row';
    tagRow.appendChild(makeCopyableTag('csx: competitor'));

    card.appendChild(detectedRow);
    card.appendChild(offerRow);
    card.appendChild(tagRow);
    competitorCards.appendChild(card);
  }

  competitorSection.classList.remove('hidden');
}

function showResults(
  rootDomain, smtpPro, smtpLite, formsPro, formsLite,
  latestSmtp, latestForms,
  competitors, installedAmProducts, installedAddons,
  isAdminMode, isWordPress
) {
  loadingSection.classList.add('hidden');
  errorSection.classList.add('hidden');
  resultsSection.classList.remove('hidden');
  checkBtn.disabled = false;
  checkBtn.textContent = 'Check Again';

  // AM plugin status rows
  renderStatus(proStatus,         smtpPro,   latestSmtp);
  renderStatus(liteStatus,        smtpLite,  latestSmtp);
  renderStatus(wpformsProStatus,  formsPro,  latestForms);
  renderStatus(wpformsLiteStatus, formsLite, latestForms);

  // WPForms add-ons
  const wpformsFound = formsPro.found || formsLite.found;
  renderAddonSection(installedAddons, wpformsFound);

  // SMTP CSX opportunity (WPForms found but no SMTP)
  const smtpFound = smtpPro.found || smtpLite.found;
  renderSmtpCsxSection(wpformsFound, smtpFound);

  // Competitor CSX opportunities
  renderCompetitorSection(competitors, installedAmProducts, isAdminMode);

  // Not-WP banner: show only when nothing was found and WP wasn't detected
  const nothingFound = !smtpFound && !wpformsFound && !competitors.length && !installedAddons.length;
  notWpBanner.classList.toggle('hidden', !(nothingFound && !isWordPress));

  // Mode badge and footer
  modeBadge.textContent = isAdminMode ? 'Admin Mode' : '';
  modeBadge.classList.toggle('hidden', !isAdminMode);
  checkedDomainLabel.textContent = `Checked: ${rootDomain}`;

  // Extension badge: number of distinct AM plugins found (0–2)
  const count = (smtpFound ? 1 : 0) + (wpformsFound ? 1 : 0);
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
  loadingStatusText.textContent = 'Checking plugins…';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId  = tab?.id;
    const tabUrl = tab?.url ?? '';

    // Kick off WP.org latest-version fetches immediately — independent of everything else
    const wpOrgPromise = Promise.all([
      fetchLatestVersionFromWpOrg(WPORG_API_SMTP),
      fetchLatestVersionFromWpOrg(WPORG_API_FORMS),
    ]);

    // Try admin mode — reads the plugins list from wp-admin/plugins.php DOM
    const adminPlugins = await tryGetAdminPlugins(tabId, tabUrl);
    const isAdminMode  = adminPlugins !== null;

    let smtpPro, smtpLite, formsPro, formsLite;
    let competitors, installedAmProducts, installedAddons;
    let isWordPress;

    if (isAdminMode) {
      // Instant — data comes from DOM, no network requests needed
      smtpPro     = getAmPluginFromAdmin(adminPlugins, 'wp-mail-smtp-pro');
      smtpLite    = getAmPluginFromAdmin(adminPlugins, 'wp-mail-smtp');
      formsPro    = getAmPluginFromAdmin(adminPlugins, 'wpforms');
      formsLite   = getAmPluginFromAdmin(adminPlugins, 'wpforms-lite');
      competitors         = matchCompetitorsFromAdminPlugins(adminPlugins);
      installedAmProducts = getInstalledAmProductsFromAdmin(adminPlugins);
      installedAddons     = getAddonSlugsFromAdmin(adminPlugins);
      isWordPress         = true;
    } else {
      // Public scan — parallel fetch of all plugin paths
      [
        smtpPro, smtpLite, formsPro, formsLite,
        competitors, installedAmProducts, installedAddons,
        isWordPress,
      ] = await Promise.all([
        checkMultiplePaths(rootDomain, [PRO_PATH]),
        checkMultiplePaths(rootDomain, [LITE_PATH]),
        checkMultiplePaths(rootDomain, [WPFORMS_PRO_PATH]),
        checkMultiplePaths(rootDomain, [WPFORMS_LITE_PATH]),
        checkCompetitorPlugins(rootDomain),
        checkAmProducts(rootDomain),
        checkWpformsAddons(rootDomain),
        checkIsWordPress(rootDomain),
      ]);
    }

    loadingStatusText.textContent = 'Fetching latest versions…';
    const [latestSmtp, latestForms] = await wpOrgPromise;

    showResults(
      rootDomain, smtpPro, smtpLite, formsPro, formsLite,
      latestSmtp, latestForms,
      competitors, installedAmProducts, installedAddons,
      isAdminMode, isWordPress
    );

  } catch (err) {
    let message;
    if (err.message === 'TIMEOUT') {
      message = "Site didn't respond in time (10s). Try again or check the domain.";
    } else if (err.message.startsWith('NETWORK:') || err.message.includes('Failed to fetch')) {
      message = "Could not connect to the site. Check the domain is correct and the site is live.";
    } else {
      message = err.message;
    }
    showError(message);
  }
}

// ── Event Listeners ────────────────────────────────────────────────────────────

checkBtn.addEventListener('click', runCheck);

domainInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') runCheck();
});

// ── Boot ───────────────────────────────────────────────────────────────────────

init();
