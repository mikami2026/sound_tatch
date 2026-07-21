import styles from '../styles/Key.module.css';

export type KeyColor = 'none' | 'yellow' | 'green';
export type KeyVariant = 'white' | 'black';

interface KeyProps {
  displayLabel: string;
  color: KeyColor;
  variant?: KeyVariant;
}

export function Key({ displayLabel, color, variant = 'white' }: KeyProps) {
  const variantClass = variant === 'black' ? styles.blackKey : styles.whiteKey;
  const classNames = [styles.key, variantClass];
  if (color !== 'none') classNames.push(styles[color]);

  return (
    <div className={classNames.join(' ')}>
      <span className={styles.label}>{displayLabel}</span>
    </div>
  );
}
