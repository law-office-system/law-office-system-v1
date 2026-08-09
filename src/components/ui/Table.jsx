import React from 'react';
import { table as tableStyles, colors, typography } from '../../styles/design-system';

/**
 * Table — جدول موحد
 * 
 * Usage:
 * <Table
 *   columns={['العمود 1', 'العمود 2']}
 *   data={items}
 *   renderRow={(item, index) => (
 *     <tr key={index}>
 *       <td style={Table.td}>{item.col1}</td>
 *       <td style={Table.td}>{item.col2}</td>
 *     </tr>
 *   )}
 *   emptyMessage="لا توجد بيانات"
 * />
 */
export default function Table({
  columns = [],
  data = [],
  renderRow,
  emptyMessage = 'لا توجد بيانات',
  hoverable = true,
}) {
  return (
    <div style={tableStyles.wrapper}>
      <table style={tableStyles.table}>
        {/* HEADER */}
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} style={tableStyles.th}>
                {col}
              </th>
            ))}
          </tr>
        </thead>

        {/* BODY */}
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={tableStyles.empty}
              >
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

/** صف قابل للـ hover */
function HoverableRow({ children, hoverable }) {
  const [hovered, setHovered] = React.useState(false);

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

// ═══════════════════════════════════════════════════════════════
//  STATIC STYLE EXPORTS (for use in renderRow)
// ═══════════════════════════════════════════════════════════════

export const td = tableStyles.td;
export const tr = tableStyles.tr;
export const hoverRow = tableStyles.hoverRow;