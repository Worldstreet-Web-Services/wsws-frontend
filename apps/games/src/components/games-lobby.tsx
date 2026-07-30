"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CATEGORIES, GAMES } from "@games/lib/catalog";
import { GameCard } from "@games/components/game-card";
import styles from "./games.module.css";

// The games lobby: featured hero, then search + category chips over a card
// grid. Dark casino treatment matched to the approved design. Self-contained:
// no host navbar/footer, no shared icon library.
export function GamesLobby() {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["id"]>("all");
  const [query, setQuery] = useState("");

  const games = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GAMES.filter((game) => {
      const inCategory =
        category === "all" ||
        (category === "live" ? game.status === "live" : game.category === category);
      const inQuery = q === "" || game.name.toLowerCase().includes(q);
      return inCategory && inQuery;
    });
  }, [category, query]);

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={`${styles.wrap} ${styles.topbarInner}`}>
          <div className={styles.brand}>
            <span className={styles.mark}>W</span> World Street
          </div>
          <nav className={styles.nav}>
            <Link href="/earn">
              Earn <span className={styles.badgeNew}>New</span>
            </Link>
            <Link href="/games" className={styles.active}>
              Games
            </Link>
            <Link href="/dashboard">Markets</Link>
            <Link href="/vault">Vault</Link>
          </nav>
          <div className={styles.balance}>
            <span className={styles.dot} /> $183.31
          </div>
        </div>
      </header>

      <div className={styles.wrap}>
        <section className={styles.hero}>
          <div className={styles.eyebrow}>Featured</div>
          <h1>Play head to head. Cash out whenever.</h1>
          <p>
            Real, server-refereed games against other players. Skill and luck, settled on-chain,
            withdrawable to your wallet any time.
          </p>
          <div className={styles.heroCta}>
            <Link href="/games/chess" className={`${styles.btn} ${styles.btnPrimary}`}>
              ▶ Play Chess
            </Link>
            <a href="#games" className={`${styles.btn} ${styles.btnGhost}`}>
              Browse all games
            </a>
          </div>
          <div className={styles.heroStats}>
            <div>
              <div className={styles.n}>2,481</div>
              <div className={styles.l}>Players online</div>
            </div>
            <div>
              <div className={styles.n}>$46,203</div>
              <div className={styles.l}>Wagered today</div>
            </div>
            <div>
              <div className={styles.n}>{GAMES.length}</div>
              <div className={styles.l}>Games</div>
            </div>
          </div>
        </section>

        <div className={styles.controls} id="games">
          <div className={styles.chips}>
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`${styles.chip} ${category === c.id ? styles.chipActive : ""}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className={styles.search}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search games"
              aria-label="Search games"
            />
          </div>
        </div>

        {games.length > 0 ? (
          <div className={styles.grid}>
            {games.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <p className={styles.empty}>No games match your search.</p>
        )}

        <footer className={styles.footer}>
          © 2026 World Street · Play responsibly. Games carry risk, including loss of funds.
        </footer>
      </div>
    </div>
  );
}
