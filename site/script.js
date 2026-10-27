
/* ========================================
   NIGHT CITY ATLAS — 2045
   Initialisation de la carte
======================================== */

// Créer la carte Leaflet
const map = L.map("map", {
    crs: L.CRS.Simple,
    minZoom: -3,
    maxZoom: 7,
    zoomSnap: 0.1,
    wheelPxPerZoomLevel: 120
});

// Définir les dimensions de notre SVG
const bounds = [
    [0, 0],
    [1225, 842.1756]
];

// Créer les couches interactives
const coucheStations = L.layerGroup().addTo(map);
const coucheDistricts = L.layerGroup().addTo(map);

let groupeStationsSVG = null;

// Mémoriser les districts pour la recherche
const indexDistricts = new Map();
let districtSelectionne = null;

// Définir la vue initiale et les limites de navigation
map.fitBounds(bounds);
map.setMaxBounds(
    L.latLngBounds(bounds).pad(0.2)
);


/* ========================================
   COMMANDES DE NAVIGATION
======================================== */

// Revenir à la vue d'ensemble
document.getElementById("resetView")
    .addEventListener("click", function() {
        map.fitBounds(bounds);
    });

// Afficher les coordonnées au clic
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


/* ========================================
   CHARGEMENT DES DONNÉES SVG
======================================== */

async function chargerDonneesCarte() {

    // Lire le SVG une seule fois
    const reponse = await fetch("../maps/nc_citinet_map.svg");

    if (!reponse.ok) {
        throw new Error("Impossible de charger le SVG");
    }

    const texteSVG = await reponse.text();

    const documentSVG = new DOMParser()
        .parseFromString(texteSVG, "image/svg+xml");


 // Créer une copie du SVG maître dans le document HTML
 const svgCarte = document.importNode(
     documentSVG.documentElement,
     true
 );

 // Afficher cette copie dans Leaflet
 L.svgOverlay(svgCarte, bounds, {
     interactive: false
 }).addTo(map);

 // Récupérer le groupe des lignes ferroviaires
 const groupeLignes = svgCarte.querySelector(
     '[id="_1_-_NCART"]'
 );

 // Récupérer le groupe graphique des stations
 groupeStationsSVG = svgCarte.querySelector(
     '[id="_2_-_STATIONS"]'
 );

 // Afficher ou masquer les lignes de transport
 document.getElementById("toggleReseau")
     .addEventListener("change", function(event) {

         groupeLignes.style.display =
             event.target.checked ? "" : "none";

     });

    // Charger les éléments interactifs
    chargerDistricts(documentSVG);
    chargerStations(documentSVG);
}


/* ========================================
   DISTRICTS
======================================== */

function chargerDistricts(documentSVG) {

    // Retrouver le calque DISTRICTS
    const conteneurDistricts = documentSVG.querySelector(
        '[id="_06_-_DISTRICTS"]'
    );

    // Récupérer les formes des 24 districts
    const districts = conteneurDistricts.querySelectorAll(
        ":scope > polygon, :scope > path"
    );

    // Créer le SVG des zones interactives
    const svgDistricts = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
    );

    svgDistricts.setAttribute(
        "viewBox",
        documentSVG.documentElement.getAttribute("viewBox")
    );

    svgDistricts.style.pointerEvents = "none";

    // Créer les zones interactives
    for (const district of districts) {

        // Copier la forme depuis le SVG maître
        const forme = district.cloneNode(true);

        // Définir l'apparence de la zone
        forme.style.fill = "#69cbd0";
        forme.style.fillOpacity = "0";
        forme.style.stroke = "none";
        forme.style.pointerEvents = "all";

        svgDistricts.appendChild(forme);

        // Récupérer le nom du district
        const nom = district.getAttribute("data-name")
            || district.id;

        // Mettre en surbrillance au survol
        forme.addEventListener("mouseenter", function() {
            forme.style.fillOpacity = "0.25";
        });

        // Retirer la surbrillance en quittant le district,
        // sauf s'il est sélectionné dans la recherche
        forme.addEventListener("mouseleave", function() {
            forme.style.fillOpacity =
                districtSelectionne === forme ? "0.25" : "0";
        });

        // Afficher le nom au clic
        forme.addEventListener("click", function(event) {
            L.DomEvent.stopPropagation(event);

            L.popup()
                .setLatLng(map.mouseEventToLatLng(event))
                .setContent("<b>" + nom + "</b>")
                .openOn(map);
        });
    }

    // Ajouter les districts à leur couche Leaflet
    L.svgOverlay(svgDistricts, bounds, {
        interactive: true
    }).addTo(coucheDistricts);

    // Préparer la recherche des districts
    const listeDistricts = document.getElementById(
        "rechercheDistrict"
    );

    for (const forme of svgDistricts.children) {

        const nom = forme.getAttribute("data-name")
            || forme.id;

        // Mesurer le rectangle englobant du district
        const boite = forme.getBBox();

        // Convertir les limites SVG en coordonnées Leaflet
        const limites = [
            [1225 - (boite.y + boite.height), boite.x],
            [1225 - boite.y, boite.x + boite.width]
        ];

        // Enregistrer la forme et ses limites
        indexDistricts.set(forme.id, {
            forme: forme,
            limites: limites
        });

        // Ajouter le district à la liste déroulante
        const option = document.createElement("option");

        option.value = forme.id;
        option.textContent = nom;

        listeDistricts.appendChild(option);
    }

    console.log("Districts chargés :", districts.length);
}


