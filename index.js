/**
 * Appifya PWA & Mobile App Builder - GitHub Action
 * Zero-dependency runner compatible with Node.js 20+
 * Powered by Appifya (https://www.appifya.app)
 */

const fs = require('fs');
const path = require('path');

function getInput(name, fallback = '') {
  const envName = `INPUT_${name.replace(/ /g, '_').replace(/-/g, '_').toUpperCase()}`;
  return process.env[envName]?.trim() || fallback;
}

function setOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (outputPath && fs.existsSync(outputPath)) {
    fs.appendFileSync(outputPath, `${name}=${value}\n`);
  } else {
    console.log(`::set-output name=${name}::${value}`);
  }
}

function appendStepSummary(markdown) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    try {
      fs.appendFileSync(summaryPath, markdown + '\n');
    } catch (e) {
      console.warn('Could not write to GITHUB_STEP_SUMMARY:', e.message);
    }
  }
}

function logBanner() {
  console.log('\n======================================================');
  console.log('   🚀 Appifya PWA Audit & Mobile App Builder');
  console.log('   Turn any web app or store into an Android APK & PWA');
  console.log('   Website: https://www.appifya.app');
  console.log('======================================================\n');
}

async function fetchManifestFromUrl(manifestUrl, baseUrl) {
  try {
    const fullUrl = new URL(manifestUrl, baseUrl).href;
    const res = await fetch(fullUrl, {
      headers: { 'User-Agent': 'Appifya-PWA-Audit-Action/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

async function auditWebUrl(targetUrl) {
  const checks = [];
  let score = 0;
  let hasManifest = false;
  let hasServiceWorker = false;
  let hasIcons = false;
  let manifestData = null;

  console.log(`🔍 Auditing URL: ${targetUrl}`);

  // 1. Protocol check
  const isHttps = targetUrl.startsWith('https://');
  if (isHttps) {
    score += 15;
    checks.push({ name: 'HTTPS Security', status: 'pass', points: 15, msg: 'Site is served over secure HTTPS protocol.' });
  } else {
    checks.push({ name: 'HTTPS Security', status: 'fail', points: 0, msg: 'PWA and Google Play TWA require HTTPS encryption.' });
  }

  // 2. Fetch page HTML
  let html = '';
  try {
    const res = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Appifya PWA Auditor; https://www.appifya.app)' },
      signal: AbortSignal.timeout(15000),
    });
    html = await res.text();
  } catch (err) {
    checks.push({ name: 'Page Accessibility', status: 'fail', points: 0, msg: `Failed to fetch URL: ${err.message}` });
    return { score, checks, hasManifest, hasServiceWorker, hasIcons, manifestData };
  }

  // 3. Viewport Meta
  const hasViewport = /<meta[^>]+name=["']viewport["'][^>]*>/i.test(html);
  if (hasViewport) {
    score += 15;
    checks.push({ name: 'Responsive Viewport', status: 'pass', points: 15, msg: 'Viewport meta tag is properly configured for mobile screens.' });
  } else {
    checks.push({ name: 'Responsive Viewport', status: 'fail', points: 0, msg: 'Missing <meta name="viewport"> tag for mobile responsiveness.' });
  }

  // 4. Theme Color
  const themeColorMatch = html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i);
  if (themeColorMatch) {
    score += 10;
    checks.push({ name: 'Theme Color', status: 'pass', points: 10, msg: `Theme color defined (${themeColorMatch[1]}).` });
  } else {
    checks.push({ name: 'Theme Color', status: 'warn', points: 0, msg: 'Missing <meta name="theme-color"> for customized Android status bar.' });
  }

  // 5. Manifest Link
  const manifestMatch = html.match(/<link[^>]+rel=["']manifest["'][^>]+href=["']([^"']+)["']/i);
  if (manifestMatch) {
    const manifestHref = manifestMatch[1];
    manifestData = await fetchManifestFromUrl(manifestHref, targetUrl);

    if (manifestData) {
      hasManifest = true;
      score += 20;
      checks.push({ name: 'Web App Manifest', status: 'pass', points: 20, msg: `Valid webmanifest linked at: ${manifestHref}` });

      // Inspect Manifest properties
      if (manifestData.name || manifestData.short_name) {
        score += 10;
        checks.push({ name: 'App Name', status: 'pass', points: 10, msg: `App name: "${manifestData.name || manifestData.short_name}"` });
      } else {
        checks.push({ name: 'App Name', status: 'fail', points: 0, msg: 'Manifest lacks "name" and "short_name" properties.' });
      }

      if (['standalone', 'fullscreen', 'minimal-ui'].includes(manifestData.display)) {
        score += 10;
        checks.push({ name: 'Display Mode', status: 'pass', points: 10, msg: `Display mode set to "${manifestData.display}".` });
      } else {
        checks.push({ name: 'Display Mode', status: 'warn', points: 0, msg: 'Manifest display mode should be "standalone" or "fullscreen".' });
      }

      // Check Icons
      const icons = Array.isArray(manifestData.icons) ? manifestData.icons : [];
      const hasLargeIcon = icons.some(icon => icon.sizes && (icon.sizes.includes('512x512') || icon.sizes.includes('192x192')));
      const hasMaskable = icons.some(icon => icon.purpose && icon.purpose.includes('maskable'));

      if (hasLargeIcon) {
        score += 10;
        hasIcons = true;
        checks.push({ name: 'App Icons (192/512px)', status: 'pass', points: 10, msg: `Found ${icons.length} icon definitions with high-res sizes.` });
      } else {
        checks.push({ name: 'App Icons (192/512px)', status: 'fail', points: 0, msg: 'Missing required 192x192 or 512x512 PNG icons.' });
      }

      if (hasMaskable) {
        score += 5;
        checks.push({ name: 'Maskable Icon', status: 'pass', points: 5, msg: 'Adaptive maskable icon found for modern Android devices.' });
      } else {
        checks.push({ name: 'Maskable Icon', status: 'warn', points: 0, msg: 'No icon with purpose="maskable" found for adaptive Android icons.' });
      }
    } else {
      checks.push({ name: 'Web App Manifest', status: 'fail', points: 0, msg: `Manifest link found (${manifestHref}) but failed to parse JSON.` });
    }
  } else {
    checks.push({ name: 'Web App Manifest', status: 'fail', points: 0, msg: 'No <link rel="manifest"> found in HTML head.' });
  }

  // 6. Service Worker Detection
  const hasSWRegex = /(navigator\.serviceWorker\.register|serviceWorker\.js|sw\.js|registerRoute|workbox)/i;
  if (hasSWRegex.test(html)) {
    hasServiceWorker = true;
    score += 15;
    checks.push({ name: 'Service Worker / Offline', status: 'pass', points: 15, msg: 'Service worker registration or offline caching code detected.' });
  } else {
    // Check if sw.js exists at root
    try {
      const swUrl = new URL('/sw.js', targetUrl).href;
      const swRes = await fetch(swUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      if (swRes.ok) {
        hasServiceWorker = true;
        score += 15;
        checks.push({ name: 'Service Worker / Offline', status: 'pass', points: 15, msg: 'Active service worker discovered at /sw.js.' });
      } else {
        checks.push({ name: 'Service Worker / Offline', status: 'warn', points: 0, msg: 'No active service worker script detected.' });
      }
    } catch {
      checks.push({ name: 'Service Worker / Offline', status: 'warn', points: 0, msg: 'No active service worker script detected.' });
    }
  }

  return { score, checks, hasManifest, hasServiceWorker, hasIcons, manifestData };
}

function auditLocalManifest(manifestPath) {
  const checks = [];
  let score = 50; // Base score for having a project
  let hasManifest = false;
  let hasIcons = false;
  let manifestData = null;

  console.log(`📁 Auditing local manifest file: ${manifestPath}`);

  if (!fs.existsSync(manifestPath)) {
    checks.push({ name: 'Local Manifest', status: 'fail', points: 0, msg: `File not found at ${manifestPath}` });
    return { score: 0, checks, hasManifest: false, hasServiceWorker: false, hasIcons: false, manifestData: null };
  }

  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    manifestData = JSON.parse(raw);
    hasManifest = true;
    score += 20;
    checks.push({ name: 'Manifest Syntax', status: 'pass', points: 20, msg: 'Valid JSON syntax.' });

    if (manifestData.name || manifestData.short_name) {
      score += 10;
      checks.push({ name: 'App Name', status: 'pass', points: 10, msg: `Configured as: "${manifestData.name || manifestData.short_name}"` });
    } else {
      checks.push({ name: 'App Name', status: 'fail', points: 0, msg: 'Missing name or short_name.' });
    }

    if (['standalone', 'fullscreen', 'minimal-ui'].includes(manifestData.display)) {
      score += 10;
      checks.push({ name: 'Display Mode', status: 'pass', points: 10, msg: `Display mode set to "${manifestData.display}".` });
    } else {
      checks.push({ name: 'Display Mode', status: 'warn', points: 0, msg: 'Display mode should be "standalone".' });
    }

    const icons = Array.isArray(manifestData.icons) ? manifestData.icons : [];
    const hasLarge = icons.some(i => i.sizes && (i.sizes.includes('512x512') || i.sizes.includes('192x192')));
    const hasMaskable = icons.some(i => i.purpose && i.purpose.includes('maskable'));

    if (hasLarge) {
      score += 10;
      hasIcons = true;
      checks.push({ name: 'PWA Icons', status: 'pass', points: 10, msg: `Includes high-res sizes (192/512px).` });
    } else {
      checks.push({ name: 'PWA Icons', status: 'fail', points: 0, msg: 'Missing required 192x192 or 512x512 PNG icons.' });
    }

    if (hasMaskable) {
      checks.push({ name: 'Maskable Icon', status: 'pass', points: 0, msg: 'Includes adaptive maskable icon.' });
    } else {
      checks.push({ name: 'Maskable Icon', status: 'warn', points: 0, msg: 'Consider adding purpose="maskable" icon.' });
    }
  } catch (err) {
    checks.push({ name: 'Manifest Syntax', status: 'fail', points: 0, msg: `JSON parse error: ${err.message}` });
  }

  return { score: Math.min(score, 100), checks, hasManifest, hasServiceWorker: false, hasIcons, manifestData };
}

function findLocalManifestFallback() {
  const commonPaths = [
    'public/manifest.json',
    'public/manifest.webmanifest',
    'manifest.json',
    'src/app/manifest.json',
    'static/manifest.json',
    'public/site.webmanifest',
  ];

  for (const rel of commonPaths) {
    const full = path.resolve(process.cwd(), rel);
    if (fs.existsSync(full)) {
      return full;
    }
  }
  return null;
}

async function run() {
  logBanner();

  const targetUrl = getInput('url');
  let manifestPath = getInput('manifest-path');
  const minScore = parseInt(getInput('min-score', '70'), 10) || 70;
  const failOnError = getInput('fail-on-error', 'false').toLowerCase() === 'true';

  let auditResult;

  if (targetUrl) {
    auditResult = await auditWebUrl(targetUrl);
  } else {
    if (!manifestPath) {
      manifestPath = findLocalManifestFallback();
    }
    if (manifestPath) {
      auditResult = auditLocalManifest(manifestPath);
    } else {
      console.log('⚠️ No URL or local manifest path specified. Run with `url: https://your-site.com` or `manifest-path: public/manifest.json`.');
      auditResult = {
        score: 0,
        checks: [{ name: 'Input Check', status: 'fail', points: 0, msg: 'Neither target URL nor local manifest file was provided.' }],
        hasManifest: false,
        hasServiceWorker: false,
        hasIcons: false,
        manifestData: null,
      };
    }
  }

  const { score, checks, hasManifest, hasServiceWorker, hasIcons } = auditResult;

  // Print console breakdown
  console.log('------------------------------------------------------');
  console.log(`📊 PWA & Mobile Readiness Score: ${score}/100`);
  console.log('------------------------------------------------------');
  for (const check of checks) {
    const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️ ' : '❌';
    console.log(`${icon} [${check.name}]: ${check.msg}`);
  }
  console.log('------------------------------------------------------');

  const status = score >= 80 ? 'passed' : score >= minScore ? 'warning' : 'failed';

  // Set Outputs
  setOutput('score', score.toString());
  setOutput('status', status);
  setOutput('has-manifest', hasManifest ? 'true' : 'false');
  setOutput('has-service-worker', hasServiceWorker ? 'true' : 'false');
  setOutput('has-icons', hasIcons ? 'true' : 'false');

  // Build Markdown Summary for GitHub Step Summary
  const badgeColor = score >= 80 ? 'brightgreen' : score >= minScore ? 'yellow' : 'red';
  const badgeUrl = `https://img.shields.io/badge/PWA_Readiness-${score}%2F100-${badgeColor}?style=for-the-badge&logo=pwa`;

  let markdown = `## 📱 Appifya PWA & Mobile Readiness Report\n\n`;
  markdown += `![PWA Score](${badgeUrl})\n\n`;
  markdown += `> Audited by **[Appifya](https://www.appifya.app)** — Convert any web app or store into an installable PWA and native Android App.\n\n`;

  markdown += `| Check | Status | Details |\n`;
  markdown += `| :--- | :---: | :--- |\n`;
  for (const c of checks) {
    const icon = c.status === 'pass' ? '✅ Pass' : c.status === 'warn' ? '⚠️ Warning' : '❌ Fail';
    markdown += `| **${c.name}** | ${icon} | ${c.msg} |\n`;
  }
  markdown += `\n`;

  markdown += `### 🚀 Next Steps to Launch on Google Play & App Stores\n\n`;
  markdown += `Need to build an APK, test push notifications, or prepare Google Play assets? Use Appifya's free tools:\n\n`;
  markdown += `- 📲 **[Convert PWA to Android APK / AAB](https://www.appifya.app)** — Zero-code Android packaging\n`;
  markdown += `- 🔔 **[Push Notification Tester](https://www.appifya.app/tools/push-notification-tester)** — Debug web push payloads\n`;
  markdown += `- 🛡️ **[Google Play Data Safety Form Generator](https://www.appifya.app/tools/play-data-safety)** — Complete compliance in minutes\n`;
  markdown += `- 🖼️ **[App Store Mockup Framer](https://www.appifya.app/tools/app-mockup-framer)** — Beautiful screenshots for your store listing\n`;
  markdown += `- 🔗 **[Digital AssetLinks Generator](https://www.appifya.app/tools/assetlinks-generator)** — Instant TWA domain verification\n\n`;
  markdown += `---\n*Generated automatically by [Appifya GitHub Action](https://github.com/marketplace/actions/appifya-pwa-mobile-builder)*\n`;

  appendStepSummary(markdown);
  setOutput('report-markdown', Buffer.from(markdown).toString('base64'));

  console.log(`\n🎉 Audit finished with score ${score}/100 (${status.toUpperCase()})`);
  console.log('👉 Build your Android APK or generate store assets at: https://www.appifya.app\n');

  if (failOnError && score < minScore) {
    console.error(`\n❌ PWA audit score ${score} is below the required threshold of ${minScore}. Failing step.`);
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal action error:', err);
  process.exit(1);
});
