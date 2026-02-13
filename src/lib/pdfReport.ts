import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TimeEntry, getDayBounds, getTotalBreakMinutes } from '@/types/timeEntry';
import { calculateSessionsOfficeDuration } from '@/lib/timeUtils';

export function generateMonthlyPDF(entries: TimeEntry[], year: number, month: number) {
  const doc = new jsPDF();
  const monthName = new Date(year, month).toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Filter entries for the month
  const monthEntries = entries
    .filter(e => {
      const d = new Date(e.date + 'T00:00:00');
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // Title
  doc.setFontSize(18);
  doc.text(`Timesheet — ${monthName}`, 14, 20);

  // Summary stats
  const workEntries = monthEntries.filter(e => e.type === 'work');
  let totalWorkMin = 0;
  let totalBreakMin = 0;
  workEntries.forEach(e => {
    e.sessions.forEach(s => {
      if (s.clockIn && s.clockOut) {
        const [inH, inM] = s.clockIn.split(':').map(Number);
        const [outH, outM] = s.clockOut.split(':').map(Number);
        let mins = (outH * 60 + outM) - (inH * 60 + inM);
        if (mins < 0) mins += 24 * 60;
        totalWorkMin += Math.max(0, mins);
      }
    });
    totalBreakMin += getTotalBreakMinutes(e.sessions);
  });

  const netMin = Math.max(0, totalWorkMin - totalBreakMin);
  doc.setFontSize(11);
  doc.text(`Days worked: ${workEntries.length}`, 14, 30);
  doc.text(`Total hours: ${(totalWorkMin / 60).toFixed(1)}h  |  Net hours: ${(netMin / 60).toFixed(1)}h  |  Break: ${(totalBreakMin / 60).toFixed(1)}h`, 14, 36);

  // Table
  const rows = monthEntries.map(entry => {
    const { earliestIn, latestOut } = getDayBounds(entry.sessions);
    const breakMin = getTotalBreakMinutes(entry.sessions);
    const officeTime = entry.type === 'work' ? calculateSessionsOfficeDuration(entry.sessions) : '';
    const dayName = new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
    return [
      `${dayName}, ${entry.date}`,
      entry.type,
      earliestIn || '-',
      latestOut || '-',
      `${breakMin}m`,
      officeTime || '-',
      String(entry.sessions.length),
      entry.notes || '',
    ];
  });

  autoTable(doc, {
    startY: 42,
    head: [['Date', 'Type', 'Start', 'End', 'Break', 'Office Time', 'Sessions', 'Notes']],
    body: rows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [215, 155, 40] },
  });

  doc.save(`timesheet-${year}-${String(month + 1).padStart(2, '0')}.pdf`);
}
