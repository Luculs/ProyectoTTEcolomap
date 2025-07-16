const mapa = L.map("mapa", {
  center: [4.5709, -74.2973],  // Centro de Colombia
  zoom: 6,
  minZoom: 6,
  maxZoom: 17,
  maxBounds: [
    [13.5, -82],
    [-4.5, -65]
  ],
  maxBoundsViscosity: 1.0
});

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "OpenStreetMap",
}).addTo(mapa);

let marcador;
let chart;

mapa.on("click", async (e) => {
  const { lat, lng } = e.latlng;

  if (marcador) marcador.setLatLng(e.latlng);
  else marcador = L.marker(e.latlng).addTo(mapa);

  const info = document.getElementById("info");
  info.textContent = "Buscando estación más cercana...";

  try {
    const res = await fetch("https://www.datos.gov.co/resource/sgfv-3yp8.json?$limit=100000&$where=fechaobservacion >= '2025-01-01'");
    const data = await res.json();

    const estaciones = data
      .filter(d =>
        d.latitud && d.longitud &&
        d.valorobservado && d.descripcionsensor?.toLowerCase().includes("viento")
      )
      .map(d => ({
        ...d,
        distancia: distanciaHaversine(lat, lng, parseFloat(d.latitud), parseFloat(d.longitud))
      }))
      .sort((a, b) => a.distancia - b.distancia);

    if (estaciones.length === 0) {
      info.textContent = "No se encontraron estaciones cercanas.";
      return;
    }

    const cercana = estaciones[0];
    info.innerHTML = `
      <strong>Estación:</strong> ${cercana.nombreestacion || "Sin nombre"}<br>
      <strong>Departamento:</strong> ${cercana.departamento || "No disponible"}<br>
      <strong>Municipio:</strong> ${cercana.municipio || "No disponible"}<br>
      <strong>Latitud:</strong> ${cercana.latitud}<br>
      <strong>Longitud:</strong> ${cercana.longitud}<br>
      <strong>Velocidad del viento:</strong> ${cercana.valorobservado} ${cercana.unidadmedida || ""}<br>
      <strong>Fecha de observación:</strong> ${new Date(cercana.fechaobservacion).toLocaleString()}<br>
      <strong>Distancia al punto:</strong> ${cercana.distancia.toFixed(2)} km
    `;

    // Determina tipo de filtro seleccionado
    const tipo = document.querySelector('input[name="tipo"]:checked')?.value || "año";

    // Pide datos históricos para esa estación
    const historialRes = await fetch(`https://www.datos.gov.co/resource/sgfv-3yp8.json?$limit=150000000&codigoestacion=${cercana.codigoestacion}`);
const historialData = await historialRes.json();

if (!Array.isArray(historialData)) {
  console.error("Error en los datos históricos", historialData);
  return;
}

    const agrupado = agrupar(historialData, tipo);

    graficar(agrupado.labels, agrupado.valores);
  } catch (err) {
    console.error(err);
    info.textContent = "Error al obtener los datos.";
  }
});

function distanciaHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// Agrupa datos por tipo: año, mes, día, etc.
function agrupar(data, tipo) {
  const map = new Map();

  data.forEach(d => {
    if (!d.fechaobservacion || !d.valorobservado) return;

    const fecha = new Date(d.fechaobservacion);
    let clave = "";

    switch (tipo) {
      case "año":
        clave = fecha.getFullYear();
        break;
      case "mes":
        clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        break;
      case "día":
        clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
        break;
      case "velocidad":
        clave = parseFloat(d.valorobservado).toFixed(0);  // agrupación por rangos
        break;
    }

    const valor = parseFloat(d.valorobservado);
    if (!map.has(clave)) map.set(clave, []);
    map.get(clave).push(valor);
  });

  const labels = Array.from(map.keys()).sort();
  const valores = labels.map(k => promedio(map.get(k)));

  return { labels, valores };
}

function promedio(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function graficar(labels, valores) {
  const ctx = document.getElementById("grafico").getContext("2d");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Viento',
        data: valores,
        borderColor: '#2e86de',
        backgroundColor: 'rgba(46,134,222,0.2)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { ticks: { maxTicksLimit: 6 } },
        y: { beginAtZero: true }
      }
    }
  });
}
