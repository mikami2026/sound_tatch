import styles from '../styles/Key.module.css';

export type KeyColor = 'none' | 'yellow' | 'green' | 'red';
export type KeyVariant = 'white' | 'black';

interface KeyProps {
  displayLabel: string;
  color: KeyColor;
  variant?: KeyVariant;
  onClick?: () => void;
}

export function Key({ displayLabel, color, variant = 'white', onClick }: KeyProps) {
  const variantClass = variant === 'black' ? styles.blackKey : styles.whiteKey;
  const classNames = [styles.key, variantClass];
  if (color !== 'none') classNames.push(styles[color]);
  if (onClick) classNames.push(styles.clickable);

  return (
    <button type="button" className={classNames.join(' ')} onClick={onClick} disabled={!onClick}>
      <span className={styles.label}>{displayLabel}</span>
    </button>
  );
}
