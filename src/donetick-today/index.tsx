import { defineWidget, type WidgetManifest } from "@glasshome/widget-sdk";
import { configSchema, DonetickWidget, type Config } from "../shared/DonetickWidget";
import manifest from "./manifest.json";

export default defineWidget<Config>({
  manifest: manifest as WidgetManifest<Config>,
  configSchema,
  migrate: config => configSchema.parse(config),
  component: (props) => <DonetickWidget config={props.config} view="today" />,
});
