// popup.js — CSX WP Plugin Checker

// ── Constants ──────────────────────────────────────────────────────────────────

// WP Mail SMTP
const PRO_PATH  = '/wp-content/plugins/wp-mail-smtp-pro/CHANGELOG.md';
const LITE_PATH = '/wp-content/plugins/wp-mail-smtp/changelog.txt';

// WPForms
const WPFORMS_PRO_PATH  = '/wp-content/plugins/wpforms/CHANGELOG.md';
const WPFORMS_LITE_PATH = '/wp-content/plugins/wpforms-lite/changelog.txt';

// OptinMonster (single slug)
const OM_PATH = '/wp-content/plugins/optinmonster/readme.txt';

// MonsterInsights — lite + pro
const MI_PRO_PATH  = '/wp-content/plugins/google-analytics-premium/readme.txt';
const MI_LITE_PATH = '/wp-content/plugins/google-analytics-for-wordpress/readme.txt';

// Sugar Calendar — lite + pro
const SC_PRO_PATH  = '/wp-content/plugins/sugar-calendar/readme.txt';
const SC_LITE_PATH = '/wp-content/plugins/sugar-calendar-lite/readme.txt';

// WPCharitable, AIOSEO, WPConsent (single slugs)
const CHARITABLE_PATH = '/wp-content/plugins/charitable/readme.txt';
const AIOSEO_PATH     = '/wp-content/plugins/all-in-one-seo-pack/readme.txt';
const WPCONSENT_PATH  = '/wp-content/plugins/wpconsent/readme.txt';

// Matches: ## [4.0.0], ## 4.0.0, = 4.0.0 =
const VERSION_REGEX = /(?:##\s*\[?|=\s*)(\d+\.\d+\.\d+(?:\.\d+)?)/;

const FETCH_TIMEOUT_MS = 10000;
const WPORG_TIMEOUT_MS = 5000;

const WPORG_API_SMTP  = 'https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&slug=wp-mail-smtp';
const WPORG_API_FORMS = 'https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&slug=wpforms-lite';

// Maps each AM offer to the official CSX tag from the support procedures doc.
// SMTP competitors → smtp trigger tag; forms competitor → generic (no specific tag in doc).
// Sugar Calendar tag matches the doc's spelling exactly (calender).
const OFFER_TRIGGER_TAGS = {
  'WP Mail SMTP':    'csx: trigger – smtp',
  'WPForms':         'csx: competitor',
  'OptinMonster':    'csx: trigger – optinmonster',
  'MonsterInsights': 'csx: trigger – monsterinsights',
  'Sugar Calendar':  'csx: trigger – sugar-calender',
  'WPCharitable':    'csx: trigger – wpcharitable',
  'AIOSEO':          'csx: trigger – aioseo',
  'WPConsent':       'csx: trigger – wpconsent',
};

// Payment-related WPForms addon slugs. If none are detected, a Payments CSX card is shown.
const PAYMENT_ADDONS = [
  'wpforms-stripe', 'wpforms-paypal-commerce', 'wpforms-square',
  'wpforms-authorize-net', 'wpforms-coupons',
];

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

const domainInput          = document.getElementById('domain-input');
const publicCheckBtn       = document.getElementById('public-check-btn');
const adminCheckBtn        = document.getElementById('admin-check-btn');
const adminLinkRow         = document.getElementById('admin-link-row');
const adminPluginsLink     = document.getElementById('admin-plugins-link');
const currentTabHint       = document.getElementById('current-tab-hint');
const loadingSection       = document.getElementById('loading-section');
const loadingStatusText    = document.getElementById('loading-status-text');
const errorSection         = document.getElementById('error-section');
const errorMessage         = document.getElementById('error-message');
const resultsSection       = document.getElementById('results-section');
const notWpBanner          = document.getElementById('not-wp-banner');
// WPForms license (top of results)
const wpformsLicenseRow    = document.getElementById('wpforms-license-row');
const wpformsLicenseSelect = document.getElementById('wpforms-license-select');
// WP Mail SMTP
const proStatus            = document.getElementById('pro-status');
const liteStatus           = document.getElementById('lite-status');
// WPForms
const wpformsProStatus     = document.getElementById('wpforms-pro-status');
const wpformsLiteStatus    = document.getElementById('wpforms-lite-status');
const addonSection         = document.getElementById('addon-section');
const addonList            = document.getElementById('addon-list');
// Other AM products
const omStatus             = document.getElementById('om-status');
const miProStatus          = document.getElementById('mi-pro-status');
const miLiteStatus         = document.getElementById('mi-lite-status');
const scProStatus          = document.getElementById('sc-pro-status');
const scLiteStatus         = document.getElementById('sc-lite-status');
const charitableStatus     = document.getElementById('charitable-status');
const aioseoStatus         = document.getElementById('aioseo-status');
const wpconsentStatus      = document.getElementById('wpconsent-status');
// Footer + CSX section
const checkedDomainLabel   = document.getElementById('checked-domain-label');
const competitorSection    = document.getElementById('competitor-section');
const competitorCards      = document.getElementById('competitor-cards');
const modeBadge            = document.getElementById('mode-badge');

// ── Initialization ─────────────────────────────────────────────────────────────

async function init() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && tab.url.startsWith('http')) {
      const rootDomain = extractRootDomain(tab.url);
      domainInput.value = rootDomain;
      currentTabHint.textContent = `Current tab: ${rootDomain}`;
      updateAdminLink(rootDomain);
    } else {
      currentTabHint.textContent = 'No HTTP tab detected. Enter a domain manually.';
    }
  } catch (_) {
    currentTabHint.textContent = 'Enter a domain to check.';
  }
}

