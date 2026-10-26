# 📱 Appifya PWA Audit & Android App Builder

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-Appifya%20PWA%20Builder-blueviolet?style=for-the-badge&logo=github-actions)](https://github.com/marketplace/actions/appifya-pwa-mobile-builder)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Powered by Appifya](https://img.shields.io/badge/Powered%20by-Appifya.app-6366f1?style=for-the-badge)](https://www.appifya.app)

Audit your website or web application for **Progressive Web App (PWA)** compliance, validate your Web App Manifest and icons, verify mobile readiness, and prepare your app for **Google Play Store / Android APK & AAB distribution** directly in your CI/CD pipeline.

---

## ⚡ Quick Start

Create a workflow file at `.github/workflows/pwa-audit.yml`:

```yaml
name: PWA & Mobile Audit

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  pwa-check:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Run Appifya PWA Audit
        uses: mkharbouc/appifya-pwa-builder-action@v1
        with:
          # Check either a deployed production/staging URL
          url: 'https://your-domain.com'
          # Or check your local manifest file in the repo
          manifest-path: 'public/manifest.json'
          # Optional: Minimum passing score (0-100)
          min-score: '75'
          # Optional: Set to true if you want to block PRs that fail PWA standards
          fail-on-error: 'false'
```

---

## 🎯 What Does This Action Check?

| Check | Description | Weight |
| :--- | :--- | :---: |
| 🔒 **HTTPS Protocol** | Verifies encryption required for Service Workers & Trusted Web Activities (TWA) | 15% |
| 📱 **Responsive Viewport** | Checks for `<meta name="viewport">` properly configured for mobile devices | 15% |
| 📄 **Web App Manifest** | Validates existence and syntax of `manifest.json` / `manifest.webmanifest` | 20% |
| 🏷️ **App Metadata** | Verifies `name`, `short_name`, and standalone display mode | 20% |
| 🎨 **Theme & Styling** | Detects `<meta name="theme-color">` for immersive Android status bars | 10% |
| 🖼️ **PWA Icons** | Inspects 192x192, 512x512, and modern adaptive `maskable` icons | 10% |
| ⚡ **Service Worker** | Checks for active service worker registrations and offline capabilities | 10% |

---

## 📊 Rich Step Summary Report

Every run automatically publishes an interactive scorecard inside your GitHub Actions run:

![Appifya Step Summary](https://img.shields.io/badge/PWA_Readiness-95%2F100-brightgreen?style=for-the-badge&logo=pwa)

```markdown
| Check | Status | Details |
| :--- | :---: | :--- |
| **HTTPS Security** | ✅ Pass | Site is served over secure HTTPS protocol. |
| **Responsive Viewport** | ✅ Pass | Viewport meta tag is properly configured. |
| **Web App Manifest** | ✅ Pass | Valid webmanifest linked. |
| **App Icons (192/512px)** | ✅ Pass | Found 2 icon definitions with high-res sizes. |
| **Service Worker** | ✅ Pass | Active service worker discovered at /sw.js. |
```

---

## 🛠️ Inputs

| Input | Description | Required | Default |
| :--- | :--- | :---: | :---: |
| `url` | Live URL of your web application or eCommerce store | No | `''` |
| `manifest-path` | Path to your local web manifest (e.g. `public/manifest.json`) | No | Auto-detected |
| `min-score` | Minimum passing score threshold (0–100) | No | `70` |
| `fail-on-error` | Fail workflow execution if score is below `min-score` | No | `'false'` |

---

## 📤 Outputs

| Output | Description | Example |
| :--- | :--- | :---: |
| `score` | Overall PWA compliance score (0–100) | `95` |
| `status` | Audit status (`passed`, `warning`, `failed`) | `passed` |
| `has-manifest` | `true` if valid manifest detected | `true` |
| `has-service-worker`| `true` if service worker detected | `true` |
| `has-icons` | `true` if recommended PWA icons are present | `true` |
| `report-markdown` | Base64-encoded markdown report for PR comments | `...` |

---

## 🚀 Free PWA & Mobile Developer Tools by Appifya

Need to convert your web app into a mobile package or prepare store listings? Try our free developer tools:

* 📱 **[PWA to Android APK / AAB Builder](https://www.appifya.app)** — Convert any website into an Android app in minutes.
* 🔔 **[Web Push Notification Tester](https://www.appifya.app/tools/push-notification-tester)** — Test and debug web push notification payloads.
* 🛡️ **[Google Play Data Safety Generator](https://www.appifya.app/tools/play-data-safety)** — Instant compliance questionnaire generator.
* 🖼️ **[App Store Mockup Framer](https://www.appifya.app/tools/app-mockup-framer)** — Create stunning device mockups for Google Play.
* 🔗 **[Digital AssetLinks Generator](https://www.appifya.app/tools/assetlinks-generator)** — Instant TWA assetlinks JSON generator.

---

## 📄 License

Licensed under the [MIT License](LICENSE).
