import React from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';

export default function Table({
  columns = [],
  data = [],
  renderRow,
  emptyMessage = 'لا توجد بيانات',
  hoverable = true,
}) {
  const { theme } = useTheme();
  const { table: tableStyles } = theme;

  return (
    <div style={tableStyles.wrapper}>
      <table style={tableStyles.table}>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} style={tableStyles.th}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={tableStyles.empty}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, index) =>
              renderRow ? (
                <HoverableRow key={index} hoverable={hoverable}>
                  {renderRow(item, index)}
                </HoverableRow>
              ) : null
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

function HoverableRow({ children, hoverable }) {
  const [hovered, setHovered] = React.useState(false);
  const { theme } = useTheme();
  const { table: tableStyles } = theme;

  return (
    <tr
      style={{
        ...tableStyles.tr,
        ...(hoverable && hovered ? tableStyles.hoverRow : {}),
      }}
      onMouseEnter={() => hoverable && setHovered(true)}
      onMouseLeave={() => hoverable && setHovered(false)}
    >
      {children}
    </tr>
  );
}

export const td = (theme) => theme.table.td;
export const tr = (theme) => theme.table.tr;
export const hoverRow = (theme) => theme.table.hoverRow;