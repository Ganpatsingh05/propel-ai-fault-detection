/**
 * Scheduled outage domain types.
 * Used by the outage filter to suppress false alarms during planned maintenance.
 */

export interface ScheduledOutage {
  feederId: number | null;
  transformerId: number | null;
  startTime: Date;
  endTime: Date;
  reason: string;
}
