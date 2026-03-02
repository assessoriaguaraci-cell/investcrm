import { useMemo, useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { PROPERTY_STAGES, formatCurrency } from "@/lib/property-constants";
import { getCityCoords } from "./brazil-city-coords";
import { useNavigate } from "react-router-dom";
import type { Property } from "@/hooks/useProperties";
import CityDetailsView from "./CityDetailsDialog";
import { Button } from "@/components/ui/button";

// Fix default marker icon issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function stageHslVar(stage: string): string {
  const map: Record<string, string> = {
    pre_arrematacao: "var(--stage-pre-auction)",
    itbi_contrato: "var(--stage-itbi-contract)",
    registro: "var(--stage-registration)",
    desocupacao: "var(--stage-eviction)",
    reforma: "var(--stage-renovation)",
    venda: "var(--stage-sale)",
    pos_venda: "var(--stage-post-sale)",
    ir: "var(--stage-tax)",
    finalizado: "var(--stage-finished)",
  };
  return map[stage] || "var(--muted)";
}

function stageColor(stage: string): string {
  return `hsl(${stageHslVar(stage)})`;
}

function createStageIcon(stage: string, count: number): L.DivIcon {
  const color = stageColor(stage);
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background: ${color};
      color: white;
      border-radius: 50%;
      width: ${count > 1 ? 32 : 26}px;
      height: ${count > 1 ? 32 : 26}px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${count > 1 ? 12 : 10}px;
      font-weight: 700;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    ">${count > 1 ? count : ""}</div>`,
    iconSize: [count > 1 ? 32 : 26, count > 1 ? 32 : 26],
    iconAnchor: [count > 1 ? 16 : 13, count > 1 ? 16 : 13],
  });
}

function createClusterIcon(count: number): L.DivIcon {
  const size = count > 20 ? 44 : count > 5 ? 38 : 32;
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background: hsl(221, 83%, 53%);
      color: white;
      border-radius: 50%;
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Component to fly to bounds when selectedState changes
function FlyToBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.flyToBounds(bounds, { padding: [30, 30], maxZoom: 10, duration: 0.8 });
    }
  }, [bounds, map]);
  return null;
}

function ResetView() {
  const map = useMap();
  useEffect(() => {
    map.flyTo([-14.5, -51], 4, { duration: 0.8 });
  }, [map]);
  return null;
}

interface Props {
  properties: Property[];
}

interface PropertyMarker {
  id: string;
  lat: number;
  lng: number;
  property: Property;
}

interface CityGroup {
  city: string;
  state: string;
  lat: number;
  lng: number;
  properties: Property[];
}

