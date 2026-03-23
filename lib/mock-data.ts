import { Meeting, Rep } from '@/types';
import { subDays, addDays, subMonths, format } from 'date-fns';

export const REPS: Rep[] = [
  { id: '1', name: 'Sarah Chen', initials: 'SC' },
  { id: '2', name: 'Marcus Webb', initials: 'MW' },
  { id: '3', name: 'Priya Patel', initials: 'PP' },
  { id: '4', name: 'Jake Torres', initials: 'JT' },
  { id: '5', name: 'Leah Nguyen', initials: 'LN' },
  { id: '6', name: 'Devon Clark', initials: 'DC' },
  { id: '7', name: 'Amir Hassan', initials: 'AH' },
  { id: '8', name: 'Riley Moore', initials: 'RM' },
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
