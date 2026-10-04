/** What the app itself keeps about one habit: the widget shows a projection of it. */
export type Streak = {
  habit: string;
  days: number;
  best: number;
  /** Monday first: whether each day of this week was done. */
  week: boolean[];
};
