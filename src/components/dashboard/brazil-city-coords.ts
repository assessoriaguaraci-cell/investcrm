// Approximate coordinates for Brazilian cities used in the project
// Format: "city_normalized|STATE" => [lat, lng]

const CITY_COORDS: Record<string, [number, number]> = {
  // AL
  "dois riachos|AL": [-9.39, -37.10],
  "maceio|AL": [-9.67, -35.74],
  "sao sebastiao|AL": [-9.93, -36.56],
  // BA
  "cachoeira|BA": [-12.62, -38.96],
  "heliopolis|BA": [-10.68, -38.29],
  // CE
  "fortaleza|CE": [-3.72, -38.54],
  "horizonte|CE": [-4.10, -38.49],
  "penaforte|CE": [-7.83, -39.07],
  // DF
  "taguatinga|DF": [-15.84, -48.06],
  // ES
  "serra|ES": [-20.13, -40.31],
  // GO
  "cidade ocidental|GO": [-16.08, -47.93],
  "monte alegre|GO": [-13.26, -46.89],
  "planaltina|GO": [-15.45, -47.61],
  "sto antonio do descoberto|GO": [-15.94, -48.26],
  "santo antonio do descoberto|GO": [-15.94, -48.26],
  "valparaiso|GO": [-16.07, -47.98],
  "valparaiso de goias|GO": [-16.07, -47.98],
  // MA
  "sao jose do ribamar|MA": [-2.55, -44.06],
  "timon|MA": [-5.09, -42.84],
  // MG
  "manhuacu|MG": [-20.26, -42.03],
  "pouso alegre|MG": [-22.23, -45.94],
  "prata|MG": [-19.31, -48.93],
  "varzea da palma|MG": [-17.60, -44.73],
  // PA
  "altamira|PA": [-3.21, -52.21],
  "ananindeua|PA": [-1.37, -48.39],
  "aurora do para|PA": [-2.15, -47.58],
  "bonito|PA": [-1.37, -47.31],
  "castanhal|PA": [-1.30, -47.93],
  "garrafao do norte|PA": [-1.93, -47.08],
  "jacunda|PA": [-4.45, -49.11],
  "mae do rio|PA": [-2.06, -47.56],
  "salinopolis|PA": [-0.62, -47.36],
  // PB
  "campina grande|PB": [-7.23, -35.88],
  "sta rita|PB": [-7.11, -34.98],
  "santa rita|PB": [-7.11, -34.98],
  // PE
  "alagoinha|PE": [-8.47, -36.78],
  "arcoverde|PE": [-8.42, -37.06],
  "feira nova|PE": [-7.95, -35.39],
  "igarassu|PE": [-7.83, -34.91],
  "lajedo|PE": [-8.66, -36.32],
  "sertania|PE": [-8.07, -37.26],
  "sta cruz capibaribe|PE": [-7.96, -36.20],
  "santa cruz do capibaribe|PE": [-7.96, -36.20],
  // PI
  "altos|PI": [-5.04, -42.46],
  "guadalupe|PI": [-6.79, -43.56],
  "jose de freitas|PI": [-4.76, -42.58],
  "lagoa alegre|PI": [-4.52, -42.63],
  "lagoa do piaui|PI": [-5.42, -42.66],
  "teresina|PI": [-5.09, -42.80],
  "uniao|PI": [-4.59, -42.86],
  // RJ
  "belford roxo|RJ": [-22.76, -43.40],
  "cachoeiras de macacu|RJ": [-22.47, -42.65],
  "duque de caxias|RJ": [-22.79, -43.31],
  "itaborai|RJ": [-22.74, -42.86],
  "itaguai|RJ": [-22.87, -43.78],
  "mage|RJ": [-22.65, -43.17],
  "nova iguacu|RJ": [-22.76, -43.45],
  "petropolis|RJ": [-22.51, -43.18],
  "rio de janeiro|RJ": [-22.91, -43.17],
  "sao goncalo|RJ": [-22.83, -43.06],
  "sao joao do meriti|RJ": [-22.80, -43.37],
  "sao pedro da aldeia|RJ": [-22.84, -42.10],
  "tangua|RJ": [-22.73, -42.72],
  // RN
  "ceara-mirim|RN": [-5.63, -35.43],
  "ceara mirim|RN": [-5.63, -35.43],
  "extremoz|RN": [-5.70, -35.24],
  "mossoro|RN": [-5.19, -37.34],
  // RR
  "sao luiz|RR": [2.82, -60.69],
  // RS
  "caxias do sul|RS": [-29.17, -51.18],
  "guaiba|RS": [-30.11, -51.33],
  "santa vitoria do palmar|RS": [-33.52, -53.37],
  // SC
  "biguacu|SC": [-27.50, -48.66],
  // SP
  "cacapava|SP": [-23.10, -45.71],
  "getulina|SP": [-21.80, -49.93],
  "sao paulo|SP": [-23.55, -46.63],
  "sjc|SP": [-23.18, -45.88],
  "sao jose dos campos|SP": [-23.18, -45.88],
  // TO
  "gurupi|TO": [-11.73, -49.07],
};

// State capital fallbacks
const STATE_COORDS: Record<string, [number, number]> = {
  AC: [-9.97, -67.81], AL: [-9.67, -35.74], AP: [0.03, -51.07], AM: [-3.12, -60.02],
  BA: [-12.97, -38.51], CE: [-3.72, -38.54], DF: [-15.79, -47.88], ES: [-20.32, -40.34],
  GO: [-16.68, -49.25], MA: [-2.53, -44.28], MT: [-15.60, -56.10], MS: [-20.47, -54.62],
  MG: [-19.92, -43.94], PA: [-1.46, -48.50], PB: [-7.12, -34.86], PR: [-25.43, -49.27],
  PE: [-8.05, -34.87], PI: [-5.09, -42.80], RJ: [-22.91, -43.17], RN: [-5.79, -35.21],
  RS: [-30.03, -51.23], RO: [-8.76, -63.90], RR: [2.82, -60.69], SC: [-27.60, -48.55],
  SP: [-23.55, -46.63], SE: [-10.91, -37.07], TO: [-10.18, -48.33],
};

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function getCityCoords(city: string | null, state: string | null): [number, number] | null {
  if (!state) return null;
  const st = state.toUpperCase().trim();

  if (city) {
    const key = `${normalize(city)}|${st}`;
    if (CITY_COORDS[key]) return CITY_COORDS[key];

    // Try partial match
    const norm = normalize(city);
    for (const [k, v] of Object.entries(CITY_COORDS)) {
      if (k.endsWith(`|${st}`) && k.startsWith(norm)) return v;
    }
  }

  // Fallback to state capital
  return STATE_COORDS[st] || null;
}

export function getStateCoords(state: string): [number, number] | null {
  return STATE_COORDS[state.toUpperCase().trim()] || null;
}
