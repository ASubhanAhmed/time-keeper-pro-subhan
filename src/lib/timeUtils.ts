export function formatTime(time: string | null): string {
  if (!time) return '--:--';
  return time;
}

export function calculateDuration(start: string | null, end: string | null): string {
  if (!start || !end) return '--:--';
  
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  
  let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
  if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return `${hours}h ${minutes}m`;
}

export function calculateWorkDuration(
  clockIn: string | null,
  clockOut: string | null,
  breakStart: string | null,
  breakEnd: string | null
): string {
  if (!clockIn || !clockOut) return '--:--';
  
  const [inH, inM] = clockIn.split(':').map(Number);
  const [outH, outM] = clockOut.split(':').map(Number);
  
  let totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  
  // Subtract break time
  if (breakStart && breakEnd) {
    const [bsH, bsM] = breakStart.split(':').map(Number);
    const [beH, beM] = breakEnd.split(':').map(Number);
    let breakMinutes = (beH * 60 + beM) - (bsH * 60 + bsM);
    if (breakMinutes < 0) breakMinutes += 24 * 60;
    totalMinutes -= breakMinutes;
  }
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return `${hours}h ${minutes}m`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getCurrentTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}
