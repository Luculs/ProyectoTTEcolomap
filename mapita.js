// mapita.js

let mapa;
let marcador;

// Crea el mapa y configura el evento de clic
export function inicializarMapa(onClickHandler) {
  mapa = L.map("mapa", {
    center: [4.5709, -74.2973], // Centro de Colombia
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

  mapa.on("click", async (e) => {
    const { lat, lng } = e.latlng;

    if (marcador) marcador.setLatLng(e.latlng);
    else marcador = L.marker(e.latlng).addTo(mapa);

    onClickHandler(lat, lng); // Llama función externa con lat y lng
  });
}
