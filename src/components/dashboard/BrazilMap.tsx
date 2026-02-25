import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin } from "lucide-react";
import { BRAZIL_STATES, SVG_VIEWBOX } from "./BrazilMapData";
import { PROPERTY_STAGES } from "@/lib/property-constants";
import CityInfoDialog from "./CityInfoDialog";
import { useCityInfo } from "@/hooks/useCityInfo";
import type { Property } from "@/hooks/useProperties";

// Map stage value to its HSL CSS variable
const STAGE_HSL_MAP: Record<string, string> = {
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

function stageColor(stage: string): string {
  const hsl = STAGE_HSL_MAP[stage];
  return hsl ? `hsl(${hsl})` : "hsl(220, 10%, 60%)";
}

interface Props {
  properties: Property[];
}

export default function BrazilMap({ properties }: Props) {
  const { data: cityInfos = [] } = useCityInfo();
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<{ state: string; city: string } | null>(null);

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

  // Cities for selected state
  const citiesInState = useMemo(() => {
    if (!selectedState) return [];
    const stateProps = propsByState[selectedState] || [];
    const cityMap: Record<string, Property[]> = {};
    stateProps.forEach(p => {
      const c = p.city?.trim() || "Sem cidade";
      if (!cityMap[c]) cityMap[c] = [];
      cityMap[c].push(p);
    });
    return Object.entries(cityMap)
      .map(([city, props]) => ({ city, props }))
      .sort((a, b) => b.props.length - a.props.length);
  }, [selectedState, propsByState]);

  const selectedStateName = BRAZIL_STATES.find(s => s.uf === selectedState)?.name || selectedState;

  if (selectedState) {
    // State drill-down view — show cities
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setSelectedState(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <MapPin className="h-4 w-4 text-primary" />
            {selectedStateName} ({selectedState})
            <Badge variant="secondary">{(propsByState[selectedState] || []).length} imóveis</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {citiesInState.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum imóvel neste estado.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {citiesInState.map(({ city, props }) => (
                <div
                  key={city}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedCity({ state: selectedState, city })}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-sm">{city}</p>
                    <Badge variant="secondary" className="text-xs">{props.length}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {props.map(p => (
                      <div
                        key={p.id}
                        className="h-3 w-3 rounded-full border border-background shadow-sm"
                        style={{ backgroundColor: stageColor(p.stage) }}
                        title={`${p.code} — ${PROPERTY_STAGES.find(s => s.value === p.stage)?.label || p.stage}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stage legend */}
          <div className="mt-4 pt-3 border-t">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Legenda</p>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_STAGES.map(s => (
                <div key={s.value} className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stageColor(s.value) }} />
                  {s.label}
                </div>
              ))}
            </div>
          </div>
        </CardContent>

        {selectedCity && (
          <CityInfoDialog
            open={!!selectedCity}
            onOpenChange={(open) => { if (!open) setSelectedCity(null); }}
            state={selectedCity.state}
            city={selectedCity.city}
            cityInfo={cityInfos.find(ci => ci.state === selectedCity.state && ci.city.toLowerCase() === selectedCity.city.toLowerCase()) || null}
            properties={properties}
          />
        )}
      </Card>
    );
  }

  // Brazil map view
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Mapa de Imóveis
          <Badge variant="secondary">{properties.filter(p => p.state).length} com localização</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4">
          {/* SVG Map */}
          <div className="flex-1 flex justify-center">
            <svg viewBox={SVG_VIEWBOX} className="w-full max-w-md h-auto">
              {BRAZIL_STATES.map(st => {
                const stateProps = propsByState[st.uf] || [];
                const hasProperties = stateProps.length > 0;
                return (
                  <g key={st.uf} className="cursor-pointer" onClick={() => setSelectedState(st.uf)}>
                    <path
                      d={st.path}
                      fill={hasProperties ? "hsl(var(--primary) / 0.2)" : "hsl(var(--muted) / 0.3)"}
                      stroke="hsl(var(--border))"
                      strokeWidth={1}
                      className="transition-colors hover:fill-[hsl(var(--primary)/0.4)]"
                    />
                    <text
                      x={st.cx}
                      y={st.cy}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="text-[6px] font-bold fill-foreground pointer-events-none select-none"
                    >
                      {st.uf}
                    </text>
                    {hasProperties && (
                      <text
                        x={st.cx}
                        y={st.cy + 8}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="text-[5px] font-semibold fill-primary pointer-events-none select-none"
                      >
                        {stateProps.length}
                      </text>
                    )}
                    {/* Stage-colored dots */}
                    {hasProperties && stateProps.slice(0, 5).map((p, i) => (
                      <circle
                        key={p.id}
                        cx={st.cx - 8 + i * 4}
                        cy={st.cy + 14}
                        r={1.8}
                        fill={stageColor(p.stage)}
                        stroke="hsl(var(--background))"
                        strokeWidth={0.3}
                      />
                    ))}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* States list sidebar */}
          <div className="md:w-52 space-y-1 max-h-96 overflow-y-auto">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Estados com imóveis</p>
            {Object.entries(propsByState)
              .sort((a, b) => b[1].length - a[1].length)
              .map(([uf, props]) => (
                <div
                  key={uf}
                  className="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors cursor-pointer text-sm"
                  onClick={() => setSelectedState(uf)}
                >
                  <span className="font-medium">{BRAZIL_STATES.find(s => s.uf === uf)?.name || uf}</span>
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
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Legenda de Etapas</p>
          <div className="flex flex-wrap gap-2">
            {PROPERTY_STAGES.map(s => (
              <div key={s.value} className="flex items-center gap-1 text-xs text-muted-foreground">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stageColor(s.value) }} />
                {s.label}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
