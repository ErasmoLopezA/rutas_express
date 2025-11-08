let map, markerGroup, currentLocationMarker;
let addresses = [];
let verifiedAddresses = JSON.parse(localStorage.getItem('verifiedAddresses')) || [];
let showDelivered = false;

function showNotification(message) {
  const notif = document.getElementById('notification');
  notif.innerText = message;
  notif.style.display = 'block';
  setTimeout(() => notif.style.display = 'none', 2000);
}

function initMap() {
  map = L.map('map').setView([31.73, -106.48], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);
  markerGroup = L.layerGroup().addTo(map);

  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        if (!currentLocationMarker) {
          currentLocationMarker = L.circleMarker([latitude, longitude], {
            radius: 8,
            color: '#007bff',
            fillColor: '#007bff',
            fillOpacity: 1
          }).addTo(map);
          map.setView([latitude, longitude], 14);
        } else {
          currentLocationMarker.setLatLng([latitude, longitude]);
        }
      },
      () => showNotification('No se pudo obtener la ubicación, usando Ciudad Juárez.'),
      { enableHighAccuracy: true }
    );
  }
  updateSummary();
}

function updateSummary() {
  const pending = addresses.length;
  const verified = verifiedAddresses.filter(a => !a.entregado).length;
  const delivered = verifiedAddresses.filter(a => a.entregado).length;
  document.getElementById('pendingCount').textContent = `Pendientes: ${pending}`;
  document.getElementById('verifiedCount').textContent = `Verificadas: ${verified}`;
  document.getElementById('deliveredCount').textContent = `Entregadas: ${delivered}`;
}

function addMarkers() {
  markerGroup.clearLayers();
  addresses.forEach((addr, index) => {
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          const marker = L.marker([lat, lon]).addTo(markerGroup);
          marker.bindPopup(`<b>${addr}</b><br><button onclick="verifyAddress(${index}, ${lat}, ${lon})">✅ Verificar</button>`);
        }
      });
  });
}

function verifyAddress(index, lat, lon) {
  const addr = addresses[index];
  const record = {
    direccion: addr,
    lat: lat,
    lng: lon,
    fecha_verificacion: new Date().toISOString(),
    entregado: false
  };
  verifiedAddresses.push(record);
  localStorage.setItem('verifiedAddresses', JSON.stringify(verifiedAddresses));
  addresses.splice(index, 1);
  showNotification('✅ Dirección verificada y guardada');
  updateSummary();
  addMarkers();
}

function toggleDelivered() {
  showDelivered = !showDelivered;
  document.getElementById('toggleDeliveredBtn').textContent = showDelivered ? '⚪ Ocultar entregados' : '👁️ Mostrar entregados';
  addMarkers();
}

document.getElementById('voiceBtn').addEventListener('click', () => {
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = 'es-MX';
  recognition.start();
  showNotification('🎙️ Escuchando...');
  recognition.onresult = event => {
    const text = event.results[0][0].transcript;
    document.getElementById('addressInput').value += text + '\n';
  };
  recognition.onerror = () => showNotification('❌ Error en reconocimiento de voz');
});

document.getElementById('saveListBtn').addEventListener('click', () => {
  addresses = document.getElementById('addressInput').value.trim().split('\n').filter(l => l);
  document.getElementById('addressList').innerHTML = addresses.map(a => `<li>${a}</li>`).join('');
  updateSummary();
  showNotification('💾 Listado guardado');
});

document.getElementById('updateMapBtn').addEventListener('click', addMarkers);
document.getElementById('exportBtn').addEventListener('click', () => {
  const data = JSON.stringify(verifiedAddresses, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'direcciones_verificadas.json';
  link.click();
});
document.getElementById('toggleDeliveredBtn').addEventListener('click', toggleDelivered);

window.onload = initMap;
