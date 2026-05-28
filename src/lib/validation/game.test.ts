import { describe, expect, it } from 'vitest';
import { createGameSchema, createReportSchema, toCreateGamePayload } from './game';

describe('createGameSchema', () => {
  it('accepts a valid organizer game payload', () => {
    const result = createGameSchema.safeParse({
      title: 'Sunday Streetball Showdown',
      courtName: 'Barangay 638 Basketball Court',
      sport: 'basketball',
      date: '2026-07-13',
      time: '06:00',
      location: 'Covered court beside barangay hall',
      barangay: 'Brgy. 638',
      city: 'Manila',
      slots: '10',
      entryFee: '50',
      description: 'Bring your own water.',
      imageUrl: '',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(toCreateGamePayload(result.data)).toMatchObject({
        slots: 10,
        entryFee: 50,
        city: 'Manila',
      });
    }
  });

  it('rejects invalid slot counts and short titles', () => {
    const result = createGameSchema.safeParse({
      title: 'Gym',
      courtName: 'Court',
      sport: 'basketball',
      date: '2026-07-13',
      time: '06:00',
      location: 'Court',
      barangay: 'A',
      city: 'M',
      slots: '3',
      entryFee: '',
      description: '',
      imageUrl: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('Slots'))).toBe(true);
      expect(result.error.issues.some((issue) => issue.message.includes('Game title'))).toBe(true);
    }
  });
});

describe('createReportSchema', () => {
  it('rejects overly short reports', () => {
    const result = createReportSchema.safeParse({
      category: 'fraud',
      description: 'Too short',
    });

    expect(result.success).toBe(false);
  });
});
