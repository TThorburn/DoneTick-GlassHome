import {
  Button, byDomain, defineConfig, field, Icon, useEntities, useEntity, useHassConfig, useService,
  useWidgetGestures, useWidgetContext, useWidgetDialog, Widget, WidgetDialog, type Infer,
  ResponsiveDialog, ResponsiveDialogBody, ResponsiveDialogContent, ResponsiveDialogDescription,
  ResponsiveDialogFooter, ResponsiveDialogHeader, ResponsiveDialogTitle, SchemaForm,
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@glasshome/widget-sdk";
import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";

import { dayKey, resolveMember, selectTasks, tasksFrom, type Task, type View, type Member } from "./tasks";
import { createCompletionGestures, gestureLabels, type CompletionGesture } from "./gestures";
import {dueLabel, groupTasks, orderTasks} from "./presentation";
import {autoList, donetickLists, listMembers, upgradeConfig, type TaskList} from "./discovery";
import {People, type Assignments} from "./People";
import "./tasks.css";

const appearanceSchema = defineConfig({
  title: field.title(),
  list: field.entity("todo", {title: "Donetick task list (optional)", description: "Leave blank to detect All Tasks automatically. Choose a list if you have multiple Donetick connections."}),
  includeOverdue: field.toggle({title: "Include overdue tasks in Today", default: true}),
  tone: field.choice(["neutral", "accent", "info", "success", "warning"] as const, {
    title: "Accent colour", default: "neutral", labels: {neutral: "Match NAS tiles", accent: "Home accent", info: "Blue", success: "Green", warning: "Amber"},
  }),
  density: field.choice(["comfortable", "compact"] as const, {title: "Row spacing", default: "compact", labels: {comfortable: "Comfortable", compact: "Compact"}}),
  textSize: field.choice(["small", "normal", "large"] as const, {title: "Task text size", default: "small", labels: {small: "Match NAS tiles", normal: "Normal", large: "Large"}}),
  sortOrder: field.choice(["due", "name", "points"] as const, {title: "Task order", default: "due", labels: {due: "Due date", name: "Alphabetical", points: "Highest points"}}),
  groupByDate: field.toggle({title: "Group tasks by day", description: "Sort order applies within each group. Always Available remains a single list.", default: true}),
  showPoints: field.toggle({title: "Show task points", default: true}),
  showDates: field.toggle({title: "Show due dates on rows", default: true}),
  showGestures: field.toggle({title: "Show gesture guide", default: true}),
  taskLimit: field.number({title: "Maximum visible tasks", description: "Extra tasks stay in Donetick; the tile shows how many are hidden.", min: 1, max: 100, default: 30}),
}).passthrough();
// The placement dialog stays short; live users and appearance have their own
// controls after mounting. Passthrough preserves those saved runtime settings.
export const configSchema = defineConfig({title: appearanceSchema.shape.title, list: appearanceSchema.shape.list}).passthrough();
export type Config = Partial<Infer<typeof appearanceSchema>> & Assignments;
export const migrateConfig = (config: Record<string, unknown>, fromVersion: number) => appearanceSchema.parse(upgradeConfig(config, fromVersion));

const dialogParts = {
  ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle,
  ResponsiveDialogDescription, ResponsiveDialogBody, ResponsiveDialogFooter, Button, SchemaForm,
  Tabs, TabsContent, TabsList, TabsTrigger,
};

const TITLES: Record<View, string> = {
  today: "Today's Tasks", week: "Next 7 Days", always: "Always Available",
};
const ICONS: Record<View, string> = {
  today: "mdi:calendar-check-outline", week: "mdi:calendar-week", always: "mdi:repeat",
};
// Shared by instances of the same widget bundle, preventing duplicate in-flight clicks.
const inFlight = new Set<string>();

function TaskAction(props: {
  task: Task;
  disabled: boolean;
  pending: boolean;
  doubleEnabled: boolean;
  holdDelay: number;
  hint: string;
  holdEnabled: boolean;
  dateLabel: string;
  overdue: boolean;
  showPoints: boolean;
  complete: (task: Task, who: CompletionGesture) => void;
}) {
  const actions = createCompletionGestures({
    doubleEnabled: () => props.doubleEnabled,
    complete: who => props.complete(props.task, who),
  });
  createEffect(() => {
    props.task.id; props.disabled; props.pending; props.doubleEnabled; props.holdDelay; props.hint;
    actions.cancel();
  });
  const gestures = useWidgetGestures(() => ({
    tap: actions.tap,
    hold: {delay: props.holdDelay, action: actions.hold},
  }));
  onCleanup(() => {actions.cancel(); gestures.dispose();});
  return (
    <div
      class="dt-task" role="button" tabIndex={props.disabled || props.pending ? -1 : 0}
      aria-disabled={props.disabled || props.pending}
      aria-busy={props.pending}
      aria-label={`Complete ${props.task.name}. ${props.hint}`}
      ref={gestures.bindElement}
      style={{"touch-action": gestures.touchAction()}}
      onPointerDown={(event) => {
        if (props.disabled || props.pending || event.button !== 0) return;
        event.stopPropagation();
        actions.beginPress();
        gestures.onPointerDown(event);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={gestures.onPointerMove}
      onPointerUp={(event) => {
        event.stopPropagation();
        gestures.onPointerUp(event);
        actions.endPress();
      }}
      onPointerCancel={event => {actions.cancel(); gestures.onPointerCancel(event);}}
      onPointerEnter={gestures.onPointerEnter}
      onKeyDown={(event) => {
        if (props.disabled || props.pending) return;
        event.stopPropagation();
        if (event.repeat) { event.preventDefault(); return; }
        if (event.key === "Enter" && event.shiftKey) {
          event.preventDefault(); actions.double(); return;
        }
        gestures.onKeyDown?.(event);
      }}
      onContextMenu={(event) => {event.preventDefault();}}
    >
      <span class="dt-check" data-pending={props.pending}>
        <Icon icon={props.pending ? "mdi:progress-clock" : "mdi:checkbox-blank-circle-outline"} width={23} />
        <Show when={props.holdEnabled && gestures.hold?.()}>
          <svg class="dt-hold-ring" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" pathLength="1" style={{"animation-duration": `${Math.max(200, props.holdDelay - 100)}ms`}} /></svg>
        </Show>
      </span>
      <span class="dt-task-copy">
        <span class="dt-task-name">{props.task.name}</span>
        <Show when={props.dateLabel || props.pending}>
          <span class="dt-meta dt-date" data-overdue={props.overdue}>{props.pending ? "Completing…" : props.dateLabel}</span>
        </Show>
      </span>
      <Show when={props.showPoints && props.task.points !== null}>
        <span class="dt-points"><strong>{props.task.points}</strong><span class="dt-meta">pts</span></span>
      </Show>
    </div>
  );
}

function TaskContent(props: {config: Config; view: View; entity: () => TaskList | undefined; members: () => Member[]; openSettings: () => void; openAppearance: () => void; choosingList: boolean}) {
  const entity = props.entity;
  const hass = useHassConfig();
  const {callService} = useService();
  const [now, setNow] = createSignal(new Date());
  const [pending, setPending] = createSignal<number[]>([]);
  const [message, setMessage] = createSignal("");
  const [error, setError] = createSignal("");
  onMount(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    onCleanup(() => clearInterval(timer));
  });
  const timezone = () => hass()?.time_zone || "Europe/London";
  const all = createMemo(() => tasksFrom(entity()?.attributes.tasks));
  const members = props.members;
  const usernames = (): Record<CompletionGesture, string | undefined> => ({
    tap: props.config.tapUsername, double: props.config.doubleUsername, hold: props.config.holdUsername,
  });
  const performer = (who: CompletionGesture) => resolveMember(usernames()[who], members());
  const assigned = () => (["tap", "double", "hold"] as const).filter(who => performer(who));
  const invalid = () => (["tap", "double", "hold"] as const).filter(who => usernames()[who] && !performer(who));
  const hint = () => assigned().map(who => `${gestureLabels[who]} · ${performer(who)!.name}`).join(" · ");
  const holdDelay = () => Math.min(2000, Math.max(400, props.config.holdDelay ?? 700));
  const entry = () => entity()?.attributes.config_entry_id;
  const online = () => !!entity() && !["unavailable", "unknown"].includes(entity()!.state);
  const ready = () => online() && typeof entry() === "string" && assigned().length > 0;
  const tasks = createMemo(() => selectTasks(
    all(), props.view, now(), timezone(), props.config.includeOverdue ?? true,
  ));
  const ordered = createMemo(() => orderTasks(tasks(), props.config.sortOrder ?? "due", timezone()));
  const groups = createMemo(() => groupTasks(ordered(), props.view, props.config.groupByDate ?? true, now(), timezone()));
  const limit = () => Math.floor(Math.min(100, Math.max(1, props.config.taskLimit ?? 30)));
  const visibleGroups = createMemo(() => {
    let remaining = limit();
    return groups().map(group => {
      const visible = group.tasks.slice(0, remaining);
      remaining = Math.max(0, remaining - visible.length);
      return {...group, tasks: visible};
    }).filter(group => group.tasks.length);
  });
  const overdue = (task: Task) => !!task.due && (dayKey(task.due, timezone()) ?? "9999") < dayKey(now(), timezone())!;
  const overdueCount = () => tasks().filter(overdue).length;

  async function complete(task: Task, who: CompletionGesture) {
    if (!ready()) return;
    const member = performer(who);
    const entryId = entry();
    if (!member || typeof entryId !== "string") return;
    const key = `${entryId}:${task.id}`;
    if (inFlight.has(key) || pending().includes(task.id)) return;
    inFlight.add(key);
    setPending((ids) => [...ids, task.id]);
    setError("");
    setMessage("");
    try {
      await callService("donetick", "complete_task", {
        config_entry_id: entryId, task_id: task.id,
        completed_by_username: member.username,
      });
      setMessage(`${task.name} completed by ${member.name}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Completion could not be confirmed. Check Donetick before trying again.");
    } finally {
      setPending((ids) => ids.filter((id) => id !== task.id));
      inFlight.delete(key);
    }
  }

  return (
    <Widget.Content class="dt-content" >
      <div class="dt-heading">
        <h2>{props.config.title || TITLES[props.view]}</h2>
        <div class="dt-heading-actions"><Icon icon={ICONS[props.view]} width={18} /><Button variant="ghost" size="icon" aria-label="People and gestures" onPointerDown={(event: PointerEvent) => event.stopPropagation()} onClick={() => props.openSettings()}><Icon icon="mdi:cog-outline" width={16} /></Button></div>
      </div>
      <Show when={online() && Array.isArray(entity()?.attributes.tasks)}>
        <div class="dt-summary"><span><strong>{tasks().length}</strong> {tasks().length === 1 ? "task" : "tasks"}{props.view === "week" ? " · from tomorrow" : props.view === "always" ? " · always available" : " · today"}</span><Show when={overdueCount()}><span class="dt-overdue">{overdueCount()} overdue</span></Show></div>
      </Show>
      <Show when={props.config.showGestures !== false && assigned().length}>
        <p class="dt-legend dt-meta" aria-label="Completion gestures">{hint()}</p>
      </Show>
      <Show when={!entity()}><div class="dt-setup"><p class="dt-meta">{props.choosingList ? "More than one Donetick list found. Choose which list to use." : "Looking for a Donetick task list…"}</p><Button variant="outline" size="sm" onClick={() => props.openAppearance()}>Choose task list</Button></div></Show>
      <Show when={entity() && !online()}><p class="dt-meta" role="status">Task list unavailable.</p></Show>
      <Show when={online() && !Array.isArray(entity()?.attributes.tasks)}>
        <p role="alert">This list does not expose Donetick task details. Update the Donetick Home Assistant integration.</p>
      </Show>
      <Show when={online() && (!ready() || invalid().length > 0)}>
        <div class="dt-setup"><p class="dt-meta">{members().length ? `${members().length} Donetick users found. Choose who completes each gesture.` : "This list has not reported its circle members yet."}</p><Button variant="outline" size="sm" onClick={() => props.openSettings()}>Assign users</Button></div>
      </Show>
      <Show when={online() && Array.isArray(entity()?.attributes.tasks) && !tasks().length}>
        <div class="dt-empty"><Icon icon={props.view === "always" ? "mdi:repeat" : "mdi:check-all"} width={36} /><strong>{props.view === "today" ? "You're all caught up" : props.view === "week" ? "A clear week ahead" : "Nothing on repeat yet"}</strong><p class="dt-meta">{props.view === "always" ? "Add a task with the Always frequency in Donetick." : props.view === "week" ? "No tasks scheduled from tomorrow through the next seven days." : "No tasks due in this view."}</p></div>
      </Show>
      <div class="dt-list" aria-label="Tasks">
        <For each={visibleGroups().map(group => group.key)}>{key => {
          const initial = visibleGroups().find(group => group.key === key)!;
          const group = () => visibleGroups().find(group => group.key === key) ?? initial;
          return <section class="dt-group" role="list" aria-label={group().label || "Tasks"}>
          <Show when={group().label}><p class="dt-group-label" data-overdue={key === "overdue"}>{group().label}<span>{group().tasks.length}</span></p></Show>
          <For each={group().tasks.map(task => task.id)}>{id => {
            const original = group().tasks.find(task => task.id === id)!;
            const task = () => group().tasks.find(task => task.id === id) ?? original;
            return <div class="dt-item" role="listitem">
            <TaskAction task={task()} disabled={!ready()} pending={pending().includes(id)}
              doubleEnabled={!!usernames().double} holdDelay={holdDelay()} hint={hint()} holdEnabled={!!performer("hold")}
              dateLabel={props.config.showDates !== false && props.view !== "always" ? dueLabel(task().due, now(), timezone()) : ""}
              overdue={overdue(task())} showPoints={props.config.showPoints !== false}
              complete={(item, who) => {void complete(item, who);}} />
          </div>;
          }}</For>
        </section>;
        }}</For>
      </div>
      <Show when={tasks().length > limit()}><p class="dt-meta">Showing {limit()} of {tasks().length} · change the limit in settings</p></Show>
      <Show when={message()}><p class="dt-feedback dt-success" role="status"><Icon icon="mdi:check-circle-outline" width={18} />{message()}</p></Show>
      <Show when={error()}><p class="dt-feedback" role="alert">{error()}</p></Show>
    </Widget.Content>
  );
}

export function DonetickWidget(props: {config: Config; view: View}) {
  const ctx = useWidgetContext();
  const dialog = useWidgetDialog("controls");
  const lists = useEntities(() => byDomain().todo ?? []);
  const selected = useEntity(() => props.config.list?.[0] ?? "");
  const available = createMemo(() => donetickLists(lists()));
  const entity = () => props.config.list?.[0] ? selected() : autoList(available());
  const members = createMemo(() => listMembers(entity(), available()));
  const update = (value: Partial<Assignments>) => {
    if (Object.entries(value).some(([key, next]) => props.config[key] !== next)) ctx.updateConfig({...props.config, ...value});
  };
  const selectList = (id: string) => {
    // Never carry completion credit to another Donetick server implicitly.
    const target = available().find(list => list.id === id);
    const sameServer = target?.attributes.config_entry_id === entity()?.attributes.config_entry_id;
    ctx.updateConfig({...props.config, list: [id], ...(!sameServer ? {tapUsername: "", doubleUsername: "", holdUsername: "", assignmentsConfigured: false} : {})});
  };
  const people = () => <People config={props.config} members={members()} lists={available()} selectedId={entity()?.id} update={update} selectList={selectList} appearance={() => dialog.openDialog("edit")} />;
  let prompted = false;
  createEffect(() => {
    const mappings = [props.config.tapUsername, props.config.doubleUsername, props.config.holdUsername];
    const invalid = mappings.some(name => !!name && !resolveMember(name, members()));
    if (!prompted && entity() && members().length && (invalid || (!props.config.assignmentsConfigured && !mappings.some(name => resolveMember(name, members()))))) {
      prompted = true;
      dialog.openDialog("controls");
    }
  });
  return <>
    <Widget variant="classic-glass" tone={props.config.tone ?? "neutral"} class={`dt-widget dt-density-${props.config.density ?? "compact"} dt-text-${props.config.textSize ?? "small"}`}><TaskContent {...props} entity={entity} members={members} choosingList={available().length > 1} openSettings={() => dialog.openDialog("controls")} openAppearance={() => dialog.openDialog("edit")} /></Widget>
    <WidgetDialog {...dialogParts} {...dialog.dialogProps} title="Task widget settings"
      description="Select people from Donetick. Appearance is under Edit."
      controlsContent={people()} sheet={people} tile={{icon: ICONS[props.view]}}
      configSchema={appearanceSchema} config={appearanceSchema.parse(props.config)} onConfigSave={config => {
        const changedList = JSON.stringify(config.list) !== JSON.stringify(props.config.list);
        ctx.updateConfig({...props.config, ...config, ...(changedList ? {tapUsername: "", doubleUsername: "", holdUsername: "", assignmentsConfigured: false} : {})});
        dialog.closeDialog();
      }} />
  </>;
}
