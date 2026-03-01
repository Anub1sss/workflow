const BASE = "/api";

function qs(params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, v);
  });
  return q.toString();
}

export async function fetchChannels(params = {}) {
  const res = await fetch(`${BASE}/channels?${qs(params)}`);
  if (!res.ok) throw new Error("Failed to fetch channels");
  return res.json();
}

export async function fetchChannel(username) {
  const res = await fetch(`${BASE}/channels/${encodeURIComponent(username)}`);
  if (!res.ok) throw new Error("Channel not found");
  return res.json();
}

export async function fetchStatsFiltered(params = {}) {
  const res = await fetch(`${BASE}/stats?${qs(params)}`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function fetchPosts(params = {}) {
  const res = await fetch(`${BASE}/posts?${qs(params)}`);
  if (!res.ok) throw new Error("Failed to fetch posts");
  return res.json();
}

export async function fetchCategories() {
  const res = await fetch(`${BASE}/categories`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

export async function fetchChannelsList() {
  const res = await fetch(`${BASE}/channels/list`);
  if (!res.ok) throw new Error("Failed to fetch channels list");
  return res.json();
}

export async function fetchTags() {
  const res = await fetch(`${BASE}/tags`);
  if (!res.ok) throw new Error("Failed to fetch tags");
  return res.json();
}
