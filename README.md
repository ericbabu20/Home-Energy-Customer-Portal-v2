# Home Energy Customer Portal (Prototype)

A clickable prototype of the Home Energy customer portal. It is a refinement of the existing Home Energy portal, with the new design applied to the Set 1 screens.

> **Status:** Prototype / design review. Not connected to live customer data. All accounts, readings, bills, and appointments are demo data stored in the browser.

---

## Demo video

[![Demo video placeholder](docs/screenshots/demo-video-thumbnail.png)](TODO-add-demo-video-link)

- **Video:** TODO - add link (YouTube, Vimeo, or a file in `docs/`)
- **Length:** TODO - e.g. 3 min
- **What it covers:** TODO - sign in, home, meter readings, bills, tariff, smart meter booking

---

## What is included (Set 1)

| # | Area | Page | Notes |
|---|------|------|-------|
| 1 | Authentication | `index.html` | Sign-in page with demo login |
| 2 | Home screen | `portal.html` | Account summary shown before the supply start date (SSD) |
| 3 | Meter readings | `readings.html` | Smart, traditional, and traditional non-communicating versions |
| 4 | Bills and payments | `bills.html` | Electricity and gas toggle |
| 5 | Your tariff | `tariff.html` | Current tariff details |
| 6 | Smart meter booking | `booking.html` | Book, reschedule, cancel, and error screens |
| - | Moving out | `moving-out.html` | Linked from the menu so it does not show a broken page |

---

## Screenshots

### New UI (refined design)

| Screen | Screenshot |
|--------|-----------|
| Sign in | ![Sign in - new UI](docs/screenshots/new-sign-in.png) |
| Home (account before SSD) | ![Home - new UI](docs/screenshots/new-home.png) |
| Meter reading - smart | ![Meter reading smart - new UI](docs/screenshots/new-readings-smart.png) |
| Meter reading - traditional | ![Meter reading traditional - new UI](docs/screenshots/new-readings-traditional.png) |
| Meter reading - traditional non-communicating | ![Meter reading non-communicating - new UI](docs/screenshots/new-readings-offline.png) |
| Bills and payments | ![Bills - new UI](docs/screenshots/new-bills.png) |
| Your tariff | ![Tariff - new UI](docs/screenshots/new-tariff.png) |
| Smart meter booking | ![Booking - new UI](docs/screenshots/new-booking.png) |

### Existing portal (before refinement)

| Screen | Screenshot |
|--------|-----------|
| Sign in | ![Sign in - existing portal](docs/screenshots/existing-sign-in.png) |
| Home | ![Home - existing portal](docs/screenshots/existing-home.png) |
| Meter reading | ![Meter reading - existing portal](docs/screenshots/existing-readings.png) |
| Bills and payments | ![Bills - existing portal](docs/screenshots/existing-bills.png) |
| Your tariff | ![Tariff - existing portal](docs/screenshots/existing-tariff.png) |

> TODO: Add the screenshot files to `docs/screenshots/` with the names above. Until then, the images will show as broken links.

---

## How to run the prototype

No installation is needed. It is plain HTML, CSS, and JavaScript.

**Option 1 - Double-click**
1. Open the project folder.
2. Double-click `index.html`.

**Option 2 - Local server (recommended)**
1. Open a terminal in the project folder.
2. Run:
   ```bash
   python -m http.server 8000
   ```
3. Open `http://localhost:8000` in your browser.

**Tip:** After a change, press **Ctrl + F5** to reload the page without the old cached files.

---

## Demo accounts and test options

- **Sign in:** Click **Demo login**, or enter any email and a password of at least 6 characters.
- **Switch customer type:** Add `?customer=` to the address, for example:
  - `readings.html?customer=smart`
  - `readings.html?customer=trad`
  - `readings.html?customer=offline`
- **Booking outcomes:** On `booking.html`, use the **Booking outcome** options to test success, failure, online, no slots, and notice screens.

---

## Project structure

```
home-energy-portal/
├── index.html          Sign in
├── portal.html         Home
├── readings.html       Meter readings
├── bills.html          Bills and payments
├── tariff.html         Your tariff
├── booking.html        Smart meter booking
├── moving-out.html     Moving out
├── css/
│   └── styles.css      All styles (light and dark themes)
├── js/
│   ├── app.js          Page behaviour and demo data
│   └── theme.js        Theme and meter type set before the page shows
└── docs/
    └── screenshots/    Screenshots and demo video placeholder
```

---

## Design notes

- **Fonts:** Figtree and Young Serif
- **Colours:** Green gradient brand, with light and dark themes
- **Buttons:** Portal pill buttons (52px) used across all screens
- **Responsive:** Works on desktop, tablet, and phone (checked at 390px wide)

---

## Known limitations (prototype only)

- No real login, customer data, or payments.
- "Contact us" and some other links show a short message instead of opening a page.
- Booking dates and times are generated from today's date.
- Some extra options (for example, reschedule reasons) were added beyond the design files.

---

## Source designs

- Figma: TODO - add link to the Figma file (Home Energy 2 Developer Handoff)

---

## Feedback

TODO - add contact name or team, and how to send feedback.
