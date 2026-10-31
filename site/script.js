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
const largeurSVG = 924.0057;
const hauteurSVG = 1225.0644;

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

// Identifiants des 31 stations NCART
// Indépendants de l'ordre des éléments dans le SVG
const idsStationsNCART = new Set([
    "_1_-_Muren_Street",
    "_2_-_Ackerman_Avenue",
    "_3_-_Eisenhower_Street",
    "_4_-_H10_Station",
    "_5_-_Francis_Drake_Avenue",
    "_6_-_Ferris_Boulevard",
    "_7_-_Stadium_Station",
    "_8_-_Pigeon_Boulevard",
    "_9_-_Kue_Street",
    "_10_-_Heywood_Docks_Station",
    "_11_-_Industrial_Zone_Station",
    "_12_-_Kenson_Street",
    "_13_-_Raymon_Street",
    "_14_-_Charter_Hill_Station",
    "_15_-_Woodland_Ave",
    "_16_-_Pheasant_Street",
    "_17_-_2nd_Street",
    "_18_-_Smith_Street",
    "_19_-_Fisk_Street",
    "_20_-_Gold_Beach_Street",
    "_21_-_NCU_Station",
    "_22_-_Lake_Park_Station",
    "_23_-_King_Street",
    "_24_-_Harlem_Street",
    "_25_-_City_Hall_Station",
    "_26_-_Spivey_Street",
    "_27_-_Port_Station",
    "_28_-_Pacific_Boulevard_Station",
    "_29_-_McBride_Street",
    "_30_-_Kovaleski_Street",
    "_31_-_Playland_by_the_Sea_Station"
]);

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

    // Récupérer les symboles des stations
const symbolesStations = Array.from(groupeStationsSVG.children);

// Identifier les stations NCART par leur identifiant SVG
stationsNCARTSVG = symbolesStations.filter(station =>
    idsStationsNCART.has(station.id)
);

// Les autres stations appartiennent aux autres transports
stationsTransportSVG = symbolesStations.filter(station =>
    !idsStationsNCART.has(station.id)
);

// Vérifier le nombre de stations identifiées
console.log(
    "Stations NCART :", stationsNCARTSVG.length,
    "| Autres transports :", stationsTransportSVG.length
);

// Identifiants attendus des 19 autres stations
const idsStationsTransport = [
    "_32_-_Port_of_Night_City_Yard",
    "_33_-_Heywood_Docks_Rail_Yard",
    "_34_-_Union_Railroad_Station",
    "_35_-_Pol-Bud_Cement_Factory",
    "_36_-_Militech_Ballistics_Range",
    "_37_-_Petrochem_SovOil_Oil_Refineries",
    "_38_-_Executive_Zone_Station",
    "_39_-_Charter_Hill_Station",
    "_40_-_Ziggurat_Station",
    "_41_-_N54_Station",
    "_42_-_Petrochem_SovOil_Station",
    "_43_-_Trauma_Team_Station",
    "_44_-_Danger_Gal_Station",
    "_45_-_Continental_Brands_Station",
    "_46_-_Biotechnica_Station",
    "_47_-_MAnF_Station",
    "_48_-_Sanroo_Station",
    "_49_-_Dynalar_Station",
    "_50_-_Rocklin_Augmentics_Station"
];

// Comparer les identifiants attendus avec le SVG chargé
const idsAttendus = new Set([
    ...idsStationsNCART,
    ...idsStationsTransport
]);

const idsTrouves = new Set(
    symbolesStations.map(station => station.id)
);

const idsManquants = [...idsAttendus].filter(
    id => !idsTrouves.has(id)
);

const idsInconnus = [...idsTrouves].filter(
    id => !idsAttendus.has(id)
);

if (idsManquants.length || idsInconnus.length ||
    idsTrouves.size !== symbolesStations.length) {
    console.warn("Identifiants des stations à vérifier :", {
        idsManquants,
        idsInconnus,
        nombreSymboles: symbolesStations.length,
        nombreIdsUniques: idsTrouves.size
    });
} else {
    console.log("Identifiants SVG : 50 stations reconnues");
}

    // Charger les éléments interactifs
    chargerDistricts(documentSVG);
    chargerStations(svgCarte);
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

function chargerStations(svgCarte) {
    // Les stations sont lues dans le SVG réellement affiché par Leaflet.
    const conteneurStations = svgCarte.querySelector(
        '[id="_2_-_STATIONS"]'
    );
    const stations = conteneurStations.querySelectorAll(
        ":scope > circle, :scope > g"
    );
    const listeStations = document.getElementById("rechercheStation");
    const rectangleCarte = map.getContainer().getBoundingClientRect();

    let compteur = 0;

    for (const station of stations) {
        const nom = station.getAttribute("data-name") || station.id;
        let xSVG;
        let ySVG;

        if (station.tagName.toLowerCase() === "circle") {
            // Centre du symbole simple, dans le repère local de la station.
            xSVG = Number(station.getAttribute("cx"));
            ySVG = Number(station.getAttribute("cy"));
        } else {
            // Centre du symbole composé, dans son repère local.
            const boite = station.getBBox();
            xSVG = boite.x + boite.width / 2;
            ySVG = boite.y + boite.height / 2;
        }

        // Prendre en compte le viewBox et les éventuelles transformations SVG.
        // getScreenCTM() transforme le centre du symbole en pixels du navigateur.
        const pointSVG = svgCarte.createSVGPoint();
        pointSVG.x = xSVG;
        pointSVG.y = ySVG;

        const matrice = station.getScreenCTM();
        if (!matrice) {
            console.warn("Position SVG indisponible pour la station :", nom);
            continue;
        }

        const pointEcran = pointSVG.matrixTransform(matrice);
        const position = map.containerPointToLatLng([
            pointEcran.x - rectangleCarte.left,
            pointEcran.y - rectangleCarte.top
        ]);

        // Conserver le format utilisé par le menu de recherche.
        const option = document.createElement("option");
        option.textContent = nom;
        option.value = position.lat + "," + position.lng;
        listeStations.appendChild(option);

        // Identifier le réseau grâce à l'identifiant SVG
const estNCART = idsStationsNCART.has(station.id);

// Choisir la couche interactive correspondante
const coucheCible = estNCART
    ? coucheStations
    : coucheStationsTransport;

// Définir le type affiché dans la popup
const typeStation = estNCART
    ? "Station NCART"
    : "Station de transport";

        // Placer le marqueur sur le cercle graphique réellement visible.
        L.circleMarker(position, {
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

    console.log("Stations de transport chargées :", compteur);
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
