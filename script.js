// Uygulama Durumu
let currentUnit = 'C';
let currentData = null;
let currentCityName = "İstanbul";
let selectedDayIndex = 0;
let activeCanvasAnimation = null;

// Hava Durumu WMO Kodları & Metin Eşleşmeleri
const weatherCodes = {
    0: { text: "Açık Gökyüzü", icon: "fa-sun", bg: "https://images.unsplash.com/photo-1622396481328-9b1b78cdd9fd?q=80&w=2000", effect: "sun" },
    1: { text: "Çoğunlukla Açık", icon: "fa-cloud-sun", bg: "https://images.unsplash.com/photo-1534088568595-a066f410bcda?q=80&w=2000", effect: "clouds" },
    2: { text: "Parçalı Bulutlu", icon: "fa-cloud-sun", bg: "https://images.unsplash.com/photo-1534088568595-a066f410bcda?q=80&w=2000", effect: "clouds" },
    3: { text: "Kapalı / Bulutlu", icon: "fa-cloud", bg: "https://images.unsplash.com/photo-1534088568595-a066f410bcda?q=80&w=2000", effect: "clouds" },
    45: { text: "Yoğun Sisli", icon: "fa-smog", bg: "https://images.unsplash.com/photo-1487621167305-5d248087c724?q=80&w=2000", effect: "fog" },
    51: { text: "Hafif Çiseleme", icon: "fa-cloud-rain", bg: "https://images.unsplash.com/photo-1519692933481-e162a57d6721?q=80&w=2000", effect: "rain" },
    61: { text: "Sağanak Yağmurlu", icon: "fa-cloud-showers-heavy", bg: "https://images.unsplash.com/photo-1519692933481-e162a57d6721?q=80&w=2000", effect: "rain" },
    71: { text: "Kar Yağışlı", icon: "fa-snowflake", bg: "https://images.unsplash.com/photo-1483664852095-d6cc6870702d?q=80&w=2000", effect: "snow" },
    95: { text: "Gökgürültülü Fırtına", icon: "fa-bolt-lightning", bg: "https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?q=80&w=2000", effect: "thunder" }
};

// DOM Elemanları
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const unitToggle = document.getElementById('unitToggle');
const loader = document.getElementById('loader');
const dashboard = document.getElementById('dashboard');

// Etkinlik Dinleyicileri
searchBtn.addEventListener('click', () => searchCity(searchInput.value));
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchCity(searchInput.value); });
locationBtn.addEventListener('click', getLocation);
unitToggle.addEventListener('click', toggleUnit);

// Başlangıç İşlemleri
document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    getLocation();
});

function getLocation() {
    showLoader("Konumunuz tespit ediliyor...");
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => fetchWeatherData(pos.coords.latitude, pos.coords.longitude, "Mevcut Konum", "Mevcut Konum"),
            () => searchCity("İstanbul")
        );
    } else {
        searchCity("İstanbul");
    }
}

async function searchCity(city) {
    if (!city.trim()) return;
    showLoader(`"${city}" aranıyor...`);
    try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=tr&format=json`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            const loc = data.results[0];
            const name = `${loc.name}, ${loc.country || ''}`;
            currentCityName = loc.name;
            fetchWeatherData(loc.latitude, loc.longitude, name, loc.name);
        } else {
            showError("Şehir bulunamadı. Lütfen geçerli bir isim girin.");
        }
    } catch (e) {
        showError("Arama sırasında bir hata oluştu.");
    }
}

async function fetchWeatherData(lat, lon, fullName, rawCityName) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto`;
        const res = await fetch(url);
        currentData = await res.json();
        currentData.locationName = fullName;
        currentData.cityName = rawCityName;
        selectedDayIndex = 0;
        
        renderUI();
    } catch (e) {
        showError("Hava durumu verileri yüklenemedi.");
    }
}

