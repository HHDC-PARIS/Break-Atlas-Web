// Break Atlas - Main Application Logic
import { auth, db, addDoc, collection, orderBy, onSnapshot, serverTimestamp } from './firebase-config.js';

// --- DATA & STATE ---
let map;
let markers = [];
let currentSpots = [];
let favorites = JSON.parse(localStorage.getItem('breakAtlas_favorites')) || [];
let settings = JSON.parse(localStorage.getItem('breakAtlas_settings')) || {
    mapStyle: 'dark',
    accentColor: '#FF5722'
};

// Mock data for initial population
const mockSpots = [
    { id: 1, title: "Centquatre-Paris (104)", type: "spot", continent: "Europe", country: "France", city: "Paris", lat: 48.8905, lng: 2.3730, time: "Open Daily: 12:00 - 19:00", crew: "Paris City Breakers", desc: "Iconic indoor spot. Smooth floor, open to all dancers.", img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800" },
    { id: 4, title: "Gare de Lyon", type: "spot", continent: "Europe", country: "France", city: "Paris", lat: 48.8443, lng: 2.3744, time: "Evenings & Weekends", crew: "Pokemon Crew", desc: "Underground practice spot in the station corridors.", img: "https://images.unsplash.com/photo-1550950158-d0d960dff51b?w=800" },
    { id: 2, title: "Southbank Centre", type: "spot", continent: "Europe", country: "United Kingdom", city: "London", lat: 51.5055, lng: -0.1160, time: "Daily: 10:00 - 22:00", crew: "Soul Mavericks", desc: "Legendary concrete spot under the bridge. Bring kneepads.", img: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800" },
    { id: 6, title: "IBE Festival 2025", type: "jam", continent: "Europe", country: "Netherlands", city: "Heerlen", lat: 50.8882, lng: 5.9795, time: "August 14-16, 2025", crew: "The Notorious IBE", desc: "The ultimate Hip Hop dance festival. Cyphers everywhere.", img: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800" },
    { id: 10, title: "Berlin Hbf Tunnel", type: "cypher", continent: "Europe", country: "Germany", city: "Berlin", lat: 52.5251, lng: 13.3694, time: "Fridays: 20:00 - 23:00", crew: "Berlin Street Rockers", desc: "Underground vibe. Concrete floor.", img: "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800" },
    { id: 9, title: "Outbreak Europe", type: "jam", continent: "Europe", country: "Slovakia", city: "Banska Bystrica", lat: 48.7363, lng: 19.1462, time: "July 2025", crew: "The Legits", desc: "Rawest vibe in Europe. 8 days of hip hop.", img: "https://images.unsplash.com/photo-1565619624098-e6598cb33852?w=800" },
    { id: 5, title: "Yoyogi Park", type: "spot", continent: "Asia", country: "Japan", city: "Tokyo", lat: 35.6717, lng: 139.6949, time: "Sundays", crew: "Found Nation", desc: "Huge park with rockabilly and breakers near the entrance.", img: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800" },
    { id: 8, title: "Battle of the Year", type: "jam", continent: "Asia", country: "Japan", city: "Osaka", lat: 34.6937, lng: 135.5023, time: "October 2025", crew: "BOTY", desc: "The world cup of breaking crews.", img: "https://images.unsplash.com/photo-1590559899731-a38283956c8c?w=800" },
    { id: 12, title: "Hongdae Playground", type: "cypher", continent: "Asia", country: "South Korea", city: "Seoul", lat: 37.5575, lng: 126.9245, time: "Friday Nights", crew: "Jinjo Crew", desc: "Street performances and open sessions.", img: "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=800" },
    { id: 3, title: "Washington Square Park", type: "spot", continent: "North America", country: "USA", city: "New York", lat: 40.7308, lng: -73.9973, time: "Weather permitting", crew: "Dynamic Rockers", desc: "Outdoor cyphers near the arch. Classic NYC vibe.", img: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800" },
    { id: 11, title: "Venice Beach Boardwalk", type: "cypher", continent: "North America", country: "USA", city: "Los Angeles", lat: 33.9850, lng: -118.4695, time: "Weekends", crew: "Cali Breakers", desc: "Sunny vibes, tourists, and raw circles.", img: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800" },
    { id: 7, title: "Red Bull BC One World Final", type: "jam", continent: "South America", country: "Brazil", city: "Rio de Janeiro", lat: -22.9068, lng: -43.1729, time: "November 2025", crew: "Red Bull", desc: "The biggest 1on1 battle in the world.", img: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800" }
];

// --- INITIALIZATION ---
window.firestoreSpots = [];

window.updateSpotsFromFirestore = function (spots) {
    window.firestoreSpots = spots;
    const allSpots = [...mockSpots, ...spots];
    window.renderList(allSpots);
    window.addMarkers(allSpots);
}

window.onload = () => {
    applySettings();
    initMap();

    if (window.firestoreSpots && window.firestoreSpots.length > 0) {
        window.updateSpotsFromFirestore(window.firestoreSpots);
    } else {
        window.renderList(mockSpots);
        window.addMarkers(mockSpots);
    }

    // Subscribe to Firestore spots
    const q = query(collection(db, "spots"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        const spots = [];
        snapshot.forEach((doc) => {
            spots.push({ id: doc.id, ...doc.data() });
        });

        if (window.updateSpotsFromFirestore) {
            window.updateSpotsFromFirestore(spots);
        } else {
            window.firestoreSpots = spots;
        }
    });
};

// --- CORE FUNCTIONS ---
function initMap() {
    if (map) map.remove();
    map = L.map('map').setView([20, 0], 2);
    window.map = map;

    const darkTiles = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    const lightTiles = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    L.tileLayer(settings.mapStyle === 'dark' ? darkTiles : lightTiles, {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Map Click Listener for Location Picker
    map.on('click', (e) => {
        if (window.handleMapClick) window.handleMapClick(e);
    });
}

function applySettings() {
    document.documentElement.style.setProperty('--primary', settings.accentColor);
    document.documentElement.setAttribute('data-theme', settings.mapStyle);
    document.getElementById('btn-map-style').innerText = settings.mapStyle === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    document.querySelectorAll('.color-dot').forEach(dot => dot.classList.remove('selected'));
}

window.addMarkers = function (data) {
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    data.forEach(spot => {
        const color = spot.type === 'spot' ? '#2196F3' : (spot.type === 'jam' ? '#E91E63' : '#FFC107');
        const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color:${color}; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow: 0 0 10px ${color};"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });
        const marker = L.marker([spot.lat, spot.lng], { icon: icon }).addTo(map);
        marker.on('click', () => openModal(spot));
        markers.push(marker);
    });
}

window.renderList = function (data) {
    currentSpots = data;
    const feed = document.getElementById('feed');
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
    feed.innerHTML = '';

    // Sort data: Continent -> Country -> Title
    const sortedData = [...data].sort((a, b) => {
        const contA = a.continent || "Other";
        const contB = b.continent || "Other";
        if (contA !== contB) return contA.localeCompare(contB);

        const countryA = a.country || "Unknown";
        const countryB = b.country || "Unknown";
        if (countryA !== countryB) return countryA.localeCompare(countryB);

        return a.title.localeCompare(b.title);
    });

    let lastContinent = '';
    let lastCountry = '';

    sortedData.forEach(spot => {
        const continent = spot.continent || "Other";
        const country = spot.country || "Unknown";

        if (continent !== lastContinent) {
            feed.innerHTML += `<div class="group-header-continent">${continent}</div>`;
            lastContinent = continent;
            lastCountry = '';
        }

        if (country !== lastCountry) {
            feed.innerHTML += `<div class="group-header-country"><span class="material-icons-round" style="font-size:1rem;">public</span> ${country}</div>`;
            lastCountry = country;
        }

        const isFav = favorites.includes(spot.id);
        const tagClass = spot.type === 'spot' ? 'tag-spot' : (spot.type === 'jam' ? 'tag-jam' : 'tag-cypher');
        const imgUrl = spot.img || "https://images.unsplash.com/photo-1535525153412-5a42439a210d?w=800";

        const card = `
        <div class="card" onclick='openModal(${JSON.stringify(spot).replace(/'/g, "&#39;")})'>
            <img src="${imgUrl}" class="card-img">
            <div class="card-fav-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite('${spot.id}', this)">
                <span class="material-icons-round">favorite</span>
            </div>
            <div class="card-body">
                <span class="card-tag ${tagClass}">${spot.type}</span>
                <div class="card-title">${spot.title}</div>
                <div class="card-meta">
                    <span class="material-icons-round" style="font-size: 14px;">calendar_today</span> ${spot.time}
                </div>
                <div class="card-meta" style="margin-top:5px;">
                    <span class="material-icons-round" style="font-size: 14px;">location_on</span> ${spot.city}
                </div>
            </div>
        </div>
        `;
        feed.innerHTML += card;
    });
}

// --- NAVIGATION & VIEWS ---
window.switchView = function (viewId) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const navItems = document.querySelectorAll('.nav-item');
    if (viewId === 'home') navItems[0].classList.add('active');
    if (viewId === 'profile') navItems[1].classList.add('active');
    if (viewId === 'crews') navItems[2].classList.add('active');
    if (viewId === 'favorites') navItems[3].classList.add('active');
    if (viewId === 'settings') navItems[4].classList.add('active');

    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.add('active');

    toggleNav();

    if (viewId === 'favorites') renderFavoritesView();
    if (viewId === 'home') setTimeout(() => map.invalidateSize(), 300);
}

window.toggleNav = function () {
    document.getElementById('sideNav').classList.toggle('active');
}

window.toggleAuth = function () {
    const modal = document.getElementById('authModal');
    modal.classList.toggle('active');
}

window.handleAddClick = function () {
    if (!window.currentUser) {
        alert("Please log in to add a spot.");
        toggleAuth();
        return;
    }
    document.getElementById('addSpotModal').classList.add('active');
}

// --- FAVORITES LOGIC ---
window.toggleFavorite = function (id, btnElement) {
    if (favorites.includes(id)) {
        favorites = favorites.filter(favId => favId !== id);
        if (btnElement) btnElement.classList.remove('active');
    } else {
        favorites.push(id);
        if (btnElement) btnElement.classList.add('active');
    }
    localStorage.setItem('breakAtlas_favorites', JSON.stringify(favorites));

    if (document.getElementById('view-favorites').classList.contains('active')) {
        renderFavoritesView();
    }
}

function renderFavoritesView() {
    const container = document.getElementById('favorites-feed');
    container.innerHTML = '';

    const allSpots = [...mockSpots, ...currentSpots];
    const uniqueSpots = Array.from(new Map(allSpots.map(item => [item.id, item])).values());
    const favSpots = uniqueSpots.filter(s => favorites.includes(s.id));

    if (favSpots.length === 0) {
        container.innerHTML = `
        <div class="empty-state" style="text-align:center; padding:40px; color:var(--text-sub);">
            <span class="material-icons-round" style="font-size:3rem; margin-bottom:10px;">favorite_border</span>
            <h3>No Favorites Yet</h3>
            <p>Heart spots to save them here.</p>
        </div>
        `;
        return;
    }

    favSpots.forEach(spot => {
        const tagClass = spot.type === 'spot' ? 'tag-spot' : (spot.type === 'jam' ? 'tag-jam' : 'tag-cypher');
        const imgUrl = spot.img || "https://images.unsplash.com/photo-1535525153412-5a42439a210d?w=800";
        const card = `
        <div class="card" onclick='openModal(${JSON.stringify(spot).replace(/'/g, "&#39;")})'>
            <img src="${imgUrl}" class="card-img">
            <div class="card-fav-btn active" onclick="event.stopPropagation(); toggleFavorite('${spot.id}', this)">
                <span class="material-icons-round">favorite</span>
            </div>
            <div class="card-body">
                <span class="card-tag ${tagClass}">${spot.type}</span>
                <div class="card-title">${spot.title}</div>
                <div class="card-meta">
                    <span class="material-icons-round" style="font-size: 14px;">location_on</span> ${spot.city}, ${spot.country}
                </div>
            </div>
        </div>
        `;
        container.innerHTML += card;
    });
}

// --- MODAL LOGIC ---
window.openModal = function (spot) {
    const modal = document.getElementById('detailModal');
    document.getElementById('modalImg').src = spot.img || "https://images.unsplash.com/photo-1535525153412-5a42439a210d?w=800";
    document.getElementById('modalType').innerText = spot.type;
    document.getElementById('modalType').className = 'card-tag ' + (spot.type === 'spot' ? 'tag-spot' : (spot.type === 'jam' ? 'tag-jam' : 'tag-cypher'));
    document.getElementById('modalTitle').innerText = spot.title;
    document.getElementById('modalCity').innerText = `${spot.city}, ${spot.country}`;
    document.getElementById('modalTime').innerText = spot.time;
    document.getElementById('modalDesc').innerText = spot.desc;

    const favBtn = document.getElementById('modalFavBtn');
    if (favorites.includes(spot.id)) {
        favBtn.innerText = 'favorite';
        favBtn.style.color = '#ff4444';
    } else {
        favBtn.innerText = 'favorite_border';
        favBtn.style.color = '#555';
    }

    modal.dataset.spotId = spot.id;
    modal.classList.add('active');
}

window.closeModal = function () {
    document.getElementById('detailModal').classList.remove('active');
}

window.toggleModalFavorite = function () {
    const modal = document.getElementById('detailModal');
    const spotId = isNaN(modal.dataset.spotId) ? modal.dataset.spotId : parseInt(modal.dataset.spotId);

    toggleFavorite(spotId, null);

    const favBtn = document.getElementById('modalFavBtn');
    if (favorites.includes(spotId)) {
        favBtn.innerText = 'favorite';
        favBtn.style.color = '#ff4444';
    } else {
        favBtn.innerText = 'favorite_border';
        favBtn.style.color = '#555';
    }
}

// --- SETTINGS LOGIC ---
window.toggleMapStyle = function () {
    settings.mapStyle = settings.mapStyle === 'dark' ? 'light' : 'dark';
    localStorage.setItem('breakAtlas_settings', JSON.stringify(settings));
    applySettings();
    initMap();
    window.addMarkers(currentSpots.length > 0 ? currentSpots : mockSpots);
}

window.setAccentColor = function (color) {
    settings.accentColor = color;
    localStorage.setItem('breakAtlas_settings', JSON.stringify(settings));
    applySettings();
}

window.clearData = function () {
    if (confirm('Are you sure you want to reset all favorites and settings?')) {
        localStorage.clear();
        location.reload();
    }
}

// --- SEARCH & FILTER ---
window.filterList = function (query) {
    const allSpots = [...mockSpots, ...window.firestoreSpots];
    const filtered = allSpots.filter(s =>
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        s.city.toLowerCase().includes(query.toLowerCase()) ||
        s.country.toLowerCase().includes(query.toLowerCase())
    );
    window.renderList(filtered);
}

window.filterType = function (type, btn) {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');

    const allSpots = [...mockSpots, ...window.firestoreSpots];
    if (type === 'all') {
        window.renderList(allSpots);
        window.addMarkers(allSpots);
    } else {
        const filtered = allSpots.filter(s => s.type === type);
        window.renderList(filtered);
        window.addMarkers(filtered);
    }
}

// --- ADD SPOT LOGIC ---
window.submitSpot = async (e) => {
    e.preventDefault();
    if (!window.currentUser) {
        alert("Please log in to add a spot.");
        toggleAuth();
        return;
    }

    const title = document.getElementById('addTitle').value;
    const type = document.getElementById('addType').value;
    const city = document.getElementById('addCity').value;
    const country = document.getElementById('addCountry').value;
    const continent = document.getElementById('addContinent').value;
    const time = document.getElementById('addTime').value;
    const desc = document.getElementById('addDesc').value;
    const lat = parseFloat(document.getElementById('addLat').value);
    const lng = parseFloat(document.getElementById('addLng').value);

    if (!lat || !lng) {
        alert("Please pick a location on the map.");
        return;
    }

    try {
        await addDoc(collection(db, "spots"), {
            title, type, city, country, continent, time, desc, lat, lng,
            createdAt: serverTimestamp(),
            createdBy: window.currentUser.uid,
            creatorName: window.currentUser.displayName,
            img: null
        });
        alert("Spot added successfully!");
        document.getElementById('addSpotModal').classList.remove('active');
        document.getElementById('addSpotForm').reset();
        document.getElementById('locPickerText').innerText = "Tap to pick on map";
    } catch (err) {
        console.error("Error adding spot: ", err);
        alert("Error adding spot: " + err.message);
    }
}

// --- LOCATION PICKER ---
window.startLocationPicker = () => {
    window.isPickingLocation = true;
    document.getElementById('addSpotModal').classList.remove('active');
    alert("Tap on the map to select location.");
};

window.handleMapClick = (e) => {
    if (window.isPickingLocation) {
        const { lat, lng } = e.latlng;
        document.getElementById('addLat').value = lat;
        document.getElementById('addLng').value = lng;
        document.getElementById('locPickerText').innerText = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        if (window.tempMarker && window.map) window.map.removeLayer(window.tempMarker);
        if (window.map) window.tempMarker = L.marker([lat, lng]).addTo(window.map);

        window.isPickingLocation = false;
        document.getElementById('addSpotModal').classList.add('active');
    }
};
