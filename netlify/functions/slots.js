// Netlify Function backing the booking page.
// Uses Netlify Blobs for shared, persistent storage across all visitors and deploys.
// No external account or API keys needed — Blobs is provisioned automatically
// for any site deployed on Netlify.

const { getStore } = require("@netlify/blobs");

const STORE_NAME = "interview-bookings";
const KEY = "bookings";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Content-Type": "application/json",
  };
}

function json(statusCode, obj) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(obj) };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isAdmin(event) {
  const key = event.headers["x-admin-key"] || event.headers["X-Admin-Key"];
  return !!process.env.ADMIN_KEY && key === process.env.ADMIN_KEY;
}

// Strips name/email out of the booking map so the public slot grid can only
// ever learn "taken or not" — never who booked it.
function stripPII(data) {
  const stripped = {};
  for (const slotId of Object.keys(data)) {
    stripped[slotId] = { booked: true };
  }
  return stripped;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }

  const store = getStore(STORE_NAME);

  if (event.httpMethod === "GET") {
    const providedKey = event.headers["x-admin-key"] || event.headers["X-Admin-Key"];
    if (providedKey && !isAdmin(event)) {
      return json(401, { error: "Incorrect admin password." });
    }

    const data = (await store.get(KEY, { type: "json" })) || {};
    if (providedKey && isAdmin(event)) {
      return json(200, data);
    }
    return json(200, stripPII(data));
  }

  if (event.httpMethod === "POST") {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (e) {
      return json(400, { error: "Invalid request body." });
    }

    const slotId = typeof body.slotId === "string" ? body.slotId.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!slotId || !name || !email) {
      return json(400, { error: "Name, email, and slot are all required." });
    }
    if (name.length > 100 || email.length > 150) {
      return json(400, { error: "Input too long." });
    }
    if (!isValidEmail(email)) {
      return json(400, { error: "Please enter a valid email address." });
    }

    // Re-read right before writing to minimize (not fully eliminate) race conditions.
    const data = (await store.get(KEY, { type: "json" })) || {};

    if (data[slotId]) {
      return json(409, { error: "Sorry, that slot was just booked by someone else." });
    }

    data[slotId] = { name, email, bookedAt: new Date().toISOString() };
    await store.set(KEY, JSON.stringify(data));

    return json(200, { success: true });
  }

  if (event.httpMethod === "DELETE") {
    if (!isAdmin(event)) {
      return json(401, { error: "Not authorized." });
    }

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (e) {
      return json(400, { error: "Invalid request body." });
    }

    const slotId = typeof body.slotId === "string" ? body.slotId.trim() : "";
    if (!slotId) {
      return json(400, { error: "slotId is required." });
    }

    const data = (await store.get(KEY, { type: "json" })) || {};
    if (!data[slotId]) {
      return json(404, { error: "That slot isn't booked." });
    }

    delete data[slotId];
    await store.set(KEY, JSON.stringify(data));

    return json(200, { success: true });
  }

  return json(405, { error: "Method not allowed." });
};
