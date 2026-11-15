import { defineWidget, type WidgetManifest } from "@glasshome/widget-sdk";
import { configSchema, migrateConfig, DonetickWidget, type Config } from "../shared/DonetickWidget";
import manifest from "./manifest.json";

export default defineWidget<Config>({
  manifest: manifest as WidgetManifest<Config>,
  configSchema,
  migrate: migrateConfig,
  component: (props) => <DonetickWidget config={props.config} view="week" />,
});
