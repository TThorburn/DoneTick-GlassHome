import {createSignal, For} from "solid-js";
import {render} from "solid-js/web";
import {WidgetCtx} from "@glasshome/widget-sdk";
import {provideIcons, provideEntityData} from "@glasshome/ui/solid";
import {getPreset, resolveMaterial, FROSTED} from "@glasshome/ui/tokens";
import mdi from "@iconify-json/mdi/icons.json";
import {configSchema, DonetickWidget} from "../../src/shared/DonetickWidget";

provideIcons({bundled: Object.fromEntries(Object.entries(mdi.icons).map(([name, icon]) => [`mdi:${name}`, {...icon, width: 24, height: 24}]))});
const params = new URLSearchParams(location.search);
const dark = params.get("theme") === "dark";
document.documentElement.classList.toggle("dark", dark);
const preset = getPreset("midnight-glass")!;
for (const [key, value] of Object.entries(preset.colors[dark ? "dark" : "light"])) {
  document.documentElement.style.setProperty(`--${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`, value);
}
document.documentElement.style.setProperty("--foreground", dark ? "#e5edf5" : "#172839");
document.documentElement.style.setProperty("--radius", "18px");
for (const [key, value] of Object.entries(resolveMaterial(FROSTED, "none", dark ? "dark" : "light"))) document.documentElement.style.setProperty(key, value);
const entity = {id: "todo.visual", state: "8", name: "Sample Donetick", friendlyName: "Sample Donetick", aliases: [], areaId: null, icon: "mdi:checkbox-marked-outline", entityCategory: null, isHidden: false, isDisabled: false};
provideEntityData({entityIdsByDomain: () => ({todo: [entity.id]}), useEntities: () => () => [entity], getEntityView: id => id === entity.id ? entity : undefined, useAreas: () => () => []});
document.body.style.cssText = "margin:0;padding:32px;background:var(--background);color:var(--foreground);font-family:system-ui";
const width = Number(params.get("width")) || 365;
const height = Number(params.get("height")) || 540;
render(() => <>
  <p style={{"margin-bottom": "24px"}}>Layout preview · sample tasks · no connection to Home Assistant</p>
  <div style={{display: "flex", gap: "24px", "flex-wrap": "wrap"}}>
    <For each={["today", "week", "always"] as const}>{view => {
      const [config, setConfig] = createSignal(configSchema.parse({list: ["todo.visual"], holdUsername: "thomas", tone: params.get("tone") || "info", density: params.get("density") || "comfortable", textSize: params.get("text") || "normal"}));
      return <div style={{width: `${width}px`, height: `${height}px`}}><WidgetCtx.Provider value={{dimensions: () => ({width, height}), updateConfig: value => setConfig(configSchema.parse(value))}}><DonetickWidget config={config()} view={view} /></WidgetCtx.Provider></div>;
    }}</For>
  </div>
</>, document.getElementById("app")!);
