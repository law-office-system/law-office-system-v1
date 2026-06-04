import { theme } from "../../styles/theme";

export default function Card({ children, style = {} }) {
  return (
    <div
      style={{
        background: theme.colors.card,
        padding: 16,
        borderRadius: theme.radius.md,
        boxShadow: theme.shadow.sm,

        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",

        transition: "0.2s ease",

        ...style,
      }}
    >
      {children}
    </div>
  );
}