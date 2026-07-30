import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { CalendarItem } from "../lib/api";

const DAY_LABEL = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTH_LABEL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function keyToIsoDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m, d);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

export function CalendarWidget({ items }: { items: CalendarItem[] }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const d = new Date(item.scheduledDate);
      const key = dateKey(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [items]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const startOffset = firstDayOfMonth.getDay(); // 0 = Minggu
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const todayKey = dateKey(today);

  const cells: Array<{ date: Date; key: string } | null> = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    cells.push({ date, key: dateKey(date) });
  }

  const selectedItems = selectedKey ? itemsByDay.get(selectedKey) || [] : [];

  return (
    <div className="panel calendar-widget">
      <div className="calendar-widget__head">
        <h3 style={{ margin: 0 }}>
          {MONTH_LABEL[month]} {year}
        </h3>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => {
              setCursor(new Date(year, month - 1, 1));
              setSelectedKey(null);
            }}
          >
            ← <span className="calendar-widget__nav-label">Sebelumnya</span>
          </button>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => {
              setCursor(new Date(year, month + 1, 1));
              setSelectedKey(null);
            }}
          >
            <span className="calendar-widget__nav-label">Berikutnya</span> →
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        {DAY_LABEL.map((d) => (
          <div key={d} className="calendar-grid__weekday">
            {d}
          </div>
        ))}

        {cells.map((cell, idx) => {
          if (!cell) return <div key={`empty-${idx}`} />;
          const dayItems = itemsByDay.get(cell.key) || [];
          const isToday = cell.key === todayKey;
          const isSelected = cell.key === selectedKey;

          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => setSelectedKey(isSelected ? null : cell.key)}
              className={
                "calendar-cell" +
                (isToday ? " calendar-cell--today" : "") +
                (isSelected ? " calendar-cell--selected" : "")
              }
            >
              <span>{cell.date.getDate()}</span>
              {dayItems.length > 0 && (
                <span className="calendar-cell__badge">{dayItems.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {selectedKey && (
        <div className="calendar-widget__detail">
          {selectedItems.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <p className="text-muted" style={{ margin: 0 }}>
                Belum ada draft dijadwalkan di tanggal ini.
              </p>
              <Link to={`/content/new?date=${keyToIsoDate(selectedKey)}`} className="btn btn--sm btn--primary">
                + Buat Draft
              </Link>
            </div>
          ) : (
            <div className="stack stack--sm">
              {selectedItems.map((item) => (
                <Link
                  key={item.id}
                  to={`/content/${item.contentId}/edit`}
                  className="callout"
                  style={{ display: "block", textDecoration: "none", color: "var(--ink)" }}
                >
                  <strong>{item.content?.title || "(konten)"}</strong>
                  {item.platform && <span className="text-muted"> — {item.platform}</span>}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}