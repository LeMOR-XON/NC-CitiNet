/* ========================================
   NIGHT CITY ATLAS — 2045
   INITIALISATION DE LA CARTE
======================================== */

// Créer la carte Leaflet
const map = L.map("map", {
    crs: L.CRS.Simple,
    minZoom: -3,
    maxZoom: 7,
    zoomSnap: 0.1,
    wheelPxPerZoomLevel: 120
});

// Dimensions du SVG maître
const largeurSVG = 1316.3565;
const hauteurSVG = 1639.1677;

// Limites de la carte Leaflet
const bounds = [
    [0, 0],
    [hauteurSVG, largeurSVG]
];

// Couches interactives Leaflet
const coucheStations = L.layerGroup().addTo(map);
const coucheStationsTransport = L.layerGroup().addTo(map);
const coucheDistricts = L.layerGroup().addTo(map);
const coucheEtiquettesDistricts = L.layerGroup().addTo(map);

// Références aux éléments graphiques du SVG affiché
let groupeStationsSVG = null;
let groupeDistrictsSVG = null;
let groupeRoutesSecondairesSVG = null;

let lignesNCARTSVG = [];
let lignesTransportSVG = [];
let stationsNCARTSVG = [];
let stationsTransportSVG = [];

// Mémoriser les districts pour la recherche
const indexDistricts = new Map();
let districtSelectionne = null;

// Définir la vue initiale et les limites de navigation
map.fitBounds(bounds);
map.setMaxBounds(L.latLngBounds(bounds).pad(0.2));


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
    const reponse = await fetch("../maps/nc_citinet_master.svg");

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

    // Les quatre lignes du réseau NCART
    lignesNCARTSVG = [
        "NCART_Blue_Line",
        "NCART_Green_Line",
        "NCART_Orange_Line",
        "NCART_Red_Line"
    ].map(id => svgCarte.querySelector('[id="' + id + '"]'));

    // Les autres transports ferroviaires
    lignesTransportSVG = [
        "Executive_Monorail",
        "Cargo_Rail_Line"
    ].map(id => svgCarte.querySelector('[id="' + id + '"]'));

    // Récupérer les groupes graphiques du SVG affiché
    groupeStationsSVG = svgCarte.querySelector('[id="_2_-_STATIONS"]');
    groupeDistrictsSVG = svgCarte.querySelector('[id="_06_-_DISTRICTS"]');
    groupeRoutesSecondairesSVG = svgCarte.querySelector(
        '[id="_04_-_ROUTES_SECONDAIRES"]'
    );

    // Répartir les symboles selon leur ordre actuel dans le master
    // Attention : cette répartition devra être remplacée par des identifiants stables.
    const symbolesStations = Array.from(groupeStationsSVG.children);
    stationsNCARTSVG = symbolesStations.slice(0, 31);
    stationsTransportSVG = symbolesStations.slice(31, 50);

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
        const nom = district.getAttribute("data-name") || district.id;

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

        // Afficher le nom et les coordonnées au clic
        forme.addEventListener("click", function(event) {
            L.DomEvent.stopPropagation(event);

            // Récupérer les coordonnées du clic
            const position = map.mouseEventToLatLng(event);
            const x = position.lng;
            const y = position.lat;

            // Préparer une ligne de coordonnées pour le fichier de données
            console.log(
                `${JSON.stringify(forme.id)}: { x: ${x.toFixed(2)}, y: ${y.toFixed(2)} },`
            );

            // Afficher les informations
            L.popup()
                .setLatLng(position)
                .setContent(
                    "<b>" + nom + "</b><br>" +
                    "X : " + x.toFixed(2) +
                    " | Y : " + y.toFixed(2)
                )
                .openOn(map);
        });
    }

    // Ajouter les districts à leur couche Leaflet
    L.svgOverlay(svgDistricts, bounds, {
        interactive: true
    }).addTo(coucheDistricts);

    // Préparer la recherche des districts
    const listeDistricts = document.getElementById("rechercheDistrict");

    for (const forme of svgDistricts.children) {
        const nom = forme.getAttribute("data-name") || forme.id;

        // Mesurer le rectangle englobant du district
        const boite = forme.getBBox();

        // Chercher une position personnalisée
        const positionManuelle = positionsEtiquettes[forme.id];

        // Utiliser la position manuelle si elle existe,
        // sinon conserver le centre automatique
        const centreX = positionManuelle
            ? positionManuelle.x
            : boite.x + boite.width / 2;

        const centreY = positionManuelle
            ? positionManuelle.y
            : hauteurSVG - (boite.y + boite.height / 2);

        // Créer une étiquette permanente
        L.tooltip({
            permanent: true,
            direction: "center",
            className: "etiquette-district",
            interactive: false
        })
            .setLatLng([centreY, centreX])
            .setContent(nom)
            .addTo(coucheEtiquettesDistricts);

        // Convertir les limites SVG en coordonnées Leaflet
        const limites = [
            [hauteurSVG - (boite.y + boite.height), boite.x],
            [hauteurSVG - boite.y, boite.x + boite.width]
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
   STATIONS DE TRANSPORT
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
    const listeStations = document.getElementById("rechercheStation");

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
        const y = hauteurSVG - ySVG;

        // Ajouter la station à la liste déroulante
        const option = document.createElement("option");
        option.textContent = nom;
        option.value = y + "," + x;
        listeStations.appendChild(option);

        // Choisir la couche interactive selon le réseau
        const coucheCible = compteur < 31
            ? coucheStations
            : coucheStationsTransport;

        // Définir le type de station pour le popup
        const typeStation = compteur < 31
            ? "Station NCART"
            : "Station de transport";

        // Créer une zone de clic invisible
        L.circleMarker([y, x], {
            radius: 10,
            stroke: false,
            fill: true,
            fillOpacity: 0
        })
            .addTo(coucheCible)
            .bindPopup(
                "<b>" + nom + "</b><p>" + typeStation + "</p>"
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

// Afficher ou masquer les stations et lignes NCART
document.getElementById("toggleStations")
    .addEventListener("change", function(event) {
        const visible = event.target.checked;

        // Contrôler les symboles des stations NCART
        for (const station of stationsNCARTSVG) {
            station.style.display = visible ? "" : "none";
        }

        // Contrôler les quatre lignes NCART
        for (const ligne of lignesNCARTSVG) {
            if (ligne) {
                ligne.style.display = visible ? "" : "none";
            }
        }

        // Contrôler les zones cliquables
        if (visible) {
            map.addLayer(coucheStations);
        } else {
            map.removeLayer(coucheStations);
        }
    });

// Afficher ou masquer les lignes et stations des autres transports
document.getElementById("toggleReseau")
    .addEventListener("change", function(event) {
        const visible = event.target.checked;

        // Contrôler les lignes ferroviaires et Executive
        for (const ligne of lignesTransportSVG) {
            if (ligne) {
                ligne.style.display = visible ? "" : "none";
            }
        }

        // Contrôler leurs symboles de stations
        for (const station of stationsTransportSVG) {
            station.style.display = visible ? "" : "none";
        }

        // Contrôler leurs zones cliquables
        if (visible) {
            map.addLayer(coucheStationsTransport);
        } else {
            map.removeLayer(coucheStationsTransport);
        }
    });

// Afficher ou masquer les zones des districts
document.getElementById("toggleDistricts")
    .addEventListener("change", function(event) {
        const visible = event.target.checked;

        // Contrôler les formes graphiques du master
        if (groupeDistrictsSVG) {
            groupeDistrictsSVG.style.display = visible ? "" : "none";
        }

        // Contrôler les zones interactives
        if (visible) {
            map.addLayer(coucheDistricts);
        } else {
            map.removeLayer(coucheDistricts);
        }
    });

// Afficher ou masquer les routes secondaires
document.getElementById("toggleRoutesSecondaires")
    .addEventListener("change", function(event) {
        if (groupeRoutesSecondairesSVG) {
            groupeRoutesSecondairesSVG.style.display =
                event.target.checked ? "" : "none";
        }
    });

// Gérer la visibilité des noms selon le zoom
function actualiserEtiquettesDistricts() {
    const utilisateurAutorise = document.getElementById(
        "toggleEtiquettesDistricts"
    ).checked;
    const zoomSuffisant = map.getZoom() >= 1.1;

    if (utilisateurAutorise && zoomSuffisant) {
        map.addLayer(coucheEtiquettesDistricts);
    } else {
        map.removeLayer(coucheEtiquettesDistricts);
    }
}

// Réagir aux changements de la case à cocher
document.getElementById("toggleEtiquettesDistricts")
    .addEventListener("change", actualiserEtiquettesDistricts);

// Réagir aux changements de zoom
map.on("zoomend", actualiserEtiquettesDistricts);

// Appliquer les règles dès le chargement
actualiserEtiquettesDistricts();


/* ========================================
   RECHERCHE CARTOGRAPHIQUE
======================================== */

// Rechercher une station de transport
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