function renderUI() {
    const isToday = selectedDayIndex === 0;
    const dailyCode = currentData.daily.weather_code[selectedDayIndex];
    const info = weatherCodes[dailyCode] || weatherCodes[0];

    // Genel Arka Plan (Hava Durumu Temalı)
    changeBackground(info.bg);
    triggerEffect(info.effect);

    // Derece Kartının Arka Planı (Özel Şehir Görseli)
    setHeroCityBackground(currentData.cityName);

    // Konum ve Tarih Bilgisi
    document.getElementById('cityName').innerText = currentData.locationName;
    const dayDate = new Date(currentData.daily.time[selectedDayIndex]);
    document.getElementById('currentDate').innerText = dayDate.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

    // Sıcaklık ve Hava Durumu İkonu
    let mainTemp, feelsTemp, humidityVal, windVal, pressureVal;

    if (isToday) {
        mainTemp = currentData.current.temperature_2m;
        feelsTemp = currentData.current.apparent_temperature;
        humidityVal = `%${currentData.current.relative_humidity_2m}`;
        windVal = `${currentData.current.wind_speed_10m} km/s`;
        pressureVal = `${Math.round(currentData.current.surface_pressure)} hPa`;
    } else {
        mainTemp = currentData.daily.temperature_2m_max[selectedDayIndex];
        feelsTemp = mainTemp; 
        const dayStartIndex = selectedDayIndex * 24;
        humidityVal = `%${currentData.hourly.relative_humidity_2m[dayStartIndex + 12] || 50}`;
        windVal = `${currentData.hourly.wind_speed_10m[dayStartIndex + 12] || '--'} km/s`;
        pressureVal = `UV: ${currentData.daily.uv_index_max[selectedDayIndex] || '--'}`;
    }

    const displayedTemp = currentUnit === 'C' ? Math.round(mainTemp) : Math.round((mainTemp * 9/5) + 32);
    const displayedFeels = currentUnit === 'C' ? Math.round(feelsTemp) : Math.round((feelsTemp * 9/5) + 32);

    document.getElementById('tempVal').innerText = displayedTemp;
    document.getElementById('unitLabel').innerText = `°${currentUnit}`;
    document.getElementById('feelsLike').innerText = `${displayedFeels}°${currentUnit}`;
    document.getElementById('conditionText').innerText = info.text;
    document.getElementById('heroIcon').className = `fa-solid ${info.icon}`;

    // Metrikler
    document.getElementById('humidity').innerText = humidityVal;
    document.getElementById('wind').innerText = windVal;
    document.getElementById('pressure').innerText = pressureVal;

    // Saatlik ve Günlük Alanları Çizdir
    renderHourly();
    renderDaily();

    // Paneli Göster
    loader.style.display = 'none';
    dashboard.classList.add('visible');
}

