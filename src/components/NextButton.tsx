import styles from '../styles/NextButton.module.css';

interface NextButtonProps {
  label: string;
  disabled: boolean;
  onClick: () => void;
}

export function NextButton({ label, disabled, onClick }: NextButtonProps) {
  return (
    <button className={styles.button} disabled={disabled} onClick={onClick}>
      {label}
    </button>
  );
}
