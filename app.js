const locationButton = document.getElementById("location-btn");
const locationDebug = document.getElementById("location-debug");
const regenButton = document.getElementById("regen-btn");
const copyLinkButton = document.getElementById("copy-link-btn");
const copyToast = document.getElementById("copy-toast");
const tempNowEl = document.getElementById("temp-now");
const tempYesterdayEl = document.getElementById("temp-yesterday");
const tempDeltaEl = document.getElementById("temp-delta");
const windNowEl = document.getElementById("wind-now");
const rainNowEl = document.getElementById("rain-now");
const weatherSummaryEl = document.getElementById("weather-summary");
const iceCardEls = [
  document.getElementById("ice-card-1"),
  document.getElementById("ice-card-2"),
  document.getElementById("ice-card-3"),
];

const STOCKHOLM_FALLBACK = {
  lat: 59.3293,
  lon: 18.0686,
};

const TIMEZONE = "Europe/Stockholm";
const HOURLY_VARS = "temperature_2m,precipitation_probability,windspeed_10m";

const state = {
  lat: null,
  lon: null,
  source: "not set",
  loading: false,
  error: "",
  weather: null,
};
let toastTimerId = null;

function toFixedCoord(value) {
  return value.toFixed(4);
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildFromPools(openers, core, closers) {
  return `${pickRandom(openers)} ${core} ${pickRandom(closers)}`;
}

function renderLocationState() {
  const lat = state.lat === null ? "--" : toFixedCoord(state.lat);
  const lon = state.lon === null ? "--" : toFixedCoord(state.lon);
  const errorText = state.error ? ` | Error: ${state.error}` : "";

  locationDebug.textContent = `Using: lat ${lat}, lon ${lon} (${state.source})${errorText}`;
  locationDebug.classList.toggle("error", Boolean(state.error));

  locationButton.disabled = state.loading;
  locationButton.textContent = state.loading ? "Loading..." : "Use my location";
}

function showCopyToast() {
  if (toastTimerId) {
    window.clearTimeout(toastTimerId);
  }

  copyToast.classList.add("show");
  toastTimerId = window.setTimeout(() => {
    copyToast.classList.remove("show");
    toastTimerId = null;
  }, 1400);
}

function applyFallback(message) {
  state.lat = STOCKHOLM_FALLBACK.lat;
  state.lon = STOCKHOLM_FALLBACK.lon;
  state.source = "fallback";
  state.error = message;
  renderLocationState();
}

function requestPosition() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation is not supported in this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 0,
    });
  });
}

function setReceiptPlaceholders() {
  tempNowEl.textContent = "-- degC";
  tempYesterdayEl.textContent = "-- degC";
  tempDeltaEl.textContent = "-- degC";
  windNowEl.textContent = "-- m/s";
  rainNowEl.textContent = "-- %";
  weatherSummaryEl.textContent = "Weather unavailable right now.";
  state.weather = null;
}

function setDefaultIcebreakers() {
  const defaults = [
    {
      say: "Vädret laddar fortfarande, precis som allt annat här.",
      ask: "Hur mycket mer väder ska man behöva stå ut med idag?",
      twist: "Tålamodsskatt",
    },
    {
      say: "Kaffe funkar i alla temperaturer, till skillnad från kollektivtrafiken.",
      ask: "Termos för överlevnad eller islatte för förnekelse?",
      twist: "Koffeinplikt",
    },
    {
      say: "Stockholm levererar väderöverraskningar som ingen bett om.",
      ask: "Jacka-plan A eller frysa-i-tystnad-plan B?",
      twist: "Vardagsstraff",
    },
  ];

  renderIcebreakers(defaults);
}

function buildIcebreakers(weather) {
  const { tempNow, tempYesterday, tempDelta, windNow, rainProbNow } = weather;

  const requiredMentions = [];
  if (tempDelta >= 2) {
    requiredMentions.push("warmer than yesterday");
  }
  if (tempDelta <= -2) {
    requiredMentions.push("colder than yesterday");
  }
  if (windNow >= 8) {
    requiredMentions.push(pickRandom(["hair tax", "bike regret"]));
  }
  if (rainProbNow >= 50) {
    requiredMentions.push("umbrella anxiety");
  }
  if (rainProbNow < 20 && windNow < 5) {
    requiredMentions.push("suspiciously nice");
  }

  const trendFallback = pickRandom([
    "nästan samma som igår",
    "väldigt svenskt mellanläge",
    "inte dramatiskt men ändå snackvänligt",
  ]);
  const windFallback = pickRandom([
    "vinden är förvånansvärt snäll",
    "ingen större blåstpanik",
    "lagom vind, lagom ambition",
  ]);
  const rainFallback = pickRandom([
    "klassisk svensk mellanrisk",
    "lite osäkert men inte katastrof",
    "regnradarn får jobba övertid",
  ]);

  const temperaturePart =
    requiredMentions.find(
      (m) => m === "warmer than yesterday" || m === "colder than yesterday"
    ) || trendFallback;
  const windPart =
    requiredMentions.find((m) => m === "hair tax" || m === "bike regret") ||
    windFallback;
  const rainPart =
    requiredMentions.find(
      (m) => m === "umbrella anxiety" || m === "suspiciously nice"
    ) || rainFallback;

  const sayOpeners = ["Jaha,", "Perfekt då,", "Så klart,", "Kul för oss,"];
  const sayClosers = ["som vanligt.", "ingen blev förvånad.", "det var väl oundvikligt.", "tack för inget."];
  const askOpeners = ["Säg mig,", "Ärligt talat,", "Snabb reality-check,", "Hur tänkte vädret här,"];
  const askClosers = ["eller är vi bara uppgivna nu", "är det här rimligt på riktigt", "ska man skratta eller ge upp", "hur orkar folk med det här"];
  const twistOpeners = ["Twist:", "Sidonot:", "Bonusmisär:", "Plot twist:"];
  const twistClosers = ["som om dagen behövde mer motstånd.", "helt i onödan.", "innan man ens hunnit vakna.", "med maximal friktion."];

  const sayCorePool = shuffle([
    `${tempNow.toFixed(1)} degC nu och ${temperaturePart}`,
    `${Math.round(rainProbNow)}% regnrisk med ${rainPart}`,
    `igår ${tempYesterday.toFixed(1)} degC, nu ${tempNow.toFixed(1)} och ${windPart}`,
    `${windNow.toFixed(1)} m/s ute och ändå ${temperaturePart}`,
    `${rainPart} plus ${windPart}, det är dagens läge`,
  ]);

  const askCorePool = shuffle([
    "kör du jacka efter prognos eller ren självbevarelsedrift",
    "tar du paraply eller låter du vädret vinna igen",
    "är det cykelväder eller bike-break av självrespekt",
    "blir det promenad ändå eller kapitulation med kaffe",
    "kallar vi det här lagom eller bara sämre än igår",
  ]);

  const twistCorePool = shuffle([
    "frisyr mot fysik",
    "paraply mot värdighet",
    "vindkvitto utan retur",
    "svensk vädertrötthet",
    "kaffe mot undergång",
  ]);

  const cards = [0, 1, 2].map((index) => ({
    say: buildFromPools(sayOpeners, sayCorePool[index], sayClosers),
    ask: `${buildFromPools(askOpeners, askCorePool[index], askClosers)}?`,
    twist: buildFromPools(twistOpeners, twistCorePool[index], twistClosers),
  }));

  const missingMentions = requiredMentions.filter(
    (mention) => !cards.some((card) => card.say.includes(mention))
  );
  if (missingMentions.length > 0) {
    cards[0].say = `${cards[0].say} ${missingMentions.join(", ")}.`;
  }

  return cards;
}

function renderIcebreakers(cards) {
  cards.forEach((card, index) => {
    const host = iceCardEls[index];
    if (!host) {
      return;
    }

    host.innerHTML =
      `<h3>Icebreaker ${index + 1}</h3>` +
      `<p><strong>Say:</strong> ${card.say}</p>` +
      `<p><strong>Ask:</strong> ${card.ask}</p>` +
      `<p><strong>Twist:</strong> ${card.twist}</p>`;
  });
}

function regenerateIcebreakers() {
  if (!state.weather) {
    setDefaultIcebreakers();
    return;
  }

  const cards = buildIcebreakers(state.weather);
  renderIcebreakers(cards);
}

function getStockholmNowParts() {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(new Date());
  const map = {};

  parts.forEach((part) => {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  });

  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: map.hour,
  };
}

