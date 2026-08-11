/**
 * AMASAMYA Extension - Platform Bridge Content Script
 *
 * Runs on the AMASAMYA Platform page (https://amasamya.akhileshmalani.com).
 *
 * Purpose:
 *   The background service worker cannot directly call functions on a web
 *   page - it can only message content scripts. This script lives in the
 *   platform tab, receives the findings payload from the background via
 *   chrome.runtime.onMessage, and forwards it into the page's own
 *   JavaScript context via window.postMessage.
 *
 *   The platform page listens for window messages of type
 *   'AMASAMYA_extension_results' and renders the findings automatically.
 */

/*
 * v4.3.1 (2026-07-08): postMessage target changed from '*' to
 * location.origin so an embedded cross-origin iframe on the
 * platform page cannot receive audit findings. The manifest content-
 * script match rule already scopes execution to the platform origin,
 * so location.origin is always the platform's own origin.
 */
chrome.runtime.onMessage.addListener((message) => {
  if (!message || typeof message.type !== 'string') return;

  /* v5.2: background pushes unsynced scheduledRuns for the platform
     to write to Firestore. Forward as a window message. */
  if (message.type === 'AMASAMYA_scheduled_runs_flush') {
    window.postMessage({
      type: 'AMASAMYA_extension_runs_flush',
      runs: Array.isArray(message.runs) ? message.runs : []
    }, location.origin);
    return;
  }

  /* Standard single-page audit results from the WCAG engine. */
  if (message.type === 'AMASAMYA_platform_results') {
    window.postMessage({
      type:      'AMASAMYA_extension_results',
      findings:  message.findings,
      pageTitle: message.pageTitle,
      pageUrl:   message.pageUrl,
      timestamp: message.timestamp
    }, location.origin);
    return;
  }

  /* v4.2.0 Site Crawl: one of these arrives per audited page during a
     crawl. The platform accumulates them into a single aggregated
     session record. status is one of 'audited', 'auth-wall',
     'timeout', 'load-error'; only 'audited' carries findings. */
  if (message.type === 'AMASAMYA_crawl_page_result') {
    window.postMessage({
      type:       'AMASAMYA_extension_crawl_page',
      url:        message.url,
      finalUrl:   message.finalUrl,
      title:      message.title,
      status:     message.status,
      index:      message.index,
      findings:   message.findings || [],
      durationMs: message.durationMs,
      timestamp:  message.timestamp
    }, location.origin);
    return;
  }
});

/*
 * v5.2 Scheduled Crawls: reverse direction (platform -> background).
 * The Schedules panel writes to Firestore for cross-device sync
 * AND posts a window message here so the background service worker
 * can register chrome.alarms and hold a local schedule mirror in
 * chrome.storage.local. We treat platform postMessage as untrusted
 * input from a page context and validate shape before forwarding.
 */
window.addEventListener('message', function (event) {
  if (event.source !== window) return;
  if (event.origin !== location.origin) return;
  var m = event.data;
  if (!m || typeof m.type !== 'string') return;

  if (m.type === 'AMASAMYA_platform_schedule_sync') {
    /* Full replace: platform sends the entire current schedule set
       for the signed-in user. Background diffs against its local
       mirror and re-registers alarms. */
    if (!Array.isArray(m.schedules)) return;
    chrome.runtime.sendMessage({
      type: 'AMASAMYA_schedules_sync',
      schedules: m.schedules
    }, function () { void chrome.runtime.lastError; });
    return;
  }

  if (m.type === 'AMASAMYA_platform_schedule_delete') {
    if (typeof m.scheduleId !== 'string') return;
    chrome.runtime.sendMessage({
      type: 'AMASAMYA_schedule_delete',
      scheduleId: m.scheduleId
    }, function () { void chrome.runtime.lastError; });
    return;
  }

  if (m.type === 'AMASAMYA_platform_extension_ping') {
    /* Platform asks: "are you installed?" We answer via a DOM
       attribute the platform's own JS can poll for. */
    document.documentElement.setAttribute('data-amasamya-extension', 'installed');
    return;
  }

  if (m.type === 'AMASAMYA_platform_request_runs_flush') {
    /* Platform panel just loaded and wants us to drain any unsynced
       scheduledRuns from the background's chrome.storage.local mirror. */
    chrome.runtime.sendMessage({
      type: 'AMASAMYA_platform_request_runs_flush'
    }, function () { void chrome.runtime.lastError; });
    return;
  }

  if (m.type === 'AMASAMYA_platform_runs_synced') {
    /* Platform confirms the listed runIds are now in Firestore.
       Forward so background can mark them synced. */
    if (!Array.isArray(m.runIds)) return;
    chrome.runtime.sendMessage({
      type: 'AMASAMYA_platform_runs_synced',
      runIds: m.runIds
    }, function () { void chrome.runtime.lastError; });
    return;
  }
});

/* Announce presence immediately on inject so the Schedules panel's
   checkExtensionPresence() sees us within its 800ms window. */
document.documentElement.setAttribute('data-amasamya-extension', 'installed');
