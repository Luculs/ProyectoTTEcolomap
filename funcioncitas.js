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

let graficoGlobal;

export async function obtenerEstacionMasCercana(lat, lng) {
  const info = document.getElementById("info");
  info.textContent = "Buscando estación más cercana...";

  const hoy = new Date();
  const haceUnAnio = new Date(hoy.getFullYear() - 1, hoy.getMonth(), hoy.getDate());
  const fechaISO = haceUnAnio.toISOString().split("T")[0];
  const url = `https://www.datos.gov.co/resource/sgfv-3yp8.json?$limit=100000&$where=fechaobservacion >= '${fechaISO}'`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    const estacionesFiltradas = data.filter(d =>
      d.latitud && d.longitud &&
      d.valorobservado && d.descripcionsensor?.toLowerCase().includes("viento")
    );

    const estaciones = estacionesFiltradas.map(d => ({
      ...d,
      distancia: distanciaHaversine(lat, lng, parseFloat(d.latitud), parseFloat(d.longitud))
    })).sort((a, b) => a.distancia - b.distancia);

    if (estaciones.length === 0) {
      info.textContent = "No se encontraron estaciones cercanas.";
      return;
    }

    const cercana = estaciones[0];
    const codigo = cercana.codigoestacion;

    const observacionesEstacion = estacionesFiltradas.filter(d => d.codigoestacion === codigo);
    const observacionMasReciente = observacionesEstacion.sort((a, b) => new Date(b.fechaobservacion) - new Date(a.fechaobservacion))[0];

    info.innerHTML = `
      <strong>Estación:</strong> ${observacionMasReciente.nombreestacion || "Sin nombre"}<br>
      <strong>Departamento:</strong> ${observacionMasReciente.departamento || "No disponible"}<br>
      <strong>Municipio:</strong> ${observacionMasReciente.municipio || "No disponible"}<br>
      <strong>Latitud:</strong> ${observacionMasReciente.latitud}<br>
      <strong>Longitud:</strong> ${observacionMasReciente.longitud}<br>
      <strong>Velocidad del viento:</strong> ${observacionMasReciente.valorobservado} ${observacionMasReciente.unidadmedida || ""}<br>
      <strong>Fecha de observación:</strong> ${new Date(observacionMasReciente.fechaobservacion).toLocaleString()}<br>
      <strong>Distancia al punto:</strong> ${cercana.distancia.toFixed(2)} km
    `;

    // Guardar datos para graficar
    const filtro = document.querySelector('input[name="tipo"]:checked').value;
    const hoyFiltro = new Date();
    let inicioFiltro;

    if (filtro === "año") {
      inicioFiltro = new Date(hoyFiltro.getFullYear() - 1, hoyFiltro.getMonth(), hoyFiltro.getDate());
    } else if (filtro === "mes") {
      inicioFiltro = new Date(hoyFiltro.getFullYear(), hoyFiltro.getMonth() - 1, hoyFiltro.getDate());
    } else {
      inicioFiltro = new Date(hoyFiltro);
      inicioFiltro.setDate(hoyFiltro.getDate() - 2);
    }

    const datosFiltrados = observacionesEstacion
      .filter(r => new Date(r.fechaobservacion) >= inicioFiltro)
      .sort((a, b) => new Date(a.fechaobservacion) - new Date(b.fechaobservacion))
      .map(r => ({
        fecha: r.fechaobservacion,
        valor: parseFloat(r.valorobservado)
      }));

    window.datosGraficar = datosFiltrados;

  } catch (error) {
    console.error(error);
    info.textContent = "Error al obtener los datos.";
  }
}

document.getElementById("btnGraficar").addEventListener("click", () => {
  if (!window.datosGraficar || window.datosGraficar.length === 0) {
    alert("No hay datos para graficar.");
    return;
  }

  localStorage.setItem("datosGrafica", JSON.stringify(window.datosGraficar));
  window.open("graficaCompleta.html", "_blank");
});
