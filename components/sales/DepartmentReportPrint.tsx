'use client'

import SalesLetterhead from './SalesLetterhead'

export type ReportPeriod = { startDate: string; endDate: string }
export type ReportPreparer = { name: string; role: string }

const periodDate = new Intl.DateTimeFormat('en-PH', { dateStyle: 'long', timeZone: 'UTC' })

function reportingPeriod({ startDate, endDate }: ReportPeriod) {
  if (startDate && endDate) return `${periodDate.format(new Date(startDate))} to ${periodDate.format(new Date(endDate))}`
  if (startDate) return `From ${periodDate.format(new Date(startDate))}`
  if (endDate) return `Through ${periodDate.format(new Date(endDate))}`
  return 'All dates'
}

export default function DepartmentReportPrint({
  title,
  officerLabel,
  preparedBy,
  period,
  filterNote,
}: {
  title: string
  officerLabel: string
  preparedBy: ReportPreparer
  period: ReportPeriod
  filterNote?: string
}) {
  return (
    <header className="department-print-header">
      <SalesLetterhead />
      <h1 className="department-print-title">{title}</h1>
      <dl className="department-print-meta">
        <div>
          <dt>{officerLabel}</dt>
          <dd>{preparedBy.name}</dd>
        </div>
        <div>
          <dt>Reporting period</dt>
          <dd>{reportingPeriod(period)}</dd>
        </div>
      </dl>
      {filterNote && <p className="department-print-filter">{filterNote}</p>}
    </header>
  )
}

export function DepartmentReportStyles() {
  return (
      <style jsx global>{`
        .department-print-header { display: none; }
        .department-report-page .report-table table { width: 100%; border-collapse: collapse; }
        .department-report-page .report-table th { background: #0f172a; color: #cbd5e1; font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; padding: 12px 16px; text-align: left; white-space: nowrap; }
        .department-report-page .report-table td { border-top: 1px solid #eef2f7; color: #64748b; padding: 12px 16px; vertical-align: middle; }

        @media print {
          @page { size: A4 portrait; margin: 15mm; }
          html:has(.department-report-page),
          body:has(.department-report-page) { height: auto !important; overflow: visible !important; }
          body:has(.department-report-page),
          div:has(> div > main > .department-report-page) { background: white !important; min-height: 0 !important; }
          div:has(> div > main > .department-report-page) > aside,
          div:has(> main > .department-report-page) > :is(header, footer),
          .department-report-page .reports-print-hidden,
          .department-report-page :is(img, svg):not(.sales-letterhead-logo) { display: none !important; }
          div:has(> main > .department-report-page) { display: block !important; margin: 0 !important; min-height: 0 !important; }
          main:has(> .department-report-page) { padding: 0 !important; }
          .department-report-page { color: #111; font: 10pt/1.4 Arial, sans-serif; }
          .department-report-page > * + * { margin-top: 6mm !important; }

          .department-print-header { display: block; margin-top: 0 !important; break-inside: avoid; }
          .department-print-title { margin: 5mm 0 2mm; font-size: 20pt; line-height: 1.15; font-weight: 700; }
          .department-print-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 5mm; }
          .department-print-meta dt { font-size: 8pt; font-weight: 700; }
          .department-print-meta dd { margin: 0; overflow-wrap: anywhere; }
          .department-print-filter { margin-top: 2mm; overflow-wrap: anywhere; }

          .department-print-summary { display: grid; grid-template-columns: repeat(var(--report-summary-columns, 3), minmax(0, 1fr)); gap: 0; border-block: 1px solid #555; break-inside: avoid; }
          .department-report-page .reports-print-card { overflow: visible; border: 0; border-radius: 0; box-shadow: none; background: white; }
          .department-print-summary .reports-print-card { padding: 3mm; }
          .department-print-summary .reports-print-card + .reports-print-card { border-left: 1px solid #aaa; }
          .department-print-summary .reports-print-card > div { display: none; }
          .department-print-summary p { color: #111; letter-spacing: normal; }
          .department-print-summary p:nth-of-type(2) { margin-top: 1mm; font-size: 13pt; line-height: 1.25; overflow-wrap: anywhere; }

          .department-print-table-group { display: block; }
          .department-print-table-group > * + * { margin-top: 6mm; }
          .department-print-table-heading { padding: 0 0 2mm; border: 0; break-after: avoid; }
          .department-print-table-heading :is(h2, p, span) { color: #111; }
          .department-print-table-heading h2 { font-size: 12pt; font-weight: 700; }
          .department-print-table-heading > span { background: none; padding: 0; font-size: 8pt; }
          .department-report-page .report-table { overflow: visible; }
          .department-report-page .report-table table { table-layout: fixed; font-size: 8.5pt; }
          .department-report-page .report-table thead { display: table-header-group; }
          .department-report-page .report-table tr { break-inside: avoid; }
          .department-report-page .report-table :is(th, td) { padding: 2mm 1.5mm; color: #111; white-space: normal; overflow-wrap: anywhere; }
          .department-report-page .report-table th { background: none; font-size: 8pt; letter-spacing: normal; border-block: 1px solid #555; }
          .department-report-page .report-table td { border-bottom: 1px solid #bbb; }
          .department-report-page .report-table td span { color: inherit; background: none; padding: 0; }
        }
      `}</style>
  )
}
