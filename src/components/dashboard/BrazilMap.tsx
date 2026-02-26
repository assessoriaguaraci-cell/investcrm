import { useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, ZoomIn, ZoomOut } from "lucide-react";
import { BRAZIL_STATES, SVG_VIEWBOX } from "./BrazilMapData";
import { PROPERTY_STAGES, formatCurrency } from "@/lib/property-constants";
import CityInfoDialog from "./CityInfoDialog";
import { useCityInfo } from "@/hooks/useCityInfo";
import { useNavigate } from "react-router-dom";
import type { Property } from "@/hooks/useProperties";

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
  const navigate = useNavigate();
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<{ state: string; city: string } | null>(null);

  // Zoom state
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 600, h: 600 });
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleZoomIn = useCallback(() => {
    setViewBox(prev => {
      const nw = prev.w * 0.6;
      const nh = prev.h * 0.6;
      return { x: prev.x + (prev.w - nw) / 2, y: prev.y + (prev.h - nh) / 2, w: nw, h: nh };
    });
    setZoomLevel(z => z / 0.6);
  }, []);

  const handleZoomOut = useCallback(() => {
    setViewBox(prev => {
      const nw = Math.min(prev.w / 0.6, 600);
      const nh = Math.min(prev.h / 0.6, 600);
      const nx = Math.max(0, prev.x - (nw - prev.w) / 2);
      const ny = Math.max(0, prev.y - (nh - prev.h) / 2);
      return { x: nx, y: ny, w: nw, h: nh };
    });
    setZoomLevel(z => Math.max(1, z * 0.6));
  }, []);

  const handleZoomToState = useCallback((uf: string) => {
    const st = BRAZIL_STATES.find(s => s.uf === uf);
    if (!st) return;
    const size = 120;
    setViewBox({ x: st.cx - size / 2, y: st.cy - size / 2, w: size, h: size });
    setZoomLevel(5);
    setSelectedState(uf);
  }, []);

  const handleResetZoom = useCallback(() => {
    setViewBox({ x: 0, y: 0, w: 600, h: 600 });
    setZoomLevel(1);
    setSelectedState(null);
  }, []);

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

  // Stage summary for selected state (state-level kanban, no city split)
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

  const selectedStateName = BRAZIL_STATES.find(s => s.uf === selectedState)?.name || selectedState;

  // Dynamic font size based on zoom
  const baseFontUf = Math.max(4, 10 / Math.sqrt(zoomLevel));
  const baseFontCount = Math.max(3, 8 / Math.sqrt(zoomLevel));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          {selectedState ? (
            <>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleResetZoom}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <MapPin className="h-4 w-4 text-primary" />
              {selectedStateName} ({selectedState})
              <Badge variant="secondary">{(propsByState[selectedState] || []).length} imóveis</Badge>
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 text-primary" />
              Mapa de Imóveis
              <Badge variant="secondary">{properties.filter(p => p.state).length} com localização</Badge>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4">
          {/* SVG Map with zoom controls */}
          <div className="flex-1 relative">
            <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleZoomOut} disabled={zoomLevel <= 1}>
                <ZoomOut className="h-4 w-4" />
              </Button>
            </div>
            <svg
              viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
              className="w-full max-w-md h-auto mx-auto transition-all duration-300"
            >
              {BRAZIL_STATES.map(st => {
                const stateProps = propsByState[st.uf] || [];
                const hasProperties = stateProps.length > 0;
                const isSelected = selectedState === st.uf;
                return (
                  <g key={st.uf} className="cursor-pointer" onClick={() => handleZoomToState(st.uf)}>
                    <path
                      d={st.path}
                      fill={isSelected ? "hsl(var(--primary) / 0.35)" : hasProperties ? "hsl(var(--primary) / 0.2)" : "hsl(var(--muted) / 0.3)"}
                      stroke={isSelected ? "hsl(var(--primary))" : "hsl(var(--border))"}
                      strokeWidth={isSelected ? 1.5 : 0.8}
                      className="transition-colors hover:fill-[hsl(var(--primary)/0.4)]"
                    />
                    <text
                      x={st.cx}
                      y={st.cy}
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{ fontSize: `${baseFontUf}px` }}
                      className="font-bold fill-foreground pointer-events-none select-none"
                    >
                      {st.uf}
                    </text>
                    {hasProperties && (
                      <text
                        x={st.cx}
                        y={st.cy + baseFontUf * 1.2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        style={{ fontSize: `${baseFontCount}px` }}
                        className="font-semibold fill-primary pointer-events-none select-none"
                      >
                        {stateProps.length}
                      </text>
                    )}
                    {/* Stage-colored dots */}
                    {hasProperties && stateProps.slice(0, 5).map((p, i) => (
                      <circle
                        key={p.id}
                        cx={st.cx - 8 + i * 4}
                        cy={st.cy + baseFontUf * 2.2}
                        r={Math.max(1.5, 2.5 / Math.sqrt(zoomLevel))}
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

          {/* Right panel: states list OR state kanban */}
          <div className="md:w-72 max-h-[500px] overflow-y-auto">
            {selectedState ? (
              /* State-level kanban: properties grouped by stage */
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
                            onClick={(e) => { e.stopPropagation(); navigate("/properties", { state: { highlightProperty: p.id } }); }}
                          >
                            <p className="font-bold text-foreground">{p.code}</p>
                            <p className="text-muted-foreground truncate">
                              {[p.city, p.state].filter(Boolean).join(" - ") || "Sem localização"}
                            </p>
                            {p.neighborhood && <p className="text-muted-foreground truncate">{p.neighborhood}</p>}
                            {(p.purchase_price || 0) > 0 && (
                              <p className="text-muted-foreground mt-0.5">{formatCurrency(p.purchase_price || 0)}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* States list */
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Estados com imóveis</p>
                {Object.entries(propsByState)
                  .sort((a, b) => b[1].length - a[1].length)
                  .map(([uf, props]) => (
                    <div
                      key={uf}
                      className="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors cursor-pointer text-sm"
                      onClick={() => handleZoomToState(uf)}
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
