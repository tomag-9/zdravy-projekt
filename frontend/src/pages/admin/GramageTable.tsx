/**
 * Tabuľka gramáže — zdieľa ju admin Prehľad aj kuchyňský prehľad (#486).
 *
 * Celý obsah aj vzhľad riadi `spec` z backendu (`gramage_table_spec.py`), ktorý
 * renderuje aj PDF. Tu sa nič nerozhoduje, len prekladá na značky — preto je
 * komponent read-only zo svojej podstaty a kuchyňa cezeň nemá čo zmeniť.
 */

import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { DietColorSwatch } from './DietColorSwatch';
import { Card } from './ui';

export interface SpecCell {
  text?: string;
  css?: string;
  colspan?: number;
  count?: string;
  sub?: string;
  meta?: string;
  meta_right?: string;
  label?: string;
  swatch?: { color: string; base_colors: string[] };
}

export interface SpecRow {
  kind: string;
  css: string;
  cells: SpecCell[];
  group_id?: string;
  collapsible?: boolean;
  color?: string | null;
  /** Len na riadkoch `kind: "client"` — cieľ odklikávania naloženia (#487). */
  prevadzka_id?: number | null;
}

export interface SpecSection {
  key: string;
  label: string;
  selected: boolean;
}

export interface TableSpec {
  total_columns: number;
  sections: SpecSection[];
  header: {
    corner: string;
    groups: Array<{ text: string; sub: string; css: string; colspan: number }>;
    components: Array<{ text: string; sub: string; css: string }>;
  };
  rows: SpecRow[];
  footer: SpecRow[];
}

const SpecCells: React.FC<{ cells: SpecCell[] }> = ({ cells }) => (
  <>
    {cells.map((cell, index) => (
      <td key={index} className={cell.css || undefined} colSpan={cell.colspan}>
        {cell.count !== undefined ? (
          <span className="lbl-line">
            <span>
              {cell.swatch && (
                <span style={{ display: "inline-flex", marginRight: 8 }}>
                  <DietColorSwatch color={cell.swatch.color} baseColors={cell.swatch.base_colors} size={9} />
                </span>
              )}
              {cell.text}
            </span>
            <span className="count-badge">{cell.count}</span>
          </span>
        ) : (
          cell.text
        )}
      </td>
    ))}
  </>
);

interface GramageTableProps {
  spec: TableSpec;
  className?: string;
  /**
   * Voliteľná akcia vpravo v riadku prevádzky. Admin Prehľad ju neposiela a
   * vyzerá presne ako predtým; kuchyňa cez ňu vešia odklikávanie naloženia.
   */
  renderClientAction?: (prevadzkaId: number) => React.ReactNode;
}

const GramageTable: React.FC<GramageTableProps> = ({ spec, className, renderClientAction }) => {
  const [expandedClients, setExpandedClients] = useState<string[]>([]);

  const toggleClient = (key: string) => {
    setExpandedClients((current) =>
      current.includes(key)
        ? current.filter((id) => id !== key)
        : [...current, key],
    );
  };

  // Riadok si nesie triedy aj farbu zo spec-u — tu sa už nič nerozhoduje,
  // len prekladá na značky (viď backend/api/exporters/gramage_table_spec.py).
  const renderRow = (row: SpecRow, index: number) => {
    const style = row.color ? { color: row.color } : undefined;

    if (row.kind === "client") {
      const cell = row.cells[0];
      const isExpanded = expandedClients.includes(row.group_id ?? "");
      const action =
        renderClientAction && row.prevadzka_id != null
          ? renderClientAction(row.prevadzka_id)
          : null;
      return (
        <tr key={index} className={row.css}>
          <td colSpan={cell.colspan}>
            <div className="client-line">
              <button type="button" className="client-toggle" onClick={() => toggleClient(row.group_id ?? "")}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span className={`chev${isExpanded ? " open" : ""}`}><ChevronRight size={15} /></span>
                  {cell.text}
                  <span className="meta">{cell.meta}</span>
                </span>
                <span className="meta">{cell.meta_right}</span>
              </button>
              {action}
            </div>
          </td>
        </tr>
      );
    }

    if (row.kind === "route") {
      const cell = row.cells[0];
      return (
        <tr key={index} className={row.css}>
          <td colSpan={cell.colspan}>
            <span className="route-pill">
              <span>{cell.text}</span>
              {cell.sub && <small>{cell.sub}</small>}
            </span>
          </td>
        </tr>
      );
    }

    if (row.kind === "note-admin" || row.kind === "note-delivery") {
      const cell = row.cells[0];
      return (
        <tr key={index} className={row.css}>
          <td colSpan={cell.colspan}>
            <strong>{cell.label}</strong>{" "}
            <span style={{ whiteSpace: "pre-wrap" }}>{cell.text}</span>
          </td>
        </tr>
      );
    }

    return (
      <tr key={index} className={row.css} style={style}>
        <SpecCells cells={row.cells} />
      </tr>
    );
  };

  // Podriadky, poznámky a medzisúčty klienta sa ukazujú až po rozbalení.
  const visibleRows = spec.rows.filter(
    (row) => !row.collapsible || expandedClients.includes(row.group_id ?? ""),
  );

  return (
    <Card style={{ overflow: "hidden" }}>
      <div className={`zpa-table-wrap zpa-gram-wrap${className ? ` ${className}` : ''}`}>
        <table className="zpa-gram">
          <thead>
            <tr>
              <th className="corner" rowSpan={2}>{spec.header.corner}</th>
              {spec.header.groups.map((group, index) => (
                <th key={index} className={group.css} colSpan={group.colspan}>
                  {group.text}<small>{group.sub}</small>
                </th>
              ))}
            </tr>
            <tr>
              {spec.header.components.map((component, index) => (
                <th key={index} className={component.css}>
                  {component.text}<small>{component.sub}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{visibleRows.map(renderRow)}</tbody>
          <tfoot>{spec.footer.map(renderRow)}</tfoot>
        </table>
      </div>
    </Card>
  );
};

export default GramageTable;
