const DEFAULT_CITY = { name: '北京', id: '101010100' };
const CITIES_KEY = 'wuxing_cities';

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });
}

function normalizeCities(value) {
  const source = Array.isArray(value) ? value : [];
  const seen = new Set();
  const cities = [];

  for (const item of source) {
    if (!item || typeof item.name !== 'string' || typeof item.id !== 'string') continue;
    const city = { name: item.name.trim(), id: item.id.trim() };
    if (!city.name || !city.id || seen.has(city.id)) continue;
    seen.add(city.id);
    cities.push(city);
  }

  if (!seen.has(DEFAULT_CITY.id)) {
    cities.unshift(DEFAULT_CITY);
  }

  return cities;
}

async function readCities(env) {
  const saved = await env.CITIES_KV.get(CITIES_KEY, 'json');
  return normalizeCities(saved);
}

export async function onRequestGet({ env }) {
  if (!env.CITIES_KV) {
    return json({ code: '500', message: 'CITIES_KV 未绑定' }, { status: 500 });
  }

  const cities = await readCities(env);
  return json({ code: '200', cities });
}

export async function onRequestPost({ request, env }) {
  if (!env.CITIES_KV) {
    return json({ code: '500', message: 'CITIES_KV 未绑定' }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({ code: '400', message: '请求 JSON 无效' }, { status: 400 });
  }

  const cities = normalizeCities(body.cities);
  await env.CITIES_KV.put(CITIES_KEY, JSON.stringify(cities));

  return json({ code: '200', cities });
}
