/**
 * Map tile configuration.
 * Prefer MapTiler / Stadia when VITE_MAP_TILES_URL is set; otherwise OSM (dev only).
 */

const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

export function getMapTileLayer() {
  const customUrl = import.meta.env.VITE_MAP_TILES_URL
  const attribution =
    import.meta.env.VITE_MAP_TILES_ATTR ||
    (customUrl
      ? '&copy; MapTiler &copy; OpenStreetMap contributors'
      : OSM_ATTR)

  if (customUrl) {
    return {
      url: customUrl,
      attribution,
      maxZoom: 20,
      provider: 'commercial',
    }
  }

  if (import.meta.env.PROD) {
    console.warn(
      '[mapTiles] Using public OSM tiles in production. Set VITE_MAP_TILES_URL for commercial use.',
    )
  }

  return {
    url: OSM_URL,
    attribution: OSM_ATTR,
    maxZoom: 19,
    provider: 'osm',
  }
}
