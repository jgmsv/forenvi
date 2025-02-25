//Navbar burguer
document.addEventListener("DOMContentLoaded", function () {
    const menuToggle = document.querySelector(".menu-toggle");
    const navLinks = document.querySelector(".nav-links");

    menuToggle.addEventListener("click", function () {
        navLinks.classList.toggle("active");
    });
});

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


kmlControl.onAdd = function () {
    var div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');

    div.innerHTML = `
        <input type="file" id="uploadKML" accept=".kml" style="display:none;" />
        <button id="uploadKMLButton" title="Upload KML">📂</button>
        <button id="downloadKML" title="Download KML">⬇️</button>
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

    // Iterando sobre as camadas desenhadas
    layerGroup.eachLayer(function(layer) {
        // Se for um Polígono
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

        // Se for um Ponto (Marker)
        if (layer instanceof L.Marker) {
            var latlng = layer.getLatLng();
            // Depuração: Verificando o que está sendo capturado
            console.log("Coordenadas do marcador:", latlng);  // Isso deve funcionar agora

            kml += `<Placemark>
                <Point>
                    <coordinates>${latlng.lng},${latlng.lat},0</coordinates>
                </Point>
            </Placemark>`;
        }
    });

    kml += `</Document></kml>`;
    return kml;
}

// Função para download do KML
document.getElementById('downloadKML').addEventListener('click', function () {
    if (drawnItems.getLayers().length === 0) {
        alert("Não há formas desenhadas para exportar.");
        return;
    }

    var fileName = prompt("Digite o nome do arquivo para download:", "meu_mapa");
    if (!fileName) return;

    // Gerar o KML a partir das camadas desenhadas
    var kmlData = convertToKML(drawnItems);

    // Verifique se o KML não está vazio
    if (!kmlData || kmlData.trim() === "") {
        alert("Erro: o arquivo KML está vazio.");
        return;
    }

    var blob = new Blob([kmlData], { type: 'application/vnd.google-earth.kml+xml' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName + ".kml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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