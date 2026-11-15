import {For, Show} from "solid-js";
import {Button, Input, Label, PanelSection, Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@glasshome/widget-sdk";
import {gestureLabels, type CompletionGesture} from "./gestures";
import {resolveMember, type Member} from "./tasks";
import type {TaskList} from "./discovery";

export type Assignments = {tapUsername?: string; doubleUsername?: string; holdUsername?: string; holdDelay?: number; assignmentsConfigured?: boolean};
export const assignmentKeys: Record<CompletionGesture, "tapUsername" | "doubleUsername" | "holdUsername"> = {
  tap: "tapUsername", double: "doubleUsername", hold: "holdUsername",
};

function Picker(props: {label: string; value: string; options: string[]; name: (value: string) => string; change: (value: string) => void; disabled?: boolean}) {
  return <div class="flex flex-col gap-2">
    <span class="text-sm font-medium">{props.label}</span>
    <Select options={props.options} value={props.value} onChange={value => {if (value != null && value !== props.value) props.change(value);}}
      disabled={props.disabled} itemComponent={item => <SelectItem item={item.item}>{props.name(item.item.rawValue)}</SelectItem>}>
      <SelectTrigger aria-label={props.label}><SelectValue<string>>{state => props.name(state.selectedOption())}</SelectValue></SelectTrigger>
      <SelectContent />
    </Select>
  </div>;
}

export function People(props: {
  config: Assignments;
  members: Member[];
  lists: TaskList[];
  selectedId?: string;
  update: (value: Partial<Assignments>) => void;
  selectList: (id: string) => void;
  appearance: () => void;
}) {
  // Whitespace-only usernames cannot occur in the active member list.
  const disabled = " ";
  const usernames = () => [disabled, ...new Set(props.members.map(member => member.username))];
  return <div class="flex flex-col gap-5">
    <PanelSection label="Task list">
      <Picker label="Donetick task list" options={props.lists.map(list => list.id)} value={props.selectedId ?? ""}
        name={id => props.lists.find(list => list.id === id)?.friendlyName || id || "Select a list"} change={props.selectList} />
    </PanelSection>
    <PanelSection label="Who completes each gesture?">
      <p class="text-sm text-muted-foreground">Users come from Donetick. Changes save automatically.</p>
      <Show when={props.members.length} fallback={<p class="text-sm text-muted-foreground">No active members reported. Select a Donetick list. If this list stays empty, reload the Donetick integration in Home Assistant to refresh its circle members.</p>}>
        <For each={["tap", "double", "hold"] as const}>{gesture => {
          const key = assignmentKeys[gesture];
          return <Picker label={gestureLabels[gesture]} value={resolveMember(props.config[key], props.members)?.username ?? disabled}
            options={usernames()} name={username => username === disabled ? "Disabled" : `${props.members.find(member => member.username === username)?.name || username} (@${username})`}
            change={username => props.update({[key]: username === disabled ? "" : username, assignmentsConfigured: true})} />;
        }}</For>
      </Show>
    </PanelSection>
    <PanelSection label="Long hold">
      <div class="flex flex-col gap-2"><Label>Hold duration (milliseconds)</Label><Input aria-label="Hold duration (milliseconds)" type="number" min={400} max={2000} step={100}
        value={props.config.holdDelay ?? 700} onChange={event => {
          const duration = Number(event.currentTarget.value);
          if (Number.isFinite(duration) && duration >= 400 && duration <= 2000) props.update({holdDelay: duration});
        }} /></div>
    </PanelSection>
    <Button variant="outline" onClick={props.appearance}>Appearance and display</Button>
  </div>;
}
