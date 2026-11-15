# Donetick widgets for GlassHome

Three separate tiles, using GlassHome's glass style and your existing Donetick Home Assistant integration:

| Tile | Tasks shown |
| --- | --- |
| Donetick Today | Due today, optionally including overdue tasks |
| Donetick Next 7 Days | Tomorrow through the seventh day, using Home Assistant's timezone |
| Donetick Always Available | Tasks with Donetick's **Always** frequency |

Use each tile's **settings button** to select a Donetick user for **Single tap**, **Double tap**, and **Long hold**. Choose **Disabled** for any gesture you do not want. For example: single tap for Noa, long hold for you, double tap disabled. The long hold duration defaults to **700 milliseconds** and is adjustable from 400 to 2000 milliseconds.

When double tap is assigned, a single tap waits **350 milliseconds** for a second tap. A double tap records only the double-tap user's completion. A long hold records only the long-hold user's completion. Scrolling cancels the press. A confirmation names the person credited; failures appear on the tile. Always-available tasks remain available for future completions.

With a keyboard, Enter or Space uses single tap, Shift+Enter uses double tap, and Shift+F10 or the context-menu key uses long hold. Pressing Enter or Space twice quickly also uses double tap when it is assigned.

## Prepare Home Assistant

Use a current [Donetick Home Assistant integration](https://github.com/donetick/donetick-hass-integration). The selected `todo` entity must expose `tasks`, `circle_members`, and `config_entry_id`, and the integration must provide `donetick.complete_task` with `completed_by_username` support.

In the Donetick integration's options, set **Show Due In** to at least **8 days**, or **0** for all tasks. This allows the upcoming tile to include the whole seventh calendar day. Enable **Show No Due Date** so always-available tasks are included. Choose the **All Tasks** entity in each tile if both people should see all household tasks.

## Connect from your Linux host

From the repository on the host running GlassHome:

```bash
cd /home/thorbs/buffalo-nas-widgets/glasshome-donetick
bun install
bun run widget connect http://localhost:3123
```

Use your actual GlassHome address if it runs elsewhere. Keep the connect process running while using this development connection. This project is separate from the NAS widgets; run it from `glasshome-donetick`, rather than `glasshome`.

Add **Donetick Today**, **Donetick Next 7 Days**, and **Donetick Always Available** from GlassHome's widget picker. In each tile's settings:

1. Select the Donetick to-do entity.
2. Save after selecting or changing the task list, then reopen the tile's settings button to load its users.
3. Select the person for each gesture from the dropdowns, or choose Disabled.
4. Choose whether Today's tile includes overdue tasks.

The dropdowns read the active members from the selected entity's `circle_members` attribute and display each person's name and username. Each completion explicitly sends the selected Donetick username through Home Assistant. An unavailable user cannot receive a completion. At least one gesture must have an active user selected. Each tile saves its own assignments. Existing single-tap and hold usernames are retained when they still match active members; double tap starts disabled.

Tasks update from Home Assistant's shared live state. Their history and completion credit stay in Donetick, so refreshing the dashboard does not reset the underlying tasks. Home Assistant's Donetick polling determines how quickly changes made elsewhere appear.

## Appearance settings

The settings button stays available on smaller tiles. Each tile saves its own appearance and completion gestures:

| Setting | Options |
| --- | --- |
| Accent colour | Neutral, home accent, blue, green, amber |
| Row spacing | Comfortable or compact |
| Task text size | Small, normal, large |
| Task order | Due date, alphabetical, highest points |
| Group tasks by day | On or off; overdue tasks appear first |
| Visible details | Toggle points, due dates, and the gesture guide |
| Maximum visible tasks | 1–100; the tile reports how many tasks are hidden |

When date grouping is enabled, sorting applies within each date group. Always Available stays a single list. The list scrolls while the header and settings stay in place. The gesture guide is hidden automatically on very narrow or short tiles to preserve space for tasks. Colours follow your GlassHome theme, including light and dark mode. A ring fills during a long hold, and successful completion names the person credited.

## Build and check

Use Node.js 24 or later for the included tests, and Bun for the GlassHome CLI.

```bash
bun install
npm run test
bun run typecheck
bun run build
bun run widget validate
```

The build produces three widget bundles and `dist/registry.json`. Installation and community distribution follow GlassHome's current widget publishing workflow; building alone does not upload them.

For a local layout preview with sample tasks, run `bun run preview:layout`, then open `http://127.0.0.1:4178/tests/visual/index.html`. Add `?theme=dark&density=compact` to check dark mode and compact rows. This test page is disconnected from Home Assistant; its completion messages simulate success and do not complete real tasks. It is not included in the widget bundles. GlassHome supplies the surrounding material and theme when the widgets run in the dashboard.
