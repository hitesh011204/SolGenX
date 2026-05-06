// ======================================================
// ☀️ SOLGENX AI_BOT.js (FULL STABLE + FEATURE ENHANCED)
// ======================================================

// ===============================
// 🔌 SERIAL
// ===============================
let port = null;
let reader = null;
let buffer = "";

// ===============================
// 📦 TRACKER VALUES
// ===============================
let trackerAzimuth = 0;
let trackerElevation = 0;

// ===============================
// 📈 CHART
// ===============================
let currentChart = null;
let selectedField = "power";
let chartPending = false;

// ===============================
// ☁️ THINGSPEAK
// ===============================
const writeAPIKey = "YTL83BF454EVI0G5";

// ===============================
// 🌍 LOCATION
// ===============================
const LAT = 12.895307;
const LON = 77.627810;

// ===============================
// ☀️ SUN DATA
// ===============================
let sunAzimuth = 0;
let sunElevation = 0;

// ===============================
// 🌦 WEATHER
// ===============================
let weatherStatus = "--";
let temperature = 0;
let humidityValue = 0;

// ===============================
// 📦 LIVE DATA
// ===============================
const liveData = {
  battery: [],
  current: [],
  power: [],
  azimuth: [],
  elevation: [],
  solarVoltage: []
};

let liveLabels = [];

const fieldsMap = [
  "battery",
  "current",
  "power",
  "azimuth",
  "elevation",
  "solarVoltage"
];

// ======================================================
// 🚀 INIT
// ======================================================
document.addEventListener("DOMContentLoaded", () => {

  setupBot();
  setupCards();
  setupChart();

  // initial UI sync
  updateLiveSunTab();

  setTimeout(() => {
    getWeather();
    getSunPosition();

    setInterval(getWeather, 60000);
    setInterval(getSunPosition, 60000);
  }, 1000);
});

// ======================================================
// 🤖 BOT
// ======================================================
function setupBot() {
  const btn = document.getElementById("botBtn");
  const box = document.getElementById("chatBox");

  if (!btn || !box) return;

  btn.onclick = () => {
    box.style.display =
      box.style.display === "block" ? "none" : "block";
  };
}

// ======================================================
// 🔥 CARD CLICK → GRAPH SWITCH
// ======================================================
function setupCards() {

  fieldsMap.forEach(id => {

    const card = document.getElementById(id);
    if (!card) return;

    card.style.cursor = "pointer";

    card.onclick = () => {

      selectedField = id;

      document.querySelectorAll(".card")
        .forEach(c => c.classList.remove("active"));

      card.classList.add("active");

      updateChart();
    };
  });
}

// ======================================================
// ☀️ SUN POSITION
// ======================================================
async function getSunPosition() {

  try {
    const url =
`https://api.sunrise-sunset.org/json?lat=${LAT}&lng=${LON}&formatted=0`;

    const res = await fetch(url);
    const data = await res.json();

    const sunrise = new Date(data.results.sunrise);
    const sunset = new Date(data.results.sunset);
    const now = new Date();

    let progress = (now - sunrise) / (sunset - sunrise);
    progress = Math.max(0, Math.min(1, progress));

    sunAzimuth = Math.round(progress * 180);
    sunElevation = Math.round(Math.sin(progress * Math.PI) * 90);

    setValue("sunAzimuth", sunAzimuth + "°");
    setValue("sunElevation", sunElevation + "°");

    updateLiveSunTab();

  } catch (e) {
    console.log("Sun API Failed", e);
  }
}

// ======================================================
// 🌦 WEATHER
// ======================================================
async function getWeather() {

  try {
    const url =
`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,cloud_cover,precipitation`;

    const res = await fetch(url);
    const data = await res.json();

    const c = data.current;

    temperature = c.temperature_2m;
    humidityValue = c.relative_humidity_2m;

    weatherStatus =
      c.precipitation > 0 ? "Rain" :
      c.cloud_cover > 60 ? "Cloudy" : "Clear";

    setValue("temp", temperature + " °C");
    setValue("humidity", humidityValue + " %");
    setValue("weather", weatherStatus);

  } catch {
    setValue("weather", "Offline");
  }
}

// ======================================================
// 🔌 SERIAL
// ======================================================
async function connectSerial() {

  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });

    const decoder = new TextDecoderStream();
    port.readable.pipeTo(decoder.writable);

    reader = decoder.readable.getReader();

    typeText("✅ Arduino Connected");

    readSerial();

  } catch {
    typeText("❌ Connection Failed");
  }
}

// ======================================================
// 📡 SERIAL READ
// ======================================================
async function readSerial() {

  while (true) {

    const { value, done } = await reader.read();
    if (done) break;

    buffer += value;

    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (let line of lines) {

      line = line.trim();
      if (!line) continue;

      if (line.startsWith("S1:")) {
        parseFullData(line);
      }
    }
  }
}

// ======================================================
// 🔥 PARSER
// ======================================================
function parseFullData(line) {

  try {

    const obj = {};

    line.split(",").forEach(part => {
      const [k, v] = part.split(":");
      obj[k.trim()] = parseFloat(v);
    });

    trackerAzimuth = obj.S2;
    trackerElevation = obj.S1;

    setValue("azimuth", trackerAzimuth + "°");
    setValue("elevation", trackerElevation + "°");

    updateLiveSunTab();

    const solar = obj.SV;
    const battery = obj.BV;
    const current = obj.I;
    const power = obj.P;

    setValue("solarVoltage", solar + " V");
    setValue("battery", battery + " V");
    setValue("current", current + " A");
    setValue("power", power + " W");

    pushData("power", power, true);
    pushData("battery", battery);
    pushData("current", current);
    pushData("solarVoltage", solar);
    pushData("azimuth", trackerAzimuth);
    pushData("elevation", trackerElevation);

    requestChartUpdate();

    uploadThingSpeak(
      battery, current, power,
      trackerAzimuth, trackerElevation, solar
    );

  } catch (e) {
    console.log("Parse error", e);
  }
}

// ======================================================
// 🌞 LIVE SUN TAB FIX
// ======================================================
function updateLiveSunTab() {

  // SAFE UPDATE (matches HTML IDs)
  const map = {
    sunAzimuthBig: `Solar Horizontal : ${sunAzimuth}°`,
    sunElevationBig: `Solar Vertical : ${sunElevation}°`,
    azimuthBig: `Tracker Horizontal : ${trackerAzimuth}°`,
    elevationBig: `Tracker Vertical : ${trackerElevation}°`
  };

  Object.keys(map).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerText = map[id];
  });
}

// ======================================================
// 📦 DATA
// ======================================================
function pushData(field, value, addLabel = false) {

  liveData[field].push(value);

  if (liveData[field].length > 20)
    liveData[field].shift();

  if (addLabel) {

    const now = new Date();

    liveLabels.push(
      `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`
    );

    if (liveLabels.length > 20)
      liveLabels.shift();
  }
}

// ======================================================
// 📊 CHART
// ======================================================
function setupChart() {
  createChart();
}

function createChart() {

  const ctx =
    document.getElementById("solarChart").getContext("2d");

  currentChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: liveLabels,
      datasets: [{
        label: selectedField,
        data: liveData[selectedField],
        borderWidth: 3,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      animation: false
    }
  });
}

function requestChartUpdate() {

  if (chartPending) return;

  chartPending = true;

  setTimeout(() => {
    updateChart();
    chartPending = false;
  }, 300);
}

function updateChart() {

  if (!currentChart) return;

  currentChart.data.labels = [...liveLabels];
  currentChart.data.datasets[0].data =
    [...liveData[selectedField]];

  currentChart.data.datasets[0].label =
    selectedField.toUpperCase();

  currentChart.update();
}

// ======================================================
// ☁️ THINGSPEAK
// ======================================================
function uploadThingSpeak(b, c, p, az, el, sv) {

  const url =
`https://api.thingspeak.com/update?api_key=${writeAPIKey}&field1=${b}&field2=${c}&field3=${p}&field4=${az}&field5=${el}&field6=${sv}`;

  fetch(url).catch(() => {});
}

// ======================================================
// 💬 TEXT
// ======================================================
function typeText(text) {
  const box = document.getElementById("chatContent");
  if (box) box.innerHTML = text.replace(/\n/g, "<br>");
}

// ======================================================
// HELPER
// ======================================================
function setValue(id, txt) {
  const el = document.getElementById(id);
  if (el) el.innerText = txt;
}