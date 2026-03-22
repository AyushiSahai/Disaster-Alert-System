document.addEventListener('DOMContentLoaded', () => {

  const currentUrl = "https://api.openweathermap.org/data/2.5/weather?units=metric&q=";
  const forecastUrl = "https://api.openweathermap.org/data/2.5/forecast?units=metric&q=";
  const WIND_ALERT_THRESHOLD = 1;

  const searchInput = document.getElementById("search-input");
  const searchBtn = document.getElementById("search-btn");
  const locationBtn = document.getElementById("current-location-btn");
  const errorMessage = document.getElementById("error-message");
  const weatherInfo = document.getElementById("weather-info");
  const forecastContainer = document.getElementById("forecast-container");
  const forecastList = document.getElementById("forecast-list");
  const cityName = document.getElementById("city-name");
  const temperature = document.getElementById("temperature");
  const humidity = document.getElementById("humidity");
  const windSpeed = document.getElementById("wind-speed");
  const weatherIcon = document.getElementById("weather-icon");
  const rain = document.getElementById("rain");
  const dropdown = document.getElementById("recent-cities-dropdown");
  const recentList = document.getElementById("recent-cities-list");

  const weatherIcons = {
    "01d":"clear","01n":"clear","02d":"clouds","02n":"clouds",
    "03d":"clouds","03n":"clouds","04d":"clouds","04n":"clouds",
    "09d":"rain","09n":"rain","10d":"rain","10n":"rain",
    "11d":"thunderstorm","11n":"thunderstorm",
    "13d":"snow","13n":"snow","50d":"mist","50n":"mist"
  };

  let recentCities = JSON.parse(localStorage.getItem("recentCities")) || [];
  let suppressDropdownTemporarily = false;

  function updateDropdown() {
    if (suppressDropdownTemporarily) return;
    recentList.innerHTML = "";
    if (recentCities.length === 0) {
      dropdown.classList.add("hidden");
      return;
    }
    recentCities.forEach(city => {
      const li = document.createElement("li");
      li.textContent = city;
      li.onclick = () => {
        searchInput.value = city;
        fetchWeather(city);
        dropdown.classList.add("hidden");
      };
      recentList.appendChild(li);
    });
    dropdown.classList.remove("hidden");
  }

  function addToRecent(city) {
    recentCities = recentCities.filter(c => c.toLowerCase() !== city.toLowerCase());
    recentCities.unshift(city);
    recentCities = recentCities.slice(0, 5);
    localStorage.setItem("recentCities", JSON.stringify(recentCities));
  }

  function showError(msg) {
    errorMessage.querySelector("p").textContent = msg;
    errorMessage.classList.remove("hidden");
    weatherInfo.classList.add("hidden");
    forecastContainer.classList.add("hidden");
  }

  function hideError() {
    errorMessage.classList.add("hidden");
  }

  async function fetchWeatherData(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status === 404 ? "City not found" : "Weather data unavailable");
    return await res.json();
  }

  async function fetchWeather(city) {
    try {
      const weatherData = await fetchWeatherData(`${currentUrl}${city}&appid=${apiKey}`);
      const forecastData = await fetchWeatherData(`${forecastUrl}${city}&appid=${apiKey}`);
      displayWeather(weatherData);
      displayForecast(forecastData);
      addToRecent(city);
    } catch (err) {
      showError(err.message);
    }
  }

  function displayWeather(data) {
    cityName.textContent = data.name;
    temperature.textContent = `${Math.round(data.main.temp)}°c`;
    humidity.textContent = `${data.main.humidity}%`;
    windSpeed.textContent = `${data.wind.speed} km/h`;
    weatherIcon.src = `images/${weatherIcons[data.weather[0].icon]}.png`;
    weatherIcon.alt = data.weather[0].main;
    const rainVol = data.rain?.["1h"] ?? data.rain?.["3h"] ?? 0;
    rain.textContent = `${rainVol} mm`;

    weatherInfo.classList.remove("hidden");
    hideError();

    const weatherMain = data.weather[0].main.toLowerCase();
    const windValue = data.wind.speed;
    if (weatherMain.includes("rain") || weatherMain.includes("storm")) {
      sendSmsAlert(`⚠️ Weather Alert for ${data.name}: ${weatherMain.toUpperCase()}`);
    }
    if (windValue >= WIND_ALERT_THRESHOLD) {
      sendSmsAlert(`⚠️ High Wind Alert for ${data.name}: ${windValue.toFixed(1)} m/s`);
    }
  }

  function displayForecast(data) {
    forecastList.innerHTML = "";
    const daily = data.list.filter(f => f.dt_txt.includes("12:00:00")).slice(0,5);
    daily.forEach(day => {
      const date = new Date(day.dt * 1000);
      const rainAmount = day.rain?.["3h"] ?? 0;
      const div = document.createElement("div");
      div.innerHTML = `
        <p>${date.toLocaleDateString("en-US",{weekday:"short"})}</p>
        <img src="images/${weatherIcons[day.weather[0].icon]}.png" alt="${day.weather[0].main}" class="w-12"/>
        <p>${Math.round(day.main.temp)}°c</p>
        <p>${day.main.humidity}% Humidity</p>
        <p>${day.wind.speed} km/h Wind</p>
        <p>${rainAmount} mm Rain</p>`;
      forecastList.appendChild(div);
    });
    forecastContainer.classList.remove("hidden");
  }

  function fetchLocationWeather() {
    if (!navigator.geolocation) return showError("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const { latitude, longitude } = pos.coords;
        const weatherData = await fetchWeatherData(`${currentUrl}lat=${latitude}&lon=${longitude}&appid=${apiKey}`);
        const forecastData = await fetchWeatherData(`${forecastUrl}lat=${latitude}&lon=${longitude}&appid=${apiKey}`);
        displayWeather(weatherData);
        displayForecast(forecastData);
        addToRecent(weatherData.name);
      } catch (err) {
        showError(err.message);
      }
    }, () => showError("Unable to retrieve your location"));
  }

  async function sendSmsAlert(message) {
    try {
      const res = await fetch("http://localhost:3000/api/send-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });
      const data = await res.json();
      if (data.success) alert("✅ SMS Alert sent! ID: " + data.messageId);
      else throw new Error(data.error);
    } catch (err) {
      console.error("❌ SMS error:", err);
    }
  }

  function hideDropdownTemporarily() {
    dropdown.classList.add("hidden");
    suppressDropdownTemporarily = true;
    setTimeout(() => suppressDropdownTemporarily = false, 500);
  }

  searchBtn.onclick = () => {
    const city = searchInput.value.trim();
    if (city) {
      fetchWeather(city);
      hideDropdownTemporarily();
    } else showError("Please enter a city name");
  };

  searchInput.addEventListener("keypress", e => {
    if (e.key === "Enter") {
      searchBtn.click();
      hideDropdownTemporarily();
    }
  });

  searchInput.addEventListener("focus", () => {
    if (recentCities.length && !suppressDropdownTemporarily) updateDropdown();
  });

  document.addEventListener("click", e => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.add("hidden");
  });

  locationBtn.onclick = fetchLocationWeather;
  updateDropdown();
});