/* ========================================
   STATIONS NCART
======================================== */

function chargerStations(documentSVG) {

    // Retrouver le calque STATIONS
    const conteneurStations = documentSVG.querySelector(
        '[id="_2_-_STATIONS"]'
    );

    // Récupérer les cercles et les groupes
    const stations = conteneurStations.querySelectorAll(
        ":scope > circle, :scope > g"
    );

    // Préparer la liste de recherche
    const listeStations = document.getElementById(
        "rechercheStation"
    );

    // Créer une copie invisible du SVG pour mesurer
    // les stations constituées de plusieurs formes
    const svgMesure = document.importNode(
        documentSVG.documentElement,
        true
    );

    svgMesure.style.position = "absolute";
    svgMesure.style.left = "-10000px";
    svgMesure.style.visibility = "hidden";

    document.body.appendChild(svgMesure);

    let compteur = 0;

    // Parcourir toutes les stations
    for (const station of stations) {

        const nom = station.getAttribute("data-name");

        let x;
        let ySVG;

        if (station.tagName === "circle") {

            // Station simple : lire le centre du cercle
            x = Number(station.getAttribute("cx"));
            ySVG = Number(station.getAttribute("cy"));

        } else {

            // Station composée : calculer le centre du groupe
            const copie = svgMesure.querySelector(
                '[id="' + station.id + '"]'
            );

            const boite = copie.getBBox();

            x = boite.x + boite.width / 2;
            ySVG = boite.y + boite.height / 2;
        }

        // Convertir la coordonnée Y pour Leaflet
        const y = 1225 - ySVG;

        // Ajouter la station à la liste déroulante
        const option = document.createElement("option");

        option.textContent = nom;
        option.value = y + "," + x;

        listeStations.appendChild(option);

        // Créer une zone de clic invisible
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

    // Supprimer la copie de mesure
    svgMesure.remove();

    console.log("Stations NCART chargées :", compteur);
}


/* ========================================
   GESTION DES COUCHES
======================================== */

 // Afficher ou masquer les stations NCART
 document.getElementById("toggleStations")
     .addEventListener("change", function(event) {

         const visible = event.target.checked;

         // Contrôler l'affichage graphique
         if (groupeStationsSVG) {
             groupeStationsSVG.style.display =
                 visible ? "" : "none";
         }

         // Contrôler les interactions
         if (visible) {
             map.addLayer(coucheStations);
         } else {
             map.removeLayer(coucheStations);
         }

     });

// Activer ou désactiver les interactions des districts
document.getElementById("toggleDistricts")
    .addEventListener("change", function(event) {

        if (event.target.checked) {
            map.addLayer(coucheDistricts);
        } else {
            map.removeLayer(coucheDistricts);
        }
    });


/* ========================================
   RECHERCHE CARTOGRAPHIQUE
======================================== */

// Rechercher une station NCART
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

// Rechercher un district
document.getElementById("rechercheDistrict")
    .addEventListener("change", function(event) {

        // Retirer la surbrillance précédente
        if (districtSelectionne) {
            districtSelectionne.style.fillOpacity = "0";
        }

        const id = event.target.value;

        if (id === "") {
            districtSelectionne = null;
            return;
        }

        // Retrouver le district sélectionné
        const district = indexDistricts.get(id);

        districtSelectionne = district.forme;

        // Mettre en surbrillance
        districtSelectionne.style.fillOpacity = "0.25";

        // Déplacer la caméra vers le district
        map.flyToBounds(district.limites, {
            padding: [40, 40],
            maxZoom: 3
        });
    });


/* ========================================
   DÉMARRAGE DE NC CITINET
======================================== */

chargerDonneesCarte();
