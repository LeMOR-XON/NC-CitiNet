        // Créer la carte
        const map = L.map("map", {
            crs: L.CRS.Simple,
            minZoom: -3,
            maxZoom: 7,
            zoomSnap: 0.1,
            wheelPxPerZoomLevel: 120
        });

const coucheStations = L.layerGroup().addTo(map);

const coucheDistricts = L.layerGroup().addTo(map);

const indexDistricts = new Map();

let districtSelectionne = null;

        // Définir les dimensions du SVG
        const bounds = [
            [0, 0],
            [1225, 842.1756]
        ];

        // Afficher notre SVG
        L.imageOverlay(
            "../maps/nc_citinet_map.svg",
            bounds
        ).addTo(map);

        // Centrer la vue sur Night City
        map.fitBounds(bounds);
        map.setMaxBounds(
    L.latLngBounds(bounds).pad(0.2)
);
        document.getElementById("resetView").addEventListener("click", function() {
    map.fitBounds(bounds);
});
map.on("click", function(event) {
    const y = event.latlng.lat;
    const x = event.latlng.lng;

    L.popup()
        .setLatLng(event.latlng)
        .setContent(
            "X : " + x.toFixed(2) +
            " | Y : " + y.toFixed(2)
        )
        .openOn(map);
});


async function chargerDonneesCarte() {

    // Lire le SVG une seule fois
    const reponse = await fetch("../maps/nc_citinet_map.svg");

    if (!reponse.ok) {
        throw new Error("Impossible de charger le SVG");
    }

    const texteSVG = await reponse.text();

    const documentSVG = new DOMParser()
        .parseFromString(texteSVG, "image/svg+xml");

    // Transmettre le SVG aux deux fonctions
    chargerDistricts(documentSVG);
    chargerStations(documentSVG);
}


// ------------------------------------
// DISTRICTS
// ------------------------------------

function chargerDistricts(documentSVG) {

    const conteneurDistricts = documentSVG.querySelector(
        '[id="_06_-_DISTRICTS"]'
    );

    const districts = conteneurDistricts.querySelectorAll(
        ":scope > polygon, :scope > path"
    );

    // Créer la couche interactive
    const svgDistricts = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
    );

    svgDistricts.setAttribute(
        "viewBox",
        documentSVG.documentElement.getAttribute("viewBox")
    );

    svgDistricts.style.pointerEvents = "none";

    for (const district of districts) {

        const forme = district.cloneNode(true);

        forme.style.fill = "#69cbd0";
        forme.style.fillOpacity = "0";
        forme.style.stroke = "none";
        forme.style.pointerEvents = "all";

        svgDistricts.appendChild(forme);

        const nom = district.getAttribute("data-name")
            || district.id;

        // Survol
        forme.addEventListener("mouseenter", function() {
            forme.style.fillOpacity = "0.25";
        });

forme.addEventListener("mouseleave", function() {
    forme.style.fillOpacity =
        districtSelectionne === forme ? "0.25" : "0";
});

        // Clic
        forme.addEventListener("click", function(event) {
            L.DomEvent.stopPropagation(event);

            L.popup()
                .setLatLng(map.mouseEventToLatLng(event))
                .setContent("<b>" + nom + "</b>")
                .openOn(map);
        });
    }

L.svgOverlay(svgDistricts, bounds, {
    interactive: true
}).addTo(coucheDistricts);


// Remplir la recherche des districts
const listeDistricts = document.getElementById(
    "rechercheDistrict"
);

for (const forme of svgDistricts.children) {

    // Récupérer le nom du quartier
    const nom = forme.getAttribute("data-name")
        || forme.id;

    // Mesurer le rectangle entourant le district
    const boite = forme.getBBox();

    // Convertir ce rectangle en coordonnées Leaflet
    const limites = [
        [1225 - (boite.y + boite.height), boite.x],
        [1225 - boite.y, boite.x + boite.width]
    ];

    // Mémoriser la forme et ses limites
    indexDistricts.set(forme.id, {
        forme: forme,
        limites: limites
    });

    // Ajouter le district à la liste HTML
    const option = document.createElement("option");

    option.value = forme.id;
    option.textContent = nom;

    listeDistricts.appendChild(option);
}

    console.log("Districts chargés :", districts.length);
}


// ------------------------------------
// STATIONS NCART
// ------------------------------------

function chargerStations(documentSVG) {

    const conteneurStations = documentSVG.querySelector(
        '[id="_2_-_STATIONS"]'
    );

    const stations = conteneurStations.querySelectorAll(
        ":scope > circle, :scope > g"
    );

    // Copie invisible pour mesurer les stations complexes
    const svgMesure = document.importNode(
        documentSVG.documentElement,
        true
    );

    svgMesure.style.position = "absolute";
    svgMesure.style.left = "-10000px";
    svgMesure.style.visibility = "hidden";

    document.body.appendChild(svgMesure);

    let compteur = 0;

    for (const station of stations) {

        const nom = station.getAttribute("data-name");

        let x;
        let ySVG;

        if (station.tagName === "circle") {

            // Station simple
            x = Number(station.getAttribute("cx"));
            ySVG = Number(station.getAttribute("cy"));

        } else {

            // Station composée
            const copie = svgMesure.querySelector(
                '[id="' + station.id + '"]'
            );

            const boite = copie.getBBox();

            x = boite.x + boite.width / 2;
            ySVG = boite.y + boite.height / 2;
        }

        // Conversion des coordonnées
        const y = 1225 - ySVG;

        // Ajouter la station à notre liste déroulante
        const option = document.createElement("option");

        option.textContent = nom;
        option.value = y + "," + x;

        document.getElementById("rechercheStation")
            .appendChild(option);

        // Zone de clic invisible
        L.circleMarker([y, x], {
            radius: 10,
            stroke: false,
            fill: true,
            fillOpacity: 0
        })
            .addTo(coucheStations)
            .bindPopup(
                "<b>" + nom + "</b><p>Station NCART</p>"
            );

        compteur++;
    }

    // Retirer la copie de mesure
    svgMesure.remove();

    console.log("Stations NCART chargées :", compteur);
}

document.getElementById("toggleStations")
    .addEventListener("change", function(event) {

        if (event.target.checked) {
            map.addLayer(coucheStations);
        } else {
            map.removeLayer(coucheStations);
        }

    });

document.getElementById("toggleDistricts")
    .addEventListener("change", function(event) {

        if (event.target.checked) {
            map.addLayer(coucheDistricts);
        } else {
            map.removeLayer(coucheDistricts);
        }

    });
    
document.getElementById("rechercheStation")
    .addEventListener("change", function(event) {

        if (event.target.value === "") {
            return;
        }

        const coordonnees = event.target.value.split(",");

        const y = Number(coordonnees[0]);
        const x = Number(coordonnees[1]);

        map.flyTo([y, x], 2);
    });


document.getElementById("rechercheDistrict")
    .addEventListener("change", function(event) {

        // Retirer l'ancienne sélection
        if (districtSelectionne) {
            districtSelectionne.style.fillOpacity = "0";
        }

        const id = event.target.value;

        if (id === "") {
            districtSelectionne = null;
            return;
        }

        // Retrouver le district choisi
        const district = indexDistricts.get(id);

        districtSelectionne = district.forme;

        // Mettre sa surface en surbrillance
        districtSelectionne.style.fillOpacity = "0.25";

        // Déplacer la caméra vers le quartier
        map.flyToBounds(district.limites, {
            padding: [40, 40],
            maxZoom: 3
        });
    });

// ------------------------------------
// DÉMARRAGE
// ------------------------------------

chargerDonneesCarte();
