import { theme } from "../../styles/theme";

export default function Button({
  children,
  onClick,
  variant = "primary",
  style = {},
  disabled = false,
  type = "button",
}) {
  const colors = {
    primary: theme.colors.primary,
    success: theme.colors.success,
    danger: theme.colors.danger,
    gray: theme.colors.muted,
  };

  const baseColor = colors[variant] || theme.colors.primary;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 14px",
        border: "none",
        borderRadius: theme.radius.sm,
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: "600",
        color: "#fff",
        background: disabled ? theme.colors.border : baseColor,
        transition: "all 0.2s ease",
        opacity: disabled ? 0.6 : 1,
        transform: "scale(1)",
        ...style,
      }}
      onMouseOver={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = `${baseColor}dd`;
          e.currentTarget.style.transform = "scale(1.03)";
        }
      }}
      onMouseOut={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = baseColor;
          e.currentTarget.style.transform = "scale(1)";
        }
      }}
      onMouseDown={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = "scale(0.97)";
        }
      }}
      onMouseUp={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = "scale(1.03)";
        }
      }}
    >
      {children}
    </button>
  );
}