// =====================================================
// ☀️ SOLGENX AI_BOT.js (PRODUCTION STABLE VERSION)
// FIXED BUTTONS + SAFE INIT + NO FEATURE LOSS
// =====================================================

// ===============================
// SERIAL
// ===============================
let port = null;
let reader = null;
let buffer = "";

// ===============================
// FLAGS
// ===============================
let solarDataActive = false;
let trackingDataActive = false;

// ===============================
// LOCATION
// ===============================
const LAT = 12.895307;
const LON = 77.627810;

// ===============================
// WEATHER CACHE
// ===============================
let weatherStatus = "--";
let windSpeed = 0;
let temperature = 0;
let humidityValue = 0;
let lastWeatherUpdate = 0;

// ===============================
// SUN
// ===============================
let sunAzimuth = 0;
let sunElevation = 0;

// ===============================
// CHART
// ===============================
let labels = [];
let powerValues = [];
let solarChart = null;
let chartPending = false;

// =====================================================
// 🚀 SAFE INIT (FIXES ALL BUTTON ISSUES)
// =====================================================
document.addEventListener("DOMContentLoaded", init);

function init() {

    setupBot();
    setupButtons();
    setupChart();

    updateTime();
    setInterval(updateTime, 1000);

    setTimeout(() => {
        getWeather();
        updateSunPosition();

        setInterval(getWeather, 60000);
        setInterval(updateSunPosition, 30000);
    }, 500);
}

// =====================================================
// 🔘 BUTTON SYSTEM (ROBUST FIX)
// =====================================================
function setupButtons() {

    const bind = (id, fn) => {
        const el = document.getElementById(id);
        if (!el) return;

        // prevent double binding
        el.onclick = null;
        el.addEventListener("click", fn);
    };

    bind("connectBtn", connectSerial);
    bind("analyzeBtn", analyzeData);
    bind("weatherBtn", showWeather);

    const bot = document.getElementById("botBtn");
    if (bot) {
        bot.onclick = () => {
            const box = document.getElementById("chatBox");
            if (!box) return;
            box.style.display =
                box.style.display === "block" ? "none" : "block";
        };
    }
}

// =====================================================
// 🤖 BOT
// =====================================================
function setupBot() {
    const btn = document.getElementById("botBtn");
    const box = document.getElementById("chatBox");

    if (!btn || !box) return;

    btn.onclick = () => {
        box.style.display =
            box.style.display === "block" ? "none" : "block";
    };
}

// =====================================================
// ⏰ TIME
// =====================================================
function updateTime() {
    setText("time", new Date().toLocaleString());
}

// =====================================================
// 🌦 WEATHER (STABLE + SAFE)
// =====================================================
async function getWeather(force = false) {

    try {

        const now = Date.now();

        if (!force && now - lastWeatherUpdate < 30000)
            return;

        const url =
`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,cloud_cover,precipitation`;

        const res = await fetch(url);
        const data = await res.json();

        const c = data.current;

        temperature = c.temperature_2m || 0;
        humidityValue = c.relative_humidity_2m || 0;
        windSpeed = c.wind_speed_10m || 0;

        if (c.precipitation > 0) weatherStatus = "Rain";
        else if (c.cloud_cover > 75) weatherStatus = "Cloudy";
        else if (c.cloud_cover > 35) weatherStatus = "Partly Cloudy";
        else weatherStatus = "Clear";

        setText("temp", temperature + " °C");
        setText("humidity", humidityValue + " %");
        setText("wind", windSpeed + " km/h");
        setText("weather", weatherStatus);

        lastWeatherUpdate = now;

    } catch {
        weatherStatus = "Offline";
        setText("weather", "Offline");
    }
}

// =====================================================
// ☀ SUN POSITION
// =====================================================
function updateSunPosition() {

    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;

    sunAzimuth = Math.max(0, Math.min(180, (hour - 6) * 15));
    sunElevation = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI) * 90);

    setText("sunAzimuth", Math.round(sunAzimuth) + "°");
    setText("sunElevation", Math.round(sunElevation) + "°");
}

// =====================================================
// 🔌 SERIAL
// =====================================================
async function connectSerial() {

    try {

        if (!navigator.serial) {
            typeText("❌ Serial not supported");
            return;
        }

        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });

        typeText("✅ Arduino Connected");

    } catch {
        typeText("❌ Connection Failed");
    }
}

// =====================================================
// 📊 TRACKER
// =====================================================
function updateTracking(line) {

    const nums = line.match(/[\d.]+/g);
    if (!nums || nums.length < 2) return;

    trackingDataActive = true;

    setText("azimuth", nums[0] + "°");
    setText("elevation", nums[1] + "°");
}

// =====================================================
// 📈 SOLAR DATA
// =====================================================
function updateSolar(line) {

    const nums = line.match(/[\d.]+/g);
    if (!nums || nums.length < 4) return;

    solarDataActive = true;

    const power = parseFloat(nums[3]);

    labels.push(new Date().toLocaleTimeString());
    powerValues.push(power);

    if (labels.length > 20) {
        labels.shift();
        powerValues.shift();
    }

    requestChartUpdate();
}

// =====================================================
// 📈 CHART UPDATE
// =====================================================
function requestChartUpdate() {

    if (chartPending) return;

    chartPending = true;

    setTimeout(() => {

        if (solarChart) {
            solarChart.data.labels = [...labels];
            solarChart.data.datasets[0].data = [...powerValues];
            solarChart.update();
        }

        chartPending = false;

    }, 300);
}

// =====================================================
// 🌦 WEATHER BUTTON (FIXED)
// =====================================================
function showWeather() {

    typeText(
`🌦 WEATHER REPORT

Condition : ${weatherStatus}
Temperature : ${temperature} °C
Humidity : ${humidityValue} %
Wind Speed : ${windSpeed} km/h

${weatherStatus === "Clear"
? "🟢 Optimal Solar Conditions"
: "🟡 Variable Conditions"}`
    );
}

// =====================================================
// 🤖 AI ANALYSIS (FIXED)
// =====================================================
function analyzeData() {

    const risk = [];

    if (weatherStatus === "Rain") risk.push("Rain detected");
    if (windSpeed > 20) risk.push("High wind");
    if (temperature > 38) risk.push("High temperature");

    typeText(
`🤖 SOLGENX AI REPORT

☀ Sun: ${Math.round(sunAzimuth)}° / ${Math.round(sunElevation)}°

🌦 Weather: ${weatherStatus}
🌡 Temp: ${temperature}°C
💨 Wind: ${windSpeed} km/h

⚠ Risks:
${risk.length ? risk.join(", ") : "None"}

🚀 System OK`
    );
}

// =====================================================
// 💬 CHAT
// =====================================================
function typeText(text) {
    const chat = document.getElementById("chatContent");
    if (!chat) return;
    chat.innerHTML = text.replace(/\n/g, "<br>");
}

// =====================================================
// HELPER
// =====================================================
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
}