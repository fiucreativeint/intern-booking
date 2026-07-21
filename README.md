# Intern Interview Booking Page

Deploy to Netlify:

1. Go to https://app.netlify.com/drop
2. Drag this whole folder (or the zip, extracted) onto the page — or in the Netlify dashboard choose "Add new site" → "Deploy manually" and drop it there.
3. That's it. No environment variables, API keys, or third-party signups needed.

## How the shared storage works

Booked slots are stored using **Netlify Blobs**, a key-value store that's automatically provisioned for every Netlify site. The `netlify/functions/slots.js` function reads/writes a single JSON blob containing all bookings. Because it's server-side, every visitor sees the same live data — not just localStorage.

- `GET /api/slots` → returns all current bookings
- `POST /api/slots` → books a slot (rejects if already taken)

## Editing available slots

Open `public/index.html` and edit the `RANGES` array near the top of the `<script>` block. Each entry is `{ date, label, start, end }` in 24-hour time; the page automatically splits each range into 30-minute slots.

## Files

- `public/index.html` — the booking page (all HTML/CSS/JS in one file)
- `netlify/functions/slots.js` — the API backing shared storage
- `netlify.toml` — Netlify build/redirect config
- `package.json` — declares the `@netlify/blobs` dependency
