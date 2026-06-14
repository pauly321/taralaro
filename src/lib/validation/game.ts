import { z } from 'zod';
import { PreferredSport } from '@/lib/auth';
import { ReportCategory } from '@/types/game';

export const createGameSchema = z.object({
  title: z.string().trim().min(5, 'Game title must be at least 5 characters.').max(150, 'Game title must be 150 characters or fewer.'),
  courtName: z.string().trim().min(3, 'Court name is required.').max(150, 'Court name must be 150 characters or fewer.'),
  sport: z.enum(['basketball', 'volleyball']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date is required.'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Start time is required.'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'End time is required.'),
  location: z.string().trim().min(5, 'Location details are required.').max(255, 'Location must be 255 characters or fewer.'),
  barangay: z.string().trim().min(2, 'Barangay is required.').max(120, 'Barangay must be 120 characters or fewer.'),
  city: z.string().trim().min(2, 'City is required.').max(120, 'City must be 120 characters or fewer.'),
  latitude: z.string().refine((value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= -90 && parsed <= 90;
  }, 'Please pin a valid court location.'),
  longitude: z.string().refine((value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= -180 && parsed <= 180;
  }, 'Please pin a valid court location.'),
  slots: z.string().refine((value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 6 && parsed <= 50;
  }, 'Slots must be a whole number between 6 and 50.'),
  entryFee: z.string().refine((value) => {
    if (value.trim() === '') {
      return true;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100000;
  }, 'Entry fee must be zero or greater.'),
  description: z.string().trim().max(1000, 'Description must be 1000 characters or fewer.').optional().default(''),
  imageUrl: z.string().trim().url('Image URL must be valid.').optional().or(z.literal('')),
});

export type CreateGameFormValues = z.input<typeof createGameSchema>;
export type CreateGamePayload = {
  title: string;
  courtName: string;
  sport: PreferredSport;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  barangay: string;
  city: string;
  latitude: number;
  longitude: number;
  slots: number;
  entryFee: number | null;
  description?: string;
  imageUrl?: string;
};

export const toCreateGamePayload = (values: CreateGameFormValues): CreateGamePayload => {
  const parsed = createGameSchema.parse(values);

  return {
    title: parsed.title.trim(),
    courtName: parsed.courtName.trim(),
    sport: parsed.sport,
    date: parsed.date,
    startTime: parsed.startTime,
    endTime: parsed.endTime,
    location: parsed.location.trim(),
    barangay: parsed.barangay.trim(),
    city: parsed.city.trim(),
    latitude: Number(parsed.latitude),
    longitude: Number(parsed.longitude),  
    slots: Number(parsed.slots),
    entryFee: parsed.entryFee.trim() === '' ? null : Number(parsed.entryFee),
    description: parsed.description?.trim() || '',
    imageUrl: parsed.imageUrl?.trim() || '',
  };
};

export const createReportSchema = z.object({
  category: z.enum(['spam', 'fraud', 'harassment', 'unsafe_behavior', 'impersonation', 'other'] satisfies [ReportCategory, ...ReportCategory[]]),
  description: z.string().trim().min(10, 'Please provide at least 10 characters.').max(1000, 'Report details must be 1000 characters or fewer.'),
});

export type CreateReportFormValues = z.input<typeof createReportSchema>;