export default function BrazilMap({ properties }: Props) {
  const navigate = useNavigate();
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<{ city: string; state: string; props: Property[] } | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Group properties by state
  const propsByState = useMemo(() => {
    const map: Record<string, Property[]> = {};
    properties.forEach(p => {
      if (p.state) {
        const st = p.state.toUpperCase().trim();
        if (!map[st]) map[st] = [];
        map[st].push(p);
      }
    });
    return map;
  }, [properties]);

  // Create city-grouped markers with coordinates
  const cityGroups = useMemo((): CityGroup[] => {
    const groups: Record<string, CityGroup> = {};
    properties.forEach(p => {
      if (!p.state) return;
      const st = p.state.toUpperCase().trim();
      const city = p.city?.trim() || "Sem cidade";
      const key = `${city}|${st}`;
      if (!groups[key]) {
        const coords = getCityCoords(p.city, p.state);
        if (!coords) return;
        groups[key] = { city, state: st, lat: coords[0], lng: coords[1], properties: [] };
      }
      groups[key].properties.push(p);
    });
    return Object.values(groups);
  }, [properties]);

  // Bounds for selected state
  const stateBounds = useMemo((): L.LatLngBoundsExpression | null => {
    if (!selectedState) return null;
    const stateGroups = cityGroups.filter(g => g.state === selectedState);
    if (stateGroups.length === 0) return null;
    const lats = stateGroups.map(g => g.lat);
    const lngs = stateGroups.map(g => g.lng);
    return [
      [Math.min(...lats) - 0.5, Math.min(...lngs) - 0.5],
      [Math.max(...lats) + 0.5, Math.max(...lngs) + 0.5],
    ];
  }, [selectedState, cityGroups]);

  // State kanban for sidebar
  const stateKanban = useMemo(() => {
    if (!selectedState) return [];
    const stateProps = propsByState[selectedState] || [];
    const byStage: Record<string, Property[]> = {};
    stateProps.forEach(p => {
      if (!byStage[p.stage]) byStage[p.stage] = [];
      byStage[p.stage].push(p);
    });
    return PROPERTY_STAGES.filter(s => byStage[s.value]).map(s => ({
      ...s,
      props: byStage[s.value],
    }));
  }, [selectedState, propsByState]);

  const selectedStateName = useMemo(() => {
    if (!selectedState) return "";
    const stateNames: Record<string, string> = {
      AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará",
      DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso",
      MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará", PB: "Paraíba", PR: "Paraná",
      PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
      RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina",
      SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
    };
    return stateNames[selectedState] || selectedState;
  }, [selectedState]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Mapa de Imóveis
          <Badge variant="secondary">{properties.filter(p => p.state).length} com localização</Badge>
          {selectedState && (
            <>
              <span className="text-muted-foreground">›</span>
              <Badge
                variant="outline"
                className="cursor-pointer"
                onClick={() => setSelectedState(null)}
              >
                {selectedStateName} ({selectedState}) ✕
              </Badge>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Interactive Map */}
          <div className="flex-1 rounded-lg overflow-hidden border" style={{ minHeight: 420 }}>
            <MapContainer
              center={[-14.5, -51]}
              zoom={4}
              style={{ height: "420px", width: "100%" }}
              ref={mapRef}
              scrollWheelZoom
              zoomControl
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {selectedState ? (
                <FlyToBounds bounds={stateBounds} />
              ) : (
                mapRef.current && <ResetView />
              )}

              {/* City markers — always stage-colored */}
              {cityGroups
                .filter(g => !selectedState || g.state === selectedState)
                .flatMap(g => {
                  // Group properties by stage
                  const byStage: Record<string, Property[]> = {};
                  g.properties.forEach(p => {
                    if (!byStage[p.stage]) byStage[p.stage] = [];
                    byStage[p.stage].push(p);
                  });
                  const stages = Object.entries(byStage);

                  // When zoomed in: offset markers slightly so they don't overlap
                  // When zoomed out: put all at same spot (small city = small offset)
                  const isZoomedIn = !!selectedState;
                  const offsetScale = isZoomedIn ? 0.025 : 0.008;

                  return stages.map(([stage, props], i) => {
                    const offset = stages.length > 1
                      ? (i - (stages.length - 1) / 2) * offsetScale
                      : 0;

                    return (
                      <Marker
                        key={`${g.city}-${g.state}-${stage}`}
                        position={[g.lat + offset, g.lng + offset]}
                        icon={createStageIcon(stage, isZoomedIn ? props.length : 0)}
                        eventHandlers={{
                          click: () => {
                            if (!selectedState) setSelectedState(g.state);
                          },
                        }}
                      >
                        {isZoomedIn && (
                          <Popup maxWidth={280}>
                            <div className="text-sm">
                              <div className="flex items-center justify-between gap-4 mb-2">
                                <p className="font-bold text-base leading-none">{g.city}</p>
                                <Button variant="link" size="sm" className="h-auto p-0 text-[10px] font-bold uppercase" onClick={() => setSelectedCity({ city: g.city, state: g.state, props: g.properties })}>
                                  Ver Detalhes ›
                                </Button>
                              </div>
                              <p className="text-xs text-gray-500 mb-2">
                                {PROPERTY_STAGES.find(s => s.value === stage)?.label}
                              </p>
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {props.map(p => (
                                  <div
                                    key={p.id}
                                    className="p-1.5 rounded border cursor-pointer hover:bg-gray-50"
                                    onClick={() => navigate("/properties", { state: { highlightProperty: p.id } })}
                                  >
                                    <p className="font-semibold">{p.code}</p>
                                    {p.neighborhood && <p className="text-xs text-gray-500">{p.neighborhood}</p>}
                                    {(p.purchase_price || 0) > 0 && (
                                      <p className="text-xs text-gray-600">{formatCurrency(p.purchase_price)}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </Popup>
                        )}
                      </Marker>
                    );
                  });
                })}
            </MapContainer>
          </div>

          {/* Right panel: states list OR state kanban */}
          <div className="lg:w-72 max-h-[420px] overflow-y-auto">
            {selectedState ? (
              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  Kanban — {selectedStateName}
                </p>
                {stateKanban.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhum imóvel neste estado.</p>
                ) : (
                  stateKanban.map(stage => (
                    <div key={stage.value} className="rounded-lg border bg-card">
                      <div className="flex items-center gap-2 p-2 border-b">
                        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: stageColor(stage.value) }} />
                        <span className="text-xs font-semibold">{stage.label}</span>
                        <Badge variant="secondary" className="text-[10px] h-5 ml-auto">{stage.props.length}</Badge>
                      </div>
                      <div className="p-2 space-y-1.5">
                        {stage.props.map(p => (
                          <div
                            key={p.id}
                            className="p-2 rounded-md border bg-background hover:bg-accent/30 transition-colors cursor-pointer text-xs"
                            onClick={() => navigate("/properties", { state: { highlightProperty: p.id } })}
                          >
                            <p className="font-bold text-foreground">{p.code}</p>
                            <p className="text-muted-foreground truncate">
                              {[p.city, p.state].filter(Boolean).join(" - ")}
                            </p>
                            {p.neighborhood && <p className="text-muted-foreground truncate">{p.neighborhood}</p>}
                            {(p.purchase_price || 0) > 0 && (
                              <p className="text-muted-foreground mt-0.5">{formatCurrency(p.purchase_price)}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Estados com imóveis</p>
                {Object.entries(propsByState)
                  .sort((a, b) => b[1].length - a[1].length)
                  .map(([uf, props]) => (
                    <div
                      key={uf}
                      className="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors cursor-pointer text-sm"
                      onClick={() => setSelectedState(uf)}
                    >
                      <span className="font-medium">{uf}</span>
                      <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-1">
                          {props.slice(0, 4).map(p => (
                            <div
                              key={p.id}
                              className="h-2.5 w-2.5 rounded-full border border-background"
                              style={{ backgroundColor: stageColor(p.stage) }}
                            />
                          ))}
                        </div>
                        <Badge variant="secondary" className="text-[10px] h-5">{props.length}</Badge>
                      </div>
                    </div>
                  ))}
                {Object.keys(propsByState).length === 0 && (
                  <p className="text-xs text-muted-foreground py-4 text-center">Nenhum imóvel com estado definido.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Legenda de Etapas</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {PROPERTY_STAGES.map(s => (
              <div key={s.value} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: stageColor(s.value) }} />
                {s.label}
              </div>
            ))}
          </div>
        </div>

        {selectedCity && (
          <CityDetailsView
            city={selectedCity.city}
            state={selectedCity.state}
            properties={selectedCity.props}
            onClose={() => setSelectedCity(null)}
          />
        )}
      </CardContent>
    </Card>
  );
}
