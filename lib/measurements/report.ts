import { colors } from '@/constants/theme';
import { SCHEMA_ROLE_COLORS, SCHEMA_VIEW_HEIGHT, SCHEMA_VIEW_WIDTH, getSchemaElements, type SchemaElement } from './schemaGeometry';
import { formatDate, getRoomLabels, getSideLabel, millimetersOrNotSpecified, textOrNotSpecified } from './format';
import type { Measurement, Opening, OpeningSide } from './types';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function schemaElementToSvg(element: SchemaElement): string {
  const color = SCHEMA_ROLE_COLORS[element.role];
  switch (element.kind) {
    case 'line':
      return `<line x1="${element.x1}" y1="${element.y1}" x2="${element.x2}" y2="${element.y2}" stroke="${color}" stroke-width="${element.strokeWidth}" stroke-linecap="round"/>`;
    case 'path':
      return `<path d="${element.d}" fill="none" stroke="${color}" stroke-width="${element.strokeWidth}"${element.dashed ? ' stroke-dasharray="4 4"' : ''}/>`;
    case 'circle':
      return `<circle cx="${element.cx}" cy="${element.cy}" r="${element.r}" fill="${color}"/>`;
    case 'rect':
      return `<rect x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" rx="2" fill="${color}"/>`;
    case 'text':
      return `<text x="${element.x}" y="${element.y}" text-anchor="middle" font-size="10" fill="${color}">${escapeHtml(element.text)}</text>`;
  }
}

function schemaToSvg(side: OpeningSide | null): string {
  const body = getSchemaElements(side).map(schemaElementToSvg).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180" viewBox="0 0 ${SCHEMA_VIEW_WIDTH} ${SCHEMA_VIEW_HEIGHT}">${body}</svg>`;
}

function formatNotes(notes: string): string {
  return escapeHtml(notes).replace(/\n/g, '<br>');
}

function renderOpeningHtml(opening: Opening, title: string): string {
  const photo =
    opening.photoDataUrl && opening.photoDataUrl.startsWith('data:image/')
      ? `<img class="photo" src="${opening.photoDataUrl}" alt="" />`
      : '';
  return `
    <section class="opening">
      <div class="opening-info">
        <h3>${escapeHtml(title)}</h3>
        <p>Этаж: ${escapeHtml(textOrNotSpecified(opening.floor))}</p>
        <p>Высота: ${millimetersOrNotSpecified(opening.height)} · Ширина: ${millimetersOrNotSpecified(opening.width)} · Толщина: ${millimetersOrNotSpecified(opening.thickness)}</p>
        <p>Открывание: ${escapeHtml(getSideLabel(opening.side))}</p>
        ${photo}
      </div>
      <div class="schema">${schemaToSvg(opening.side)}</div>
    </section>`;
}

export function buildReportHtml(measurement: Measurement): string {
  const roomLabels = getRoomLabels(measurement.openings);
  const openings = measurement.openings
    .map((opening, index) => renderOpeningHtml(opening, `${index + 1}. ${roomLabels[index]}`))
    .join('');
  const notes = measurement.notes.trim()
    ? `<div class="notes"><h2>Заметки</h2><p>${formatNotes(measurement.notes.trim())}</p></div>`
    : '';

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>Замер ${escapeHtml(textOrNotSpecified(measurement.address))}</title>
  <style>
    @page { margin: 12mm; }
    body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: ${colors.text}; margin: 24px; font-size: 13px; line-height: 1.5; }
    h1 { font-size: 20px; margin: 0 0 12px; }
    h2 { font-size: 15px; margin: 16px 0 6px; }
    h3 { font-size: 14px; margin: 0 0 6px; }
    p { margin: 2px 0; color: ${colors.textSecondary}; }
    .summary { border: 1px solid ${colors.borderSoft}; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
    .summary strong { color: ${colors.text}; }
    .opening { display: flex; gap: 16px; border: 1px solid ${colors.borderSoft}; border-radius: 8px; padding: 12px; margin-top: 12px; break-inside: avoid; }
    .opening-info { flex: 1; }
    .photo { width: 180px; height: 135px; object-fit: cover; border-radius: 6px; margin-top: 8px; }
    .schema { width: 240px; flex-shrink: 0; }
    .schema svg { width: 240px; height: 180px; }
  </style>
</head>
<body>
  <h1>Замер дверных проемов</h1>
  <div class="summary">
    <p><strong>Адрес:</strong> ${escapeHtml(textOrNotSpecified(measurement.address))}</p>
    <p><strong>Заказчик:</strong> ${escapeHtml(textOrNotSpecified(measurement.clientName))}</p>
    <p><strong>Этаж объекта:</strong> ${escapeHtml(textOrNotSpecified(measurement.floor))}</p>
    <p><strong>Подъезд:</strong> ${escapeHtml(textOrNotSpecified(measurement.entrance))}, <strong>квартира:</strong> ${escapeHtml(textOrNotSpecified(measurement.apartment))}</p>
    <p><strong>Дата замера:</strong> ${formatDate(measurement.createdAt)}</p>
    <p><strong>Проемов:</strong> ${measurement.openings.length}</p>
  </div>
  ${notes}
  <h2>Проемы</h2>
  ${openings || '<p>Проемы не добавлены</p>'}
</body>
</html>`;
}

export function openPrintReport(measurement: Measurement): boolean {
  const reportWindow = window.open('', '_blank');
  if (!reportWindow) return false;
  reportWindow.document.open();
  reportWindow.document.write(buildReportHtml(measurement));
  reportWindow.document.close();
  setTimeout(() => {
    reportWindow.focus();
    reportWindow.print();
  }, 300);
  return true;
}