// ── URL Utilities ──────────────────────────────────────────────────────────────

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

function updateAdminLink(rawInput) {
  if (!rawInput || !rawInput.trim()) {
    adminLinkRow.classList.add('hidden');
    return;
  }
  try {
    const root = extractRootDomain(rawInput);
    adminPluginsLink.href = `${root}/wp-admin/plugins.php`;
    adminLinkRow.classList.remove('hidden');
  } catch (_) {
    adminLinkRow.classList.add('hidden');
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
    const trimmed = text.trimStart().toLowerCase();
    if (trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')) {
      return { found: false };
    }
    return { found: true, version: parseVersion(text) };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error('TIMEOUT');
    throw new Error(`NETWORK:${err.message}`);
  }
}

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

async function checkMultiplePaths(origin, paths) {
  const results = await Promise.all(
    paths.map(async (p) => {
      try { return await checkPluginUrl(origin + p); }
      catch (_) { return { found: false }; }
    })
  );
  return results.find(r => r.found) ?? { found: false };
}

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

async function checkCompetitorPlugins(origin) {
  const results = await Promise.all(
    COMPETITOR_PLUGINS.map(async (plugin) => {
      const r = await checkMultiplePaths(origin, plugin.paths);
      return r.found ? plugin : null;
    })
  );
  return results.filter(Boolean);
}

async function checkWpformsAddons(origin) {
  const results = await Promise.all(
    WPFORMS_ADDONS.map(async (slug) => {
      try {
        const r = await checkPluginUrl(`${origin}/wp-content/plugins/${slug}/CHANGELOG.md`);
        return r.found ? slug : null;
      } catch (_) { return null; }
    })
  );
  return results.filter(Boolean);
}

async function checkIsWordPress(origin) {
  const [a, b] = await Promise.all([
    checkUrlExists(origin + '/wp-login.php'),
    checkUrlExists(origin + '/wp-admin/'),
  ]);
  return a || b;
}

// ── Admin Mode Helpers ─────────────────────────────────────────────────────────

async function tryGetAdminPlugins(tabId, tabUrl) {
  if (!tabId || !tabUrl || !tabUrl.includes('/wp-admin/plugins.php')) return null;
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

function matchCompetitorsFromAdminPlugins(adminPlugins) {
  const adminSlugMap = new Map(adminPlugins.map(p => [p.slug, p]));
  return COMPETITOR_PLUGINS
    .filter(c => adminSlugMap.has(c.slug))
    .map(c => ({ ...c, active: adminSlugMap.get(c.slug).active }));
}

function getAddonSlugsFromAdmin(adminPlugins) {
  const adminSlugs = new Set(adminPlugins.map(p => p.slug));
  return WPFORMS_ADDONS.filter(slug => adminSlugs.has(slug));
}

// ── Installed AM Products Set ──────────────────────────────────────────────────
// Products with lite + pro: WP Mail SMTP, WPForms, MonsterInsights, Sugar Calendar.
// Either variant found → product is suppressed from CSX competitor cards.

function buildInstalledAmProducts(r) {
  const set = new Set();
  if (r.smtpPro.found || r.smtpLite.found)   set.add('WP Mail SMTP');
  if (r.formsPro.found || r.formsLite.found)  set.add('WPForms');
  if (r.omStat.found)                          set.add('OptinMonster');
  if (r.miPro.found || r.miLite.found)         set.add('MonsterInsights');
  if (r.scPro.found || r.scLite.found)         set.add('Sugar Calendar');
  if (r.charitable.found)                      set.add('WPCharitable');
  if (r.aioseo.found)                          set.add('AIOSEO');
  if (r.wpconsent.found)                       set.add('WPConsent');
  return set;
}

// ── License Persistence ────────────────────────────────────────────────────────

async function loadLicenseForDomain(domain) {
  try {
    const key = `wpforms_license_${domain}`;
    const result = await chrome.storage.local.get(key);
    return result[key] ?? 'unknown';
  } catch (_) { return 'unknown'; }
}

async function saveLicenseForDomain(domain, license) {
  try {
    await chrome.storage.local.set({ [`wpforms_license_${domain}`]: license });
  } catch (_) {}
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
    } catch (_) {}
  });
  return el;
}

// ── UI State Management ────────────────────────────────────────────────────────

function setCheckBtnsDisabled(disabled) {
  publicCheckBtn.disabled = disabled;
  adminCheckBtn.disabled  = disabled;
  if (!disabled) {
    publicCheckBtn.textContent = 'Public Check';
    adminCheckBtn.textContent  = 'Admin Check';
  }
}

function showLoading(label) {
  loadingStatusText.textContent = label || 'Checking plugins…';
  loadingSection.classList.remove('hidden');
  errorSection.classList.add('hidden');
  resultsSection.classList.add('hidden');
  setCheckBtnsDisabled(true);
  publicCheckBtn.textContent = 'Checking…';
  adminCheckBtn.textContent  = 'Checking…';
}

function showError(message) {
  loadingSection.classList.add('hidden');
  errorSection.classList.remove('hidden');
  resultsSection.classList.add('hidden');
  errorMessage.textContent = message;
  setCheckBtnsDisabled(false);
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

// Simpler status for secondary AM products — installed/not-found + version, no update check
function renderStatusSimple(el, result) {
  if (!result.found) {
    el.innerHTML = '<span class="not-found">&#10007; Not Found</span>';
    return;
  }
  const versionBadge = result.version
    ? `<span class="version">v${result.version}</span>`
    : '';
  el.innerHTML = `<div class="install-line"><span class="found">&#10003; Installed</span>${versionBadge}</div>`;
}

function renderAddonSection(installedAddons, wpformsFound) {
  if (!wpformsFound) {
    addonSection.classList.add('hidden');
    return;
  }
  addonSection.classList.remove('hidden');
  addonList.textContent = installedAddons.length
    ? installedAddons.map(addonSlugToName).join(', ')
    : 'None detected';
}

async function renderLicenseDropdown(rootDomain, wpformsFound) {
  if (!wpformsFound) {
    wpformsLicenseRow.classList.add('hidden');
    return;
  }
  wpformsLicenseRow.classList.remove('hidden');
  wpformsLicenseSelect.dataset.domain = rootDomain;
  const saved = await loadLicenseForDomain(rootDomain);
  wpformsLicenseSelect.value = saved;
}

// ── CSX Opportunities ─────────────────────────────────────────────────────────

/**
 * Builds one CSX card element.
 * @param {string} detected — what was detected (or what's missing)
 * @param {string} offer    — what to offer
 * @param {string} tag      — the csx tag to copy
 * @param {string|undefined} activeBadge — optional "Active"/"Inactive" badge text
 */
function buildCsxCard(detected, offer, tag, activeBadge) {
  const card = document.createElement('div');
  card.className = 'competitor-card';

  // Detected row
  const detectedRow = document.createElement('div');
  detectedRow.className = 'competitor-row';
  const detectedLabel = document.createElement('span');
  detectedLabel.className = 'competitor-meta-label';
  detectedLabel.textContent = 'Detected';
  const detectedValue = document.createElement('span');
  detectedValue.className = 'competitor-plugin-names';
  detectedValue.textContent = detected;
  if (activeBadge !== undefined) {
    const badge = document.createElement('span');
    badge.className = `plugin-active-badge ${activeBadge ? 'active' : 'inactive'}`;
    badge.textContent = activeBadge ? 'Active' : 'Inactive';
    detectedValue.appendChild(badge);
  }
  detectedRow.appendChild(detectedLabel);
  detectedRow.appendChild(detectedValue);

  // Offer row
  const offerRow = document.createElement('div');
  offerRow.className = 'competitor-row';
  offerRow.innerHTML =
    `<span class="competitor-meta-label">Offer</span>` +
    `<span class="competitor-offer-name">${escapeHtml(offer)}</span>`;

  // Tag row — copyable
  const tagRow = document.createElement('div');
  tagRow.className = 'competitor-tag-row';
  tagRow.appendChild(makeCopyableTag(tag));

  card.appendChild(detectedRow);
  card.appendChild(offerRow);
  card.appendChild(tagRow);
  return card;
}

/**
 * Renders all CSX opportunity cards at the bottom of results.
 * Consolidates: SMTP prompt, competitor detections, Payments trigger, License Level trigger.
 */
function renderAllCsxOpportunities({ competitors, installedAmProducts, isAdminMode,
                                      wpformsFound, smtpFound, installedAddons, license }) {
  competitorCards.innerHTML = '';
  const fragment = document.createDocumentFragment();

  // 1. SMTP: WPForms found but no SMTP at all
  if (wpformsFound && !smtpFound) {
    fragment.appendChild(
      buildCsxCard('No SMTP plugin', 'WP Mail SMTP', 'csx: trigger – smtp')
    );
  }

  // 2. Competitor-detected cards — group by offer, one card per offer
  const actionable = competitors.filter(c => !installedAmProducts.has(c.offer));
  const byOffer = {};
  for (const c of actionable) {
    if (!byOffer[c.offer]) byOffer[c.offer] = [];
    byOffer[c.offer].push(c);
  }
  for (const [offer, entries] of Object.entries(byOffer)) {
    const tag = OFFER_TRIGGER_TAGS[offer] ?? 'csx: competitor';
    // Build detected names string; add active/inactive badge in admin mode
    const card = document.createElement('div');
    card.className = 'competitor-card';

    const detectedRow = document.createElement('div');
    detectedRow.className = 'competitor-row';
    const detectedLabel = document.createElement('span');
    detectedLabel.className = 'competitor-meta-label';
    detectedLabel.textContent = 'Detected';
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
    detectedRow.appendChild(detectedLabel);
    detectedRow.appendChild(namesEl);

    const offerRow = document.createElement('div');
    offerRow.className = 'competitor-row';
    offerRow.innerHTML =
      `<span class="competitor-meta-label">Offer</span>` +
      `<span class="competitor-offer-name">${escapeHtml(offer)}</span>`;

    const tagRow = document.createElement('div');
    tagRow.className = 'competitor-tag-row';
    tagRow.appendChild(makeCopyableTag(tag));

    card.appendChild(detectedRow);
    card.appendChild(offerRow);
    card.appendChild(tagRow);
    fragment.appendChild(card);
  }

  // 3. Payments trigger: WPForms found but no payment addon detected
  if (wpformsFound) {
    const hasPaymentAddon = installedAddons.some(s => PAYMENT_ADDONS.includes(s));
    if (!hasPaymentAddon) {
      fragment.appendChild(
        buildCsxCard('No payment addon', 'WPForms Payments', 'csx: trigger – payments')
      );
    }
  }

  // 4. License Level trigger: WPForms found + Basic or Plus license selected
  if (wpformsFound && ['basic', 'plus'].includes(license)) {
    const tier = license.charAt(0).toUpperCase() + license.slice(1);
    fragment.appendChild(
      buildCsxCard(`WPForms ${tier} license`, 'Higher license tier', 'csx: trigger – license level')
    );
  }

  if (!fragment.childNodes.length) {
    competitorSection.classList.add('hidden');
    return;
  }

  competitorCards.appendChild(fragment);
  competitorSection.classList.remove('hidden');
}

// ── showResults ────────────────────────────────────────────────────────────────

async function showResults(data) {
  const {
    rootDomain, isAdminMode, isWordPress,
    smtpPro, smtpLite, latestSmtp,
    formsPro, formsLite, latestForms, installedAddons,
    omStat, miPro, miLite, scPro, scLite, charitable, aioseo, wpconsent,
    competitors, installedAmProducts,
  } = data;

  loadingSection.classList.add('hidden');
  errorSection.classList.add('hidden');
  resultsSection.classList.remove('hidden');
  setCheckBtnsDisabled(false);

  const wpformsFound = formsPro.found || formsLite.found;
  const smtpFound    = smtpPro.found  || smtpLite.found;

  // 1. License dropdown — top of results
  await renderLicenseDropdown(rootDomain, wpformsFound);

  // 2. AM product status rows (in trigger order)
  renderStatus(proStatus,  smtpPro,  latestSmtp);
  renderStatus(liteStatus, smtpLite, latestSmtp);
  renderStatus(wpformsProStatus,  formsPro,  latestForms);
  renderStatus(wpformsLiteStatus, formsLite, latestForms);
  renderAddonSection(installedAddons, wpformsFound);
  renderStatusSimple(omStatus,         omStat);
  renderStatusSimple(miProStatus,      miPro);
  renderStatusSimple(miLiteStatus,     miLite);
  renderStatusSimple(scProStatus,      scPro);
  renderStatusSimple(scLiteStatus,     scLite);
  renderStatusSimple(charitableStatus, charitable);
  renderStatusSimple(aioseoStatus,     aioseo);
  renderStatusSimple(wpconsentStatus,  wpconsent);

  // 3. Footer
  modeBadge.textContent = isAdminMode ? 'Admin Mode' : '';
  modeBadge.classList.toggle('hidden', !isAdminMode);
  checkedDomainLabel.textContent = `Checked: ${rootDomain}`;

  // 4. CSX Opportunities — all consolidated at bottom
  const license = wpformsLicenseSelect.value;
  lastCsxContext = { competitors, installedAmProducts, isAdminMode,
                     wpformsFound, smtpFound, installedAddons };
  renderAllCsxOpportunities({ ...lastCsxContext, license });

  // 5. Not-WP banner
  const anyFound = smtpFound || wpformsFound || omStat.found ||
    miPro.found || miLite.found || scPro.found || scLite.found ||
    charitable.found || aioseo.found || wpconsent.found ||
    competitors.length > 0 || installedAddons.length > 0;
  notWpBanner.classList.toggle('hidden', !(! anyFound && !isWordPress));

  // 6. Extension badge (WP Mail SMTP + WPForms)
  const count = (smtpFound ? 1 : 0) + (wpformsFound ? 1 : 0);
  chrome.runtime.sendMessage({ type: 'UPDATE_BADGE', count });

  // Store domain on select for change handler
  wpformsLicenseSelect.dataset.domain = rootDomain;
}

// ── Shared Pre-check ───────────────────────────────────────────────────────────

async function getValidDomain() {
  const rawInput = domainInput.value.trim();
  if (!rawInput) {
    showError('Please enter a domain to check.');
    return null;
  }
  try {
    return extractRootDomain(rawInput);
  } catch (err) {
    showError(err.message);
    return null;
  }
}

// ── Public Check ───────────────────────────────────────────────────────────────

async function runPublicCheck() {
  const rootDomain = await getValidDomain();
  if (!rootDomain) return;

  showLoading('Checking plugins…');

  try {
    const wpOrgPromise = Promise.all([
      fetchLatestVersionFromWpOrg(WPORG_API_SMTP),
      fetchLatestVersionFromWpOrg(WPORG_API_FORMS),
    ]);

    const [
      smtpPro, smtpLite, formsPro, formsLite,
      omStat, miPro, miLite, scPro, scLite,
      charitable, aioseo, wpconsent,
      competitors, installedAddons, isWordPress,
    ] = await Promise.all([
      checkMultiplePaths(rootDomain, [PRO_PATH]),
      checkMultiplePaths(rootDomain, [LITE_PATH]),
      checkMultiplePaths(rootDomain, [WPFORMS_PRO_PATH]),
      checkMultiplePaths(rootDomain, [WPFORMS_LITE_PATH]),
      checkMultiplePaths(rootDomain, [OM_PATH]),
      checkMultiplePaths(rootDomain, [MI_PRO_PATH]),
      checkMultiplePaths(rootDomain, [MI_LITE_PATH]),
      checkMultiplePaths(rootDomain, [SC_PRO_PATH]),
      checkMultiplePaths(rootDomain, [SC_LITE_PATH]),
      checkMultiplePaths(rootDomain, [CHARITABLE_PATH]),
      checkMultiplePaths(rootDomain, [AIOSEO_PATH]),
      checkMultiplePaths(rootDomain, [WPCONSENT_PATH]),
      checkCompetitorPlugins(rootDomain),
      checkWpformsAddons(rootDomain),
      checkIsWordPress(rootDomain),
    ]);

    loadingStatusText.textContent = 'Fetching latest versions…';
    const [latestSmtp, latestForms] = await wpOrgPromise;

    const installedAmProducts = buildInstalledAmProducts({
      smtpPro, smtpLite, formsPro, formsLite,
      omStat, miPro, miLite, scPro, scLite,
      charitable, aioseo, wpconsent,
    });

    await showResults({
      rootDomain, isAdminMode: false, isWordPress,
      smtpPro, smtpLite, latestSmtp,
      formsPro, formsLite, latestForms, installedAddons,
      omStat, miPro, miLite, scPro, scLite, charitable, aioseo, wpconsent,
      competitors, installedAmProducts,
    });

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

// ── Admin Check ────────────────────────────────────────────────────────────────

async function runAdminCheck() {
  const rootDomain = await getValidDomain();
  if (!rootDomain) return;

  showLoading('Reading plugins page…');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const adminPlugins = await tryGetAdminPlugins(tab?.id, tab?.url ?? '');

    if (!adminPlugins) {
      showError('Navigate to wp-admin/plugins.php for this site first, then click Admin Check.');
      return;
    }

    const wpOrgPromise = Promise.all([
      fetchLatestVersionFromWpOrg(WPORG_API_SMTP),
      fetchLatestVersionFromWpOrg(WPORG_API_FORMS),
    ]);

    const smtpPro    = getAmPluginFromAdmin(adminPlugins, 'wp-mail-smtp-pro');
    const smtpLite   = getAmPluginFromAdmin(adminPlugins, 'wp-mail-smtp');
    const formsPro   = getAmPluginFromAdmin(adminPlugins, 'wpforms');
    const formsLite  = getAmPluginFromAdmin(adminPlugins, 'wpforms-lite');
    const omStat     = getAmPluginFromAdmin(adminPlugins, 'optinmonster');
    const miPro      = getAmPluginFromAdmin(adminPlugins, 'google-analytics-premium');
    const miLite     = getAmPluginFromAdmin(adminPlugins, 'google-analytics-for-wordpress');
    const scPro      = getAmPluginFromAdmin(adminPlugins, 'sugar-calendar');
    const scLite     = getAmPluginFromAdmin(adminPlugins, 'sugar-calendar-lite');
    const charitable = getAmPluginFromAdmin(adminPlugins, 'charitable');
    const aioseo     = getAmPluginFromAdmin(adminPlugins, 'all-in-one-seo-pack');
    const wpconsent  = getAmPluginFromAdmin(adminPlugins, 'wpconsent');

    const competitors     = matchCompetitorsFromAdminPlugins(adminPlugins);
    const installedAddons = getAddonSlugsFromAdmin(adminPlugins);

    loadingStatusText.textContent = 'Fetching latest versions…';
    const [latestSmtp, latestForms] = await wpOrgPromise;

    const installedAmProducts = buildInstalledAmProducts({
      smtpPro, smtpLite, formsPro, formsLite,
      omStat, miPro, miLite, scPro, scLite,
      charitable, aioseo, wpconsent,
    });

    await showResults({
      rootDomain, isAdminMode: true, isWordPress: true,
      smtpPro, smtpLite, latestSmtp,
      formsPro, formsLite, latestForms, installedAddons,
      omStat, miPro, miLite, scPro, scLite, charitable, aioseo, wpconsent,
      competitors, installedAmProducts,
    });

  } catch (err) {
    showError(err.message || 'Unexpected error. Please try again.');
  }
}

// ── Event Listeners ────────────────────────────────────────────────────────────

publicCheckBtn.addEventListener('click', runPublicCheck);
adminCheckBtn.addEventListener('click', runAdminCheck);

domainInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') runPublicCheck();
});

domainInput.addEventListener('input', () => {
  updateAdminLink(domainInput.value);
});

wpformsLicenseSelect.addEventListener('change', async () => {
  const domain = wpformsLicenseSelect.dataset.domain;
  if (!domain) return;
  await saveLicenseForDomain(domain, wpformsLicenseSelect.value);
  // Re-render CSX section immediately so license-level card appears/disappears
  if (lastCsxContext) {
    renderAllCsxOpportunities({ ...lastCsxContext, license: wpformsLicenseSelect.value });
  }
});

// ── Boot ───────────────────────────────────────────────────────────────────────

// Holds the last CSX-relevant data so the license dropdown change can re-render cards
let lastCsxContext = null;

init();
