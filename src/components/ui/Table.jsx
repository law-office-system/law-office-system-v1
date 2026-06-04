export default function Table({ columns = [], data = [], renderRow }) {
  return (
    <div style={styles.wrapper}>
      <table style={styles.table}>

        {/* HEADER */}
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} style={styles.th}>
                {col}
              </th>
            ))}
          </tr>
        </thead>

        {/* BODY */}
        <tbody>
          {data.map((item, index) =>
            renderRow ? renderRow(item, index) : null
          )}
        </tbody>

      </table>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    background: "#fff",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
  },

  th: {
    background: "#f0f2f5",
    padding: "12px",
    textAlign: "center",
    fontWeight: "bold",
    borderBottom: "1px solid #ddd",
  },
};