// Local visual fixture only. This adapter is never used by production builds.
export * from "../../node_modules/@glasshome/widget-sdk/dist/index.js";
const date = (offset: number) => {const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10);};
export const fixture = {state: "8", attributes: {
  config_entry_id: "visual-only",
  circle_members: [{username: "noa", display_name: "Noa"}, {username: "thomas", display_name: "Thomas"}],
  tasks: [
    {task_id: 1, name: "Water the plants", next_due_date: date(-1), frequency_type: "daily", points: 5},
    {task_id: 2, name: "Take out the recycling", next_due_date: date(0), frequency_type: "weekly", points: 10},
    {task_id: 3, name: "Wipe the kitchen surfaces", next_due_date: date(0), frequency_type: "daily", points: 5},
    {task_id: 4, name: "Vacuum upstairs and the landing", next_due_date: date(1), frequency_type: "weekly", points: 15},
    {task_id: 5, name: "Change the bed linen", next_due_date: date(2), frequency_type: "weekly", points: 15},
    {task_id: 6, name: "Feed the pets", next_due_date: null, frequency_type: "always", points: 5},
    {task_id: 7, name: "Empty the dishwasher", next_due_date: null, frequency_type: "always", points: 10},
  ],
}};
export const useEntity = () => () => fixture;
export const useHassConfig = () => () => ({time_zone: "Europe/London"});
export const useService = () => ({callService: async (_domain: string, _service: string, data: unknown) => {
  // Deliberately disconnected from Home Assistant.
  console.info("Visual fixture completion", data);
}});
