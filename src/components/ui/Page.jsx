export default function Page({ children }) {
  return (
    <div style={styles.page}>
      {children}
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",

    // مهم جدًا للتوحيد مع Layout
    padding: "0",
  },
};