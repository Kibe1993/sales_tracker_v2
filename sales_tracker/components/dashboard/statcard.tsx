import styles from "./statcard.module.css";

export default function StatCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className={`${styles.card} ${styles.color}`}>
      <p>{title}:</p>
      <h3>{value}</h3>
    </div>
  );
}
