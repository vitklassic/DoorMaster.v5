import type { Measurement } from './types';

export type FeedItem = {
  key: string;
  measurement: Measurement;
};

export function buildFeedItems(measurements: Measurement[]): FeedItem[] {
  return measurements.map((measurement) => ({ key: measurement.id, measurement }));
}

export function filterFeedItems(items: FeedItem[], query: string): FeedItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  return items.filter(
    ({ measurement }) =>
      measurement.homeName.toLowerCase().includes(needle) ||
      measurement.address.toLowerCase().includes(needle) ||
      measurement.clientName.toLowerCase().includes(needle)
  );
}
