import Link from "next/link";
import styles from "@games/components/games.module.css";

// Standalone chess table placeholder in the same dark casino treatment. The
// playable board, wired to the chess microservice via the API gateway with live
// updates over the WS gateway, lands next.
export function ChessPage() {
  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <Link href="/games" className={styles.backLink}>
          ← All games
        </Link>

        <section className={styles.hero} style={{ marginTop: 20 }}>
          <div className={styles.eyebrow}>Chess</div>
          <h1>Setting up the table</h1>
          <p>
            The live board is coming next: create or join a match, make moves refereed on the
            server, and watch the position update in real time.
          </p>
          <div className={styles.heroCta}>
            <Link href="/games" className={`${styles.btn} ${styles.btnGhost}`}>
              Back to games
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
