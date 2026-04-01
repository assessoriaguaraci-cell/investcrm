import geoData from "./brasil-states.json";

export interface StateData {
  uf: string;
  name: string;
  path: string;
  cx: number;
  cy: number;
}

// Projection constants: map lon/lat → SVG x/y
// Brazil extends roughly from lng -74 to -34 and lat +5 to -34
const MIN_LNG = -74.5;
const MAX_LNG = -34;
const MIN_LAT = -34; // southernmost
const MAX_LAT = 6;   // northernmost

const SVG_W = 600;
const SVG_H = 600;

function project(lng: number, lat: number): [number, number] {
  const x = ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * SVG_W;
  const y = ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * SVG_H;
  return [Math.round(x * 100) / 100, Math.round(y * 100) / 100];
}

function coordsToPath(coords: number[][]): string {
  if (!coords || coords.length === 0) return "";
  const parts: string[] = [];
  coords.forEach((pt, i) => {
    const [x, y] = project(pt[0], pt[1]);
    parts.push(`${i === 0 ? "M" : "L"}${x},${y}`);
  });
  parts.push("Z");
  return parts.join(" ");
}

function centroid(coords: number[][]): [number, number] {
  let sx = 0, sy = 0;
  const n = coords.length;
  for (const pt of coords) {
    const [x, y] = project(pt[0], pt[1]);
    sx += x;
    sy += y;
  }
  return [Math.round((sx / n) * 100) / 100, Math.round((sy / n) * 100) / 100];
}

type GeoFeature = {
  properties: { UF: string; ESTADO: string };
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
};

export const BRAZIL_STATES: StateData[] = (geoData.features as GeoFeature[]).map((f) => {
  const { UF, ESTADO } = f.properties;
  const geom = f.geometry;

  let pathStr = "";
  let allCoords: number[][] = [];

  if (geom.type === "Polygon") {
    const rings = geom.coordinates as number[][][];
    pathStr = rings.map((ring) => coordsToPath(ring)).join(" ");
    allCoords = rings[0]; // use outer ring for centroid
  } else if (geom.type === "MultiPolygon") {
    const polys = geom.coordinates as number[][][][];
    const pathParts: string[] = [];
    polys.forEach((poly) => {
      poly.forEach((ring) => {
        pathParts.push(coordsToPath(ring));
      });
    });
    pathStr = pathParts.join(" ");
    // Use largest polygon for centroid
    let maxLen = 0;
    polys.forEach((poly) => {
      if (poly[0].length > maxLen) {
        maxLen = poly[0].length;
        allCoords = poly[0];
      }
    });
  }

  const [cx, cy] = centroid(allCoords);

  return { uf: UF, name: ESTADO, path: pathStr, cx, cy };
});

export const SVG_VIEWBOX = `0 0 ${SVG_W} ${SVG_H}`;
