import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

export const plannerMarkerIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
})

export const createViaMarkerIcon = (label) =>
  L.divIcon({
    className: 'cyw-via-marker',
    html: `<div style="
      width:26px;height:26px;border-radius:999px;
      background:#FC6C26;color:#fff;font:700 12px/26px system-ui,sans-serif;
      text-align:center;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);
    ">${label}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })
