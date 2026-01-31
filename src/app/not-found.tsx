import Link from 'next/link';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>404</h1>
        <div className={styles.divider}></div>
        <h2 className={styles.subtitle}>Signal Lost</h2>
        <p className={styles.message}>
          The trace you are looking for has been purged or never existed in this
          dimension.
        </p>
        <Link href='/' className={styles.homeButton}>
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
