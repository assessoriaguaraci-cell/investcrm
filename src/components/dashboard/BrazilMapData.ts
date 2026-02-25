// Simplified SVG path data for Brazilian states
// Each state has: abbreviation, name, path (SVG), and center coordinates for labels
export interface StateData {
  uf: string;
  name: string;
  path: string;
  cx: number;
  cy: number;
}

export const BRAZIL_STATES: StateData[] = [
  { uf: "AC", name: "Acre", path: "M48,195 L48,225 L78,225 L78,195 Z", cx: 63, cy: 210 },
  { uf: "AM", name: "Amazonas", path: "M78,130 L78,210 L175,210 L175,155 L145,130 Z", cx: 125, cy: 170 },
  { uf: "RR", name: "Roraima", path: "M130,80 L130,130 L170,130 L170,80 Z", cx: 150, cy: 105 },
  { uf: "PA", name: "Pará", path: "M175,120 L175,210 L290,210 L290,155 L250,120 Z", cx: 230, cy: 170 },
  { uf: "AP", name: "Amapá", path: "M250,80 L250,120 L290,120 L290,80 Z", cx: 270, cy: 100 },
  { uf: "MA", name: "Maranhão", path: "M290,155 L290,210 L340,210 L340,170 L320,155 Z", cx: 315, cy: 185 },
  { uf: "TO", name: "Tocantins", path: "M260,210 L260,290 L300,290 L300,210 Z", cx: 280, cy: 250 },
  { uf: "PI", name: "Piauí", path: "M320,170 L320,240 L355,240 L355,170 Z", cx: 337, cy: 205 },
  { uf: "CE", name: "Ceará", path: "M340,155 L340,195 L385,195 L385,155 Z", cx: 362, cy: 175 },
  { uf: "RN", name: "Rio Grande do Norte", path: "M370,155 L370,175 L405,175 L405,155 Z", cx: 387, cy: 165 },
  { uf: "PB", name: "Paraíba", path: "M365,175 L365,195 L405,195 L405,175 Z", cx: 385, cy: 185 },
  { uf: "PE", name: "Pernambuco", path: "M345,195 L345,215 L405,215 L405,195 Z", cx: 375, cy: 205 },
  { uf: "AL", name: "Alagoas", path: "M370,215 L370,230 L400,230 L400,215 Z", cx: 385, cy: 222 },
  { uf: "SE", name: "Sergipe", path: "M365,230 L365,245 L390,245 L390,230 Z", cx: 377, cy: 237 },
  { uf: "BA", name: "Bahia", path: "M300,230 L300,330 L380,330 L380,245 L345,230 Z", cx: 340, cy: 280 },
  { uf: "MT", name: "Mato Grosso", path: "M165,210 L165,310 L260,310 L260,210 Z", cx: 212, cy: 260 },
  { uf: "GO", name: "Goiás", path: "M250,280 L250,345 L310,345 L310,290 L280,280 Z", cx: 280, cy: 315 },
  { uf: "DF", name: "Distrito Federal", path: "M288,310 L288,322 L302,322 L302,310 Z", cx: 295, cy: 316 },
  { uf: "MS", name: "Mato Grosso do Sul", path: "M180,310 L180,385 L255,385 L255,310 Z", cx: 217, cy: 347 },
  { uf: "MG", name: "Minas Gerais", path: "M280,310 L280,385 L370,385 L370,330 L310,310 Z", cx: 325, cy: 350 },
  { uf: "ES", name: "Espírito Santo", path: "M370,330 L370,370 L395,370 L395,330 Z", cx: 382, cy: 350 },
  { uf: "RJ", name: "Rio de Janeiro", path: "M340,375 L340,400 L385,400 L385,375 Z", cx: 362, cy: 387 },
  { uf: "SP", name: "São Paulo", path: "M245,360 L245,410 L340,410 L340,375 L300,360 Z", cx: 292, cy: 388 },
  { uf: "PR", name: "Paraná", path: "M215,385 L215,430 L300,430 L300,400 L255,385 Z", cx: 257, cy: 410 },
  { uf: "SC", name: "Santa Catarina", path: "M235,430 L235,460 L305,460 L305,430 Z", cx: 270, cy: 445 },
  { uf: "RS", name: "Rio Grande do Sul", path: "M210,460 L210,520 L295,520 L295,460 Z", cx: 252, cy: 490 },
  { uf: "RO", name: "Rondônia", path: "M100,210 L100,270 L165,270 L165,210 Z", cx: 132, cy: 240 },
];
