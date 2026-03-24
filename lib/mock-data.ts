import { Meeting, Rep } from '@/types';
import { subDays, addDays, subMonths, format } from 'date-fns';

export const REPS: Rep[] = [
  // Sales Managers
  { id: 'm1', name: 'RJ Dorin',              initials: 'RD', team: 'Manager' },
  { id: 'm2', name: 'Ric Bernardino',        initials: 'RB', team: 'Manager' },
  // SME (Small-Medium Enterprise)
  { id: 's1', name: 'Paul Martinez',         initials: 'PM', team: 'SME' },
  { id: 's2', name: 'John Michael Inocencio',initials: 'JI', team: 'SME' },
  { id: 's3', name: 'Maria Cristina Calayag',initials: 'MC', team: 'SME' },
  { id: 's4', name: 'Kisha Guatlo',          initials: 'KG', team: 'SME' },
  // OO (Owner Operators)
  { id: 'o1', name: 'Anferny Louie Martinez',initials: 'AL', team: 'OO' },
  { id: 'o2', name: 'Oscar Velasco',         initials: 'OV', team: 'OO' },
  { id: 'o3', name: 'Marvin Aguilar',        initials: 'MA', team: 'OO' },
  { id: 'o4', name: 'Marron Jarabejo',       initials: 'MJ', team: 'OO' },
  { id: 'o5', name: 'Nicole Detuelo',        initials: 'ND', team: 'OO' },
];

const repNames = REPS.map((r) => r.name);

const COMPANIES = [
  'Acme Corp', 'TechFlow Inc', 'BrightPath LLC', 'NovaStar', 'Pinnacle Systems',
  'Apex Solutions', 'BlueSky Ventures', 'CoreLogic', 'DynaTech', 'EverGreen Co',
  'FlexGroup', 'GlobalSync', 'HorizonNet', 'InnoCo', 'JumpStart Labs',
  'Keystone Partners', 'Luminary AI', 'MetroBase', 'NextGen Digital', 'Orbit Media',
  'PeakWave', 'Quantum Leap', 'Rapid Scale', 'Summit Brands', 'TrueNorth Inc',
  'Unity Works', 'Vantage Point', 'WaveTech', 'XcelGroup', 'YieldForce',
];

const LEAD_STATUSES = [
  'Marketing Qualified Lead', 'Sales Qualified Lead', 'Working', 'Open Deal', 'Customer',
];

const DEAL_STAGES = [
  'Demo Scheduled', 'Demo Completed', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost',
];

const MEETING_TYPES = ['Demo', 'Discovery Call', 'Follow-up Demo', 'Technical Review', 'Executive Briefing'];

const today = new Date();

function isoDate(d: Date): string {
  return d.toISOString();
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomRep(): string {
  return randomFrom(repNames);
}

function makeStatus(meetingDate: Date): Meeting['status'] {
  const isPast = meetingDate < today;
  if (!isPast) return 'booked';
  const roll = Math.random();
  if (roll < 0.55) return 'attended';
  if (roll < 0.72) return 'no_show';
  if (roll < 0.83) return 'cancelled';
  return 'rescheduled';
}

let idCounter = 1;

function makeMeeting(meetingDate: Date, bookedDaysBeforeMeeting = 3): Meeting {
  const company = randomFrom(COMPANIES);
  const type = randomFrom(MEETING_TYPES);
  const leadOwner = randomRep();
  const dealOwner = Math.random() > 0.3 ? leadOwner : randomRep();
  // ~40% of the time an SDR books the meeting for a different AE (lead owner)
  const bookedBy = Math.random() > 0.4 ? leadOwner : randomRep();
  const bookedOn = subDays(meetingDate, Math.floor(Math.random() * bookedDaysBeforeMeeting) + 1);
  return {
    id: String(idCounter++),
    name: `${type} – ${company}`,
    company,
    bookedOn: isoDate(bookedOn),
    meetingDate: isoDate(meetingDate),
    status: makeStatus(meetingDate),
    leadStatus: randomFrom(LEAD_STATUSES),
    dealStage: randomFrom(DEAL_STAGES),
    bookedBy,
    leadOwner,
    dealOwner,
  };
}

// Generate ~80 meetings: past 3 months + next 2 weeks
const meetings: Meeting[] = [];

// Past 3 months — variable density (2-5 per day, not every day)
for (let daysAgo = 90; daysAgo >= 1; daysAgo--) {
  if (Math.random() > 0.45) continue; // skip ~55% of days
  const count = Math.floor(Math.random() * 4) + 1;
  const meetingDate = subDays(today, daysAgo);
  // Set hour between 9am-5pm
  meetingDate.setHours(9 + Math.floor(Math.random() * 8), [0, 15, 30, 45][Math.floor(Math.random() * 4)], 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(meetingDate);
    d.setHours(9 + Math.floor(Math.random() * 8));
    meetings.push(makeMeeting(d, 7));
  }
}

// Next 2 weeks — upcoming (all booked)
for (let daysAhead = 1; daysAhead <= 14; daysAhead++) {
  if (Math.random() > 0.6) continue;
  const count = Math.floor(Math.random() * 3) + 1;
  for (let i = 0; i < count; i++) {
    const d = addDays(today, daysAhead);
    d.setHours(9 + Math.floor(Math.random() * 8), [0, 30][Math.floor(Math.random() * 2)], 0, 0);
    meetings.push(makeMeeting(d, 5));
  }
}

// Ensure today has a few meetings
for (let i = 0; i < 3; i++) {
  const d = new Date(today);
  d.setHours(10 + i * 2, 0, 0, 0);
  meetings.push(makeMeeting(d, 3));
}

export const MEETINGS: Meeting[] = meetings.sort(
  (a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime()
);
