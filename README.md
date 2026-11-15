# Donetick widgets for GlassHome

Three neutral glass tiles that match the NAS widgets' compact headings, typography and spacing:

| Tile | Tasks shown |
| --- | --- |
| Today | Today, optionally including overdue tasks |
| Next 7 Days | Tomorrow through the seventh calendar day, using Home Assistant's timezone |
| Always Available | Tasks with Donetick's **Always** frequency |

## Install and connect

Use a current [Donetick Home Assistant integration](https://github.com/donetick/donetick-hass-integration). It must expose `tasks`, `circle_members` and `config_entry_id` on its to-do entities, and support `donetick.complete_task` with `completed_by_username`.

On the Linux host running GlassHome:

```bash
git clone https://github.com/TThorburn/DoneTick-GlassHome.git
cd DoneTick-GlassHome
bun install
bun run build
bun run widget connect http://localhost:3123
```

If already cloned, open that folder and run `git pull --ff-only` first. Use your actual GlassHome URL if it runs on another machine. Keep the connect process running while using the development connection. The NAS project can keep its own connection running in another terminal.

Add each Donetick tile from GlassHome's widget picker. The initial placement form has only an optional title and task list. Leave the list blank to detect **All Tasks** automatically. If more than one possible All Tasks list exists, choose one explicitly. Ordinary to-do lists are excluded from discovery.

## Automatic user discovery

After placement, a tile needing assignment opens **People and gestures** automatically when active members are available. Its dropdowns are populated from the selected Donetick list, showing each person's display name and username. Inactive members are excluded. Choose a person or **Disabled** for each gesture:

- **Single tap** — for example, Noa.
- **Double tap** — optional.
- **Long hold** — for example, you.

Selections save immediately. There is no username typing, extra save button, or save-and-reopen step. A gear button opens these controls later. Holding the **tile background** opens the same controls; holding a **task row** completes that task as the selected long-hold person.

User details can be recovered from another list belonging to the same Donetick connection when a project list lacks its own member metadata. They are never borrowed from another Donetick server. If no members are reported anywhere, reload the Donetick integration in Home Assistant to refresh its circle members. The widget cannot assign credit until Home Assistant supplies an active matching user.

Each completion explicitly sends that person's Donetick username and the task's configuration entry to Home Assistant. It does not guess a performer from task ownership. Switching connections clears the gesture assignments so a completion cannot accidentally credit a user on the wrong server.

Hold duration defaults to **700 ms** (adjustable from 400–2000 ms). Assigning double tap adds a **350 ms** single-tap delay so double tap records one completion. Scrolling cancels the press. Keyboard: Enter or Space taps, Shift+Enter double taps, and Shift+F10 or the context-menu key holds.

## Appearance and display

Open **People and gestures → Appearance and display**, or edit the tile through GlassHome, to adjust the appearance. The widget's Edit panel includes:

- Neutral NAS styling, home accent, blue, green or amber.
- Compact or comfortable rows; small, normal or large task text.
- Due-date, alphabetical or highest-points ordering.
- Date grouping and optional points, dates and gesture guide.
- Overdue tasks in Today and a visible-task limit of 1–100.

Sorting applies within groups when grouping is enabled. Extra tasks remain in Donetick; the tile reports how many are hidden. Always Available remains one list and its tasks remain available after completion. The task list scrolls independently of the header. GlassHome supplies the material, theme and light/dark mode.

Upgrading from 0.3.x retains saved list and user assignments. The old default blue wash and oversized spacing change to the neutral, compact NAS style. Other custom accent choices are retained; appearance settings remain adjustable.

## Home Assistant task coverage

In Donetick integration options, set **Show Due In** to at least **8 days**, or **0** for all tasks, to include the entire seventh calendar day. Enable **Show No Due Date** for always-available tasks. Use the All Tasks list to include everyone's tasks.

Tasks and completion history remain in Donetick. Home Assistant's polling controls how quickly changes made elsewhere appear.

## Build and test

Use Node.js 24+ for the tests, and Bun for the GlassHome CLI.

```bash
bun install
npm run test
bun run typecheck
bun run build
bun run widget validate
```

The build produces three bundles and `dist/registry.json`; building does not publish them to the community.

For a local preview disconnected from Home Assistant, run `bun run preview:layout` and open `http://127.0.0.1:4178/tests/visual/index.html`. Add `?setup` to exercise automatic discovery and the user dropdowns, or `?theme=dark&width=250&height=360` for small dark tiles. All tasks and completion messages on this test page are simulated. The test adapter is excluded from production bundles.