function getYesterdayDateString(nowParts) {
  const asUtcDate = new Date(
    Date.UTC(
      Number(nowParts.year),
      Number(nowParts.month) - 1,
      Number(nowParts.day)
    )
  );

  asUtcDate.setUTCDate(asUtcDate.getUTCDate() - 1);

  const year = asUtcDate.getUTCFullYear();
  const month = String(asUtcDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(asUtcDate.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildHourKey(dateString, hourString) {
  return `${dateString}T${hourString}:00`;
}

function getAtIndex(values, index) {
  if (!Array.isArray(values) || index < 0 || index >= values.length) {
    throw new Error("Missing weather value.");
  }

  const value = values[index];
  if (typeof value !== "number") {
    throw new Error("Invalid weather value.");
  }

  return value;
}

async function fetchWeatherForState() {
  const nowParts = getStockholmNowParts();
  const todayDate = `${nowParts.year}-${nowParts.month}-${nowParts.day}`;
  const yesterdayDate = getYesterdayDateString(nowParts);
  const todayHourKey = buildHourKey(todayDate, nowParts.hour);
  const yesterdayHourKey = buildHourKey(yesterdayDate, nowParts.hour);

  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${state.lat}` +
    `&longitude=${state.lon}` +
    `&hourly=${HOURLY_VARS}` +
    `&timezone=${encodeURIComponent(TIMEZONE)}`;

  const archiveUrl =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${state.lat}` +
    `&longitude=${state.lon}` +
    `&start_date=${yesterdayDate}` +
    `&end_date=${yesterdayDate}` +
    `&hourly=${HOURLY_VARS}` +
    `&timezone=${encodeURIComponent(TIMEZONE)}`;

  const [forecastRes, archiveRes] = await Promise.all([
    fetch(forecastUrl),
    fetch(archiveUrl),
  ]);

  if (!forecastRes.ok || !archiveRes.ok) {
    throw new Error("Weather fetch failed.");
  }

  const forecastData = await forecastRes.json();
  const archiveData = await archiveRes.json();

  if (!forecastData.hourly || !archiveData.hourly) {
    throw new Error("Missing hourly weather data.");
  }

  const todayIndex = forecastData.hourly.time.indexOf(todayHourKey);
  const yesterdayIndex = archiveData.hourly.time.indexOf(yesterdayHourKey);

  if (todayIndex === -1 || yesterdayIndex === -1) {
    throw new Error("Could not match current hour in weather data.");
  }

  const tempNow = getAtIndex(forecastData.hourly.temperature_2m, todayIndex);
  const tempYesterday = getAtIndex(archiveData.hourly.temperature_2m, yesterdayIndex);
  const windNow = getAtIndex(forecastData.hourly.windspeed_10m, todayIndex);
  const rainProbNow = getAtIndex(
    forecastData.hourly.precipitation_probability,
    todayIndex
  );

  const tempDelta = tempNow - tempYesterday;

  state.weather = {
    tempNow,
    tempYesterday,
    tempDelta,
    windNow,
    rainProbNow,
  };

  tempNowEl.textContent = `${tempNow.toFixed(1)} degC`;
  tempYesterdayEl.textContent = `${tempYesterday.toFixed(1)} degC`;
  tempDeltaEl.textContent = `${tempDelta >= 0 ? "+" : ""}${tempDelta.toFixed(1)} degC`;
  windNowEl.textContent = `${windNow.toFixed(1)} m/s`;
  rainNowEl.textContent = `${Math.round(rainProbNow)} %`;
  weatherSummaryEl.textContent = `Now ${tempNow.toFixed(1)} degC, rain ${Math.round(
    rainProbNow
  )}%, wind ${windNow.toFixed(1)} m/s.`;

  regenerateIcebreakers();
}

async function handleUseLocation() {
  state.loading = true;
  state.error = "";
  renderLocationState();

  try {
    const position = await requestPosition();
    state.lat = position.coords.latitude;
    state.lon = position.coords.longitude;
    state.source = "GPS";
  } catch (error) {
    const reason = error && error.message ? error.message : "Location lookup failed.";
    applyFallback(reason);
  }

  try {
    await fetchWeatherForState();
  } catch (error) {
    state.error = error && error.message ? error.message : "Weather fetch failed.";
    setReceiptPlaceholders();
    setDefaultIcebreakers();
  } finally {
    state.loading = false;
    renderLocationState();
  }
}

async function loadWeatherForCurrentLocation() {
  state.loading = true;
  state.error = "";
  renderLocationState();

  try {
    await fetchWeatherForState();
  } catch (error) {
    state.error = error && error.message ? error.message : "Weather fetch failed.";
    setReceiptPlaceholders();
    setDefaultIcebreakers();
  } finally {
    state.loading = false;
    renderLocationState();
  }
}

function getCoordsFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const latRaw = params.get("lat");
  const lonRaw = params.get("lon");
  if (!latRaw || !lonRaw) {
    return null;
  }

  const lat = Number.parseFloat(latRaw);
  const lon = Number.parseFloat(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  return { lat, lon };
}

function buildShareUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("lat", String(state.lat));
  url.searchParams.set("lon", String(state.lon));
  return url.toString();
}

async function handleCopyShareLink() {
  if (state.lat === null || state.lon === null) {
    state.error = "Set location first.";
    renderLocationState();
    return;
  }

  const shareUrl = buildShareUrl();
  try {
    await navigator.clipboard.writeText(shareUrl);
  } catch (error) {
    const hiddenInput = document.createElement("input");
    hiddenInput.value = shareUrl;
    document.body.appendChild(hiddenInput);
    hiddenInput.select();
    document.execCommand("copy");
    document.body.removeChild(hiddenInput);
  }

  showCopyToast();
}

async function bootstrapFromUrl() {
  const coords = getCoordsFromUrl();
  if (!coords) {
    return;
  }

  state.lat = coords.lat;
  state.lon = coords.lon;
  state.source = "URL";
  await loadWeatherForCurrentLocation();
}

locationButton.addEventListener("click", handleUseLocation);
regenButton.addEventListener("click", regenerateIcebreakers);
copyLinkButton.addEventListener("click", handleCopyShareLink);

setReceiptPlaceholders();
setDefaultIcebreakers();
renderLocationState();
bootstrapFromUrl();
