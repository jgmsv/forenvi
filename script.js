// Adicionando a biblioteca Omnivore
var script = document.createElement('script');
script.src = "https://unpkg.com/leaflet-omnivore@0.3.4/leaflet-omnivore.min.js";
document.head.appendChild(script);

var crsPTTM06 = L.CRS.EPSG3857;

var map = L.map('map', {
    crs: crsPTTM06,
    fullscreenControl: true,
    fullscreenControlOptions: { position: 'topleft' }
}).setView([40.0, -7.0], 6);

// Camadas de Base
var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

var satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri, Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye'
});

var terreno = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap'
});

// Camadas de Raster Pré-definidas
var raster1 = L.imageOverlay('raster1.png', [[-23.7, -46.8], [-23.3, -46.4]]);
var raster2 = L.imageOverlay('raster2.png', [[-23.7, -46.8], [-23.3, -46.4]]);

// Controle de Camadas
var baseMaps = { "OpenStreetMap": osm, "Satélite": satelite, "Terreno": terreno };
var overlayMaps = { "Raster 1": raster1, "Raster 2": raster2 };
L.control.layers(baseMaps, overlayMaps, { position: 'topright' }).addTo(map);

// Controles de desenho
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

var drawControl = new L.Control.Draw({
    position: 'topleft',
    edit: { featureGroup: drawnItems },
    draw: {
        polygon: {
            allowIntersection: false,
            shapeOptions: { color: '#3388ff', weight: 4, fillOpacity: 0.6 }
        },
        polyline: false, rectangle: false, circle: false, marker: false
    }
});
map.addControl(drawControl);

// Captura formas desenhadas
map.on(L.Draw.Event.CREATED, function (e) {
    drawnItems.addLayer(e.layer);
});

// Controles de upload e download de KML
var kmlControl = L.control({ position: 'topleft' });

var kmlControl = L.control({ position: 'topleft' });

kmlControl.onAdd = function () {
    var div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');

    div.innerHTML = `
        <input type="file" id="uploadKML" accept=".kml" style="display:none;" />
        <button id="uploadKMLButton" title="Upload KML">📂</button>
        <button id="downloadKML" title="Download KML">⬇️</button>
        <button id="sendKML" title="Enviar KML para a ForEnvi">📧</button>
    `;

    // Definir comportamento dos botões
    div.querySelector('#uploadKMLButton').onclick = () => document.getElementById('uploadKML').click();
    
    // Garantir que os botões tenham o mesmo estilo
    Array.from(div.querySelectorAll('button')).forEach((button) => {
        button.classList.add('leaflet-control-button');
    });

    return div;
};

kmlControl.addTo(map);


// Upload de KML
document.getElementById('uploadKML').addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file || !file.name.endsWith('.kml')) {
        alert('Por favor, selecione um arquivo KML válido.');
        return;
    }

    var reader = new FileReader();
    reader.onload = function (event) {
        var blob = new Blob([event.target.result], { type: 'application/vnd.google-earth.kml+xml' });
        var url = URL.createObjectURL(blob);

        var kmlLayer = omnivore.kml(url)
            .on('ready', function () { map.fitBounds(kmlLayer.getBounds()); })
            .on('error', function () { alert('Erro ao carregar o arquivo KML.'); })
            .addTo(map);
    };
    reader.readAsText(file);
});

// Função para converter formas desenhadas em KML
function convertToKML(layerGroup) {
    var kml = `<?xml version="1.0" encoding="UTF-8"?>
    <kml xmlns="http://www.opengis.net/kml/2.2">
    <Document>`;

    layerGroup.eachLayer(layer => {
        if (layer instanceof L.Polygon) {
            var coords = layer.getLatLngs()[0].map(latlng => `${latlng.lng},${latlng.lat},0`).join(" ");

            kml += `<Placemark>
                <Polygon>
                    <outerBoundaryIs>
                        <LinearRing>
                            <coordinates>${coords}</coordinates>
                        </LinearRing>
                    </outerBoundaryIs>
                </Polygon>
            </Placemark>`;
        }
    });

    kml += `</Document></kml>`;
    return kml;
}

// Botão para baixar KML
document.getElementById('downloadKML').addEventListener('click', function () {
    if (drawnItems.getLayers().length === 0) {
        alert("Não há formas desenhadas para exportar.");
        return;
    }

    var fileName = prompt("Digite o nome do arquivo para download:", "meu_mapa");
    if (!fileName) return;

    var kmlData = convertToKML(drawnItems);
    var blob = new Blob([kmlData], { type: 'application/vnd.google-earth.kml+xml' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName + ".kml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

// Função para fazer upload do KML para o Dropbox
async function uploadKMLToDropbox(kmlContent, fileName) {
    const fileBlob = new Blob([kmlContent], { type: "application/vnd.google-earth.kml+xml" });

    const response = await fetch("https://content.dropboxapi.com/2/files/upload", {
        method: "POST",
        headers: {
            "Authorization": "Bearer sl.u.AFiAeY3Tc0rFcm-bGYAdudB_43yuFvmUeK3Ha7icw7mf5EHP-NO8T5JXXqSWkziu6-j9tZ7rfnES5EiJ0tg4ouzwzipZlDK7xwzoaZiYinzWB6OWJZzbDAzYsfrcfnNFg019Rn2Mr_oLh3kvHvNAA7ODwEcR4RKVrUyT8tiUd10Kt8E5_bzCnThfzmXscb0nW_tJHvtXo-bd7pI8VqPpgvvdZ9vOgLuvaWy0AoqN3yEahsytTyvT0p__md68IEzSWB9gwEUTH1JCbniY7YnlqVG9unF0aAyNLuNAWvxjfSAyY9R9pqFf26Os4Wm8wBZrJ4LyQlHJJFaXaICiH1Xfcro1Uwrp4rzCE1GJtVcnyNzVCTgJkXIezNVgxAUp1CFU4Rw4Oc-j9xcvpT8A-LAB_VC8fOgtCSR7_Rfx8qaa5GYzxJ1F_YBcHNzy8-0pRMD2F36nYHqSdNHP9qLR2PqsqTio7MaY6vwbeLmEa_wNAqS_pgFDLWv4shPG3T3fxxQs8fkSWOoSLZRw6NeJI769Pfi4PgCZoNcQW9osOd_U07PZW1-d_wqSGYzuP9t_cdcekmkr50UASjCXkC32KDPmbyuKK1e4pR949VEXt9wRxxdGwTJzitZnQPAq3MWh3VhjU7Q0a68JqoIo2m_1yR7OPyXr3nii2QSwRwlrFcLaP18H4EXyIgmcYRFH8BRD3Tcj2lbnbwhltrAg_RZF7YKc8szwdh6Vy7Hl95jocwkKTTvHcpIHblswn7ASlDrwbfHCv5gN5vDn2MU3hYFs3hclBY4aRBDm7sZxOkv3zQUXRG8Uh1Uvgx8PovzsWaQhTgFW4HuqrdXM5g9uAygGsYyWDVAE-W30_ua7haplU2483QJEhRJzcf_Q8Gs_deOAB1TWzia3gF4WSPTEfvT90SOTAomtg6C12mvbxmeMN7sMf2gXI0lYNAMYZNiL6LgjwIQWcff-PpRQPOQvOvcrxOHjwOq9qVdgVUO1NWgglXbUAfAKgfgH82GF7_gnJ_alwKkTdXIWlk9MroT3X6tN5bXh1AaR_KIWuPqawgiToAVu_THgzIrJHNn5sgIMM8ZoEUeflyIDyxbRPL5MzTss1j1fWET7aAhQcqfTd6eRC6ilpimMZ1S6SRH8AjjypnnxCE-bF127vGOOb5818c-KVMHagR2tIIq1Jz_C-If4mujATSR6pdlSnmSjBVO7F-PxGc5c8t4i0Wu0N0EWgGhS-MoQAPq0Y_Bd1bV_JBCS4fHuwaIGwaunmY7h0uepNgBRLglL_iOZI7lewqhzDUWUdm3IXveDQxQesQc0S7Yb0cCyCjiwIFS1UZjxcRgH0rEuWjNPWL3e1SWZxcnG3u_W0l44H1GSg3WRokdEfqHTcxklT7f3iFJFE6FqwIlyqyJvLCDeH7Jqx7hE_vwSD16-Yuwx2jh8Gv1jfNhWpgmMIIC5lux_hRRilQ5s-Ghlom8VE9oiBQE",
            "Content-Type": "application/octet-stream",
            "Dropbox-API-Arg": JSON.stringify({
                path: `/${fileName}.kml`,
                mode: "overwrite",
                autorename: true
            })
        },
        body: fileBlob
    });

    if (!response.ok) {
        console.error("Erro ao enviar para o Dropbox:", await response.text());
        return null;
    }

    const data = await response.json();
    console.log("Arquivo enviado com sucesso para o Dropbox:", data.path_display);
    return data.path_display;
}

// Atualizando o botão de envio para salvar KML no Dropbox
document.getElementById('sendKML').addEventListener('click', async function () {
    if (drawnItems.getLayers().length === 0) {
        alert("Não há formas desenhadas para enviar.");
        return;
    }

    var fileName = prompt("Digite o nome do arquivo para enviar", "meu_mapa");
    if (!fileName) return;

    var kmlContent = convertToKML(drawnItems);

    // Faz upload para Dropbox
    const filePath = await uploadKMLToDropbox(kmlContent, fileName);
    if (!filePath) {
        alert("Erro ao fazer upload para o Dropbox.");
        return;
    }

    alert(`Arquivo KML "${fileName}.kml" enviado para o Dropbox com sucesso!`);
});

// Adicionando o controle de localização
L.control.locate({
    position: 'topleft',
    drawCircle: true,
    setView: true,
    flyTo: true,
    icon: 'fa fa-location-arrow',
    iconLoading: 'fa fa-circle-notch fa-spin',
    metric: false,
    strings: { title: "Mostrar minha localização", popup: "Você está aqui!" }
}).addTo(map);