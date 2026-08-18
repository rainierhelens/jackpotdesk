export type FeedKind = "live" | "baked";

export function FeedMark({ feed }: { feed: FeedKind }) {
  if (feed === "live") {
    return (
      <strong className="feed-live">
        <span className="feed-play" aria-hidden="true" />
        Live feed
      </strong>
    );
  }
  return <span className="feed-baked">Baked fallback</span>;
}
