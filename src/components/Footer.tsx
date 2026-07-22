import styles from '../styles/Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <p>
        ピアノ音源: Salamander Grand Piano by Alexander Holm（
        <a
          href="https://archive.org/details/SalamanderGrandPianoV3"
          target="_blank"
          rel="noreferrer"
        >
          CC BY 3.0
        </a>
        ） / バイオリン・フルート・トランペット音源: VSCO2 by Versilian Studios、経由{' '}
        <a href="https://github.com/nbrosowsky/tonejs-instruments" target="_blank" rel="noreferrer">
          nbrosowsky/tonejs-instruments
        </a>
        （CC BY 3.0）
      </p>
    </footer>
  );
}
