const BASE_URL = "https://api.mapbox.com/";
const TOKEN = `access_token=pk.eyJ1IjoiYXJ5YW5zMTIzIiwiYSI6ImNrbW1iM2h0eDFqZGkycW11M2EwMTRlbjEifQ.uFN4S1V7OTo42b9dhCLZ2Q`
const form = document.querySelector("form");
const input = document.querySelector("input");
const poi = document.querySelector(".points-of-interest");
let lon = "";
let lat = "";
let markers = [];

var map;

function placeCurrMarkers(lon,lat,rem){
  if (markers.length > 0 & rem){
    for(let mark of markers){
      mark.remove();
    }
    markers = [];
  }
 
  let marker1 = new mapboxgl.Marker()
  .setLngLat([lon, lat])
  .addTo(map);
  markers.push(marker1);

  map.flyTo({
    center: [lon,lat],
    essential: true // this animation is considered essential with respect to prefers-reduced-motion
    });
}

navigator.geolocation.getCurrentPosition(function(location){
  lon = location.coords.longitude
  lat = location.coords.latitude;
  mapboxgl.accessToken = 'pk.eyJ1IjoiYXJ5YW5zMTIzIiwiYSI6ImNrbW1iM2h0eDFqZGkycW11M2EwMTRlbjEifQ.uFN4S1V7OTo42b9dhCLZ2Q';
  map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/mapbox/streets-v11', // style URL
    center: [location.coords.longitude, location.coords.latitude], // starting position [lng, lat]
    zoom: 15 // starting zoom
  });

  placeCurrMarkers(location.coords.longitude, location.coords.latitude,true);
}, (warn) => console.warn(warn), {enableHighAccuracy:true});

function distance(lat1, lon1, lat2, lon2, unit) {
  if ((lat1 == lat2) && (lon1 == lon2)) {
    return 0;
  }
  else {
    var radlat1 = Math.PI * lat1 / 180;
    var radlat2 = Math.PI * lat2 / 180;
    var theta = lon1 - lon2;
    var radtheta = Math.PI * theta / 180;
    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    if (dist > 1) {
      dist = 1;
    }
    dist = Math.acos(dist);
    dist = dist * 180 / Math.PI;
    dist = dist * 60 * 1.1515;
    if (unit == "K") { dist = dist * 1.609344 }
    if (unit == "N") { dist = dist * 0.8684 }
    return dist.toFixed(1);
  }
}

async function search(search_text) {
  let req = await fetch(`${BASE_URL}geocoding/v5/mapbox.places/${search_text}.json?country=CA&proximity=${lon},${lat}&limit=10&${TOKEN}`)
  req = await req.json();
  poi.innerHTML = "";
  req.features.sort((a,b)=> distance(lon, lat, a.center[0], a.center[1]) - distance(lon, lat, b.center[0], b.center[1]));
  for (let obj of req.features) {
    poi.insertAdjacentHTML( "beforeend",
      `
    <li class="poi" data-long="${obj.center[0]}" data-lat="${obj.center[1]}">
    <ul>
      <li class="name">${obj.text}</li>
      <li class="street-address">${obj.properties.address}</li>
      <li class="distance">${distance(lon, lat, obj.center[0], obj.center[1], "K")} km</li>
      <i class="fas fa-route"></i>
      </ul>
  </li>
    `
    )
  }
}

async function findRoute(long, lati){
  let rep = await fetch(`${BASE_URL}directions/v5/mapbox/driving/${lon},${lat};${long},${lati}.json?${TOKEN}&geometries=geojson`);
  rep = await rep.json();

  map.addSource('route', {
  'type': 'geojson',
  'data': {
  'type': 'Feature',
  'properties': {},
  'geometry': {
  'type': 'LineString',
  'coordinates': [
    ...rep.routes[0].geometry.coordinates
  ]
  }
  }
  });
  map.addLayer({
  'id': 'route',
  'type': 'line',
  'source': 'route',
  'layout': {
  'line-join': 'round',
  'line-cap': 'round'
  },
  'paint': {
  'line-color': '#6e6efc',
  'line-width': 8
  }
  });

  
  placeCurrMarkers(...rep.waypoints[0].location, true);
  placeCurrMarkers(...rep.waypoints[1].location, false);
}


form.onsubmit = (e) => {
  e.preventDefault();
  if (input.value.length > 0) {
    search(input.value);
    input.value = "";
  }
}

poi.onclick = (e)=>{
  e.preventDefault();
  const tar = e.target.closest("li.poi");
  if (map.getLayer("route") != undefined){
    map.removeLayer('route');
    map.removeSource('route');
  }
  console.log(e.target);
  if (e.target.closest(".fas") != undefined){
    findRoute(tar.dataset.long, tar.dataset.lat);
  } else {
    lon = tar.dataset.long;
    lat = tar.dataset.lat;
    placeCurrMarkers(tar.dataset.long, tar.dataset.lat, true);
  }
}