function setHeroCityBackground(cityName) {
    const heroBg = document.getElementById('heroCardBg');
    const cityImgUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(cityName)},city,landmark`;
    
    const img = new Image();
    img.src = cityImgUrl;
    img.onload = () => {
        heroBg.style.backgroundImage = `url('${cityImgUrl}')`;
    };
    img.onerror = () => {
        heroBg.style.backgroundImage = `url('https://images.unsplash.com/photo-1477959858617-67f30ac4ce78?q=80&w=1000')`;
    };
}

function renderHourly() {
    const container = document.getElementById('hourlyContainer');
    container.innerHTML = '';
    
    const dayDateStr = currentData.daily.time[selectedDayIndex];
    document.getElementById('hourlyTitle').innerText = selectedDayIndex === 0 ? "Bugünün 24 Saatlik Akışı" : `${new Date(dayDateStr).toLocaleDateString('tr-TR', { weekday: 'long' })} Günü Akışı`;

    const startIndex = selectedDayIndex * 24;
    const hours = currentData.hourly.time.slice(startIndex, startIndex + 24);

    hours.forEach((time, idx) => {
        const actualIndex = startIndex + idx;
        const date = new Date(time);
        const code = currentData.hourly.weather_code[actualIndex];
        const icon = (weatherCodes[code] || weatherCodes[0]).icon;
        let temp = currentData.hourly.temperature_2m[actualIndex];
        if (currentUnit === 'F') temp = (temp * 9/5) + 32;

        const item = document.createElement('div');
        item.className = 'hourly-item';
        item.innerHTML = `
            <span class="time">${date.getHours()}:00</span>
            <i class="fa-solid ${icon}"></i>
            <span class="temp">${Math.round(temp)}°</span>
        `;
        container.appendChild(item);
    });
}

function renderDaily() {
    const container = document.getElementById('dailyContainer');
    container.innerHTML = '';
    const days = currentData.daily.time;

    days.forEach((time, i) => {
        const date = new Date(time);
        const dayName = i === 0 ? "Bugün" : date.toLocaleDateString('tr-TR', { weekday: 'short' });
        const code = currentData.daily.weather_code[i];
        const icon = (weatherCodes[code] || weatherCodes[0]).icon;
        
        let max = currentData.daily.temperature_2m_max[i];
        let min = currentData.daily.temperature_2m_min[i];
        if (currentUnit === 'F') {
            max = (max * 9/5) + 32;
            min = (min * 9/5) + 32;
        }

        const item = document.createElement('div');
        item.className = `daily-item ${i === selectedDayIndex ? 'active-day' : ''}`;
        item.innerHTML = `
            <span class="day-name">${dayName}</span>
            <i class="fa-solid ${icon}"></i>
            <div class="temp-range">
                <span>${Math.round(max)}°</span>
                <span class="min-temp">${Math.round(min)}°</span>
            </div>
        `;

        item.addEventListener('click', () => {
            selectedDayIndex = i;
            renderUI();
        });

        container.appendChild(item);
    });
}

function toggleUnit() {
    currentUnit = currentUnit === 'C' ? 'F' : 'C';
    unitToggle.innerText = `°${currentUnit}`;
    if (currentData) renderUI();
}

function changeBackground(url) {
    const bg1 = document.getElementById('bgLayer1');
    const bg2 = document.getElementById('bgLayer2');
    const active = bg1.classList.contains('active') ? bg1 : bg2;
    const next = active === bg1 ? bg2 : bg1;

    next.style.backgroundImage = `url('${url}')`;
    next.classList.add('active');
    active.classList.remove('active');
}

function showLoader(msg) {
    dashboard.classList.remove('visible');
    loader.style.display = 'block';
    document.getElementById('loaderMsg').innerText = msg;
}

function showError(msg) {
    loader.style.display = 'block';
    dashboard.classList.remove('visible');
    document.getElementById('loaderMsg').innerText = msg;
}

/* Canvas Yağmur / Kar Efekt Motoru */
let canvas, ctx, particles = [];

function initCanvas() {
    canvas = document.getElementById('weatherCanvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function triggerEffect(type) {
    if (activeCanvasAnimation) cancelAnimationFrame(activeCanvasAnimation);
    particles = [];

    if (type === 'rain') {
        for (let i = 0; i < 120; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                len: Math.random() * 20 + 10,
                speed: Math.random() * 10 + 15
            });
        }
        animateRain();
    } else if (type === 'snow') {
        for (let i = 0; i < 80; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 3 + 1,
                speed: Math.random() * 1 + 0.5
            });
        }
        animateSnow();
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function animateRain() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;

    particles.forEach(p => {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y + p.len);
        ctx.stroke();

        p.y += p.speed;
        if (p.y > canvas.height) {
            p.y = -p.len;
            p.x = Math.random() * canvas.width;
        }
    });

    activeCanvasAnimation = requestAnimationFrame(animateRain);
}

function animateSnow() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';

    particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        p.y += p.speed;
        if (p.y > canvas.height) {
            p.y = -p.r;
            p.x = Math.random() * canvas.width;
        }
    });

    activeCanvasAnimation = requestAnimationFrame(animateSnow);
}