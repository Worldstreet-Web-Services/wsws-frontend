import Link from "next/link";
import type { GameEntry } from "@games/lib/catalog";
import styles from "./games.module.css";

// One game tile: gradient thumbnail with a symbol, a Live/Soon pill, live
// player count, and hover-to-play for live games. Presentational, no host UI.
export function GameCard({ game }: { game: GameEntry }) {
  const live = game.status === "live" && Boolean(game.href);

  const inner = (
    <>
      <div className={styles.thumb} style={{ background: game.gradient }}>
        {live ? (
          <span className={`${styles.pill} ${styles.pillLive}`}>
            <span className={styles.d} />
            Live
          </span>
        ) : (
          <span className={`${styles.pill} ${styles.pillSoon}`}>Soon</span>
        )}
        {live && game.players ? (
          <span className={styles.players}>{game.players} playing</span>
        ) : null}
        <span className={styles.glyph}>{game.glyph}</span>
        {live ? (
          <span className={styles.play}>
            <span>▶ Play now</span>
          </span>
        ) : null}
      </div>
      <div className={styles.cardBody}>
        <span className={styles.name}>{game.name}</span>
        <span className={styles.tag}>{game.tagline}</span>
      </div>
    </>
  );

  if (live) {
    return (
      <Link href={game.href!} className={`${styles.card} ${styles.live}`}>
        {inner}
      </Link>
    );
  }

  return <div className={`${styles.card} ${styles.soon}`}>{inner}</div>;
}
