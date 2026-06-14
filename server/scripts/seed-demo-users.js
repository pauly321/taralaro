import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { getDb } from '../db.js';

const roleIds = {
  player: 1,
  organizer: 2,
  admin: 3,
};

const users = [
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    email: 'admin@yopmail.com',
    password: 'AdminPass123!',
    username: 'admin',
    displayName: 'Tara Laro Admin',
    firstName: 'Tara',
    lastName: 'Admin',
    city: 'Pasig City',
    barangay: 'Kapitolyo',
    preferredSport: 'basketball',
    role: 'admin',
  },
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    email: 'organizer@yopmail.com',
    password: 'OrganizerPass123!',
    username: 'organizer1',
    displayName: 'Demo Organizer',
    firstName: 'Demo',
    lastName: 'Organizer',
    city: 'Quezon City',
    barangay: 'Pinyahan',
    preferredSport: 'volleyball',
    role: 'organizer',
  },
  {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    email: 'player@yopmail.com',
    password: 'PlayerPass123!',
    username: 'player1',
    displayName: 'Demo Player',
    firstName: 'Demo',
    lastName: 'Player',
    city: 'Manila',
    barangay: 'Sampaloc',
    preferredSport: 'basketball',
    role: 'player',
  },
];

const policies = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    type: 'privacy',
    version: 'v1.0',
    title: 'Privacy Notice',
    content: '# Privacy Notice\nTara Laro stores account details, game activity, audit events, and user reports for security and compliance review.',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    type: 'terms',
    version: 'v1.0',
    title: 'Terms of Use',
    content: '# Terms of Use\nOrganizers must post accurate game details and players must use respectful behavior in all interactions.',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    type: 'community_rules',
    version: 'v1.0',
    title: 'Community Safety',
    content: '# Community Safety\nUse the in-app report flow for fraud, unsafe behavior, harassment, impersonation, or spam.',
  },
];

const sampleGames = [
  {
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    organizerUserId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    title: 'Sunday Streetball Showdown',
    sport: 'basketball',
    courtName: 'Barangay 638 Basketball Court',
    description: 'Full court 5-on-5. Bring your own water. Sneakers required. First come first serve for warm-up.',
    gameDate: '2026-07-13',
    startTime: '06:00:00',
    locationText: 'Covered court beside barangay hall',
    barangay: 'Brgy. 638',
    city: 'Manila',
    maxSlots: 10,
    entryFee: 50,
    imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
  },
  {
    id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    organizerUserId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    title: 'QC Spikers Open',
    sport: 'volleyball',
    courtName: 'Liwasang Kalayaan Court',
    description: 'Mixed volleyball. 6-person teams. Beginners welcome. Court shoes only.',
    gameDate: '2026-07-15',
    startTime: '16:00:00',
    locationText: 'Open court near community gym',
    barangay: 'Brgy. Pinyahan',
    city: 'Quezon City',
    maxSlots: 12,
    entryFee: null,
    imageUrl: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&q=80',
  },
];

const main = async () => {
  const db = getDb();

  await db.execute(
    `
      INSERT INTO roles (id, role_name, description)
      VALUES
        (1, 'player', 'Standard player account'),
        (2, 'organizer', 'Can create and manage games'),
        (3, 'admin', 'Can review reports and audits')
      ON DUPLICATE KEY UPDATE description = VALUES(description)
    `
  );

  for (const policy of policies) {
    await db.execute(
      `
        INSERT INTO policy_documents (
          id,
          policy_type,
          version_label,
          title,
          content_md,
          is_active,
          published_at,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          content_md = VALUES(content_md),
          is_active = VALUES(is_active),
          updated_at = NOW()
      `,
      [policy.id, policy.type, policy.version, policy.title, policy.content]
    );
  }

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 12);

    await db.execute(
      `
        INSERT INTO users (
          id,
          email,
          password_hash,
          username,
          display_name,
          first_name,
          last_name,
          city,
          barangay,
          preferred_sport,
          account_status,
          email_verified_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW())
        ON DUPLICATE KEY UPDATE
          email = VALUES(email),
          password_hash = VALUES(password_hash),
          username = VALUES(username),
          display_name = VALUES(display_name),
          first_name = VALUES(first_name),
          last_name = VALUES(last_name),
          city = VALUES(city),
          barangay = VALUES(barangay),
          preferred_sport = VALUES(preferred_sport),
          account_status = VALUES(account_status),
          email_verified_at = VALUES(email_verified_at)
      `,
      [
        user.id,
        user.email,
        passwordHash,
        user.username,
        user.displayName,
        user.firstName,
        user.lastName,
        user.city,
        user.barangay,
        user.preferredSport,
      ]
    );

    await db.execute(
      `
        INSERT INTO user_roles (user_id, role_id, assigned_at, assigned_by)
        VALUES (?, ?, NOW(), NULL)
        ON DUPLICATE KEY UPDATE assigned_at = assigned_at
      `,
      [user.id, roleIds[user.role]]
    );

    await db.execute(
      `
        INSERT INTO audit_logs (
          id,
          actor_user_id,
          action_type,
          target_type,
          target_id,
          metadata_json,
          created_at
        ) VALUES (?, ?, 'seed_user_upserted', 'user', ?, JSON_OBJECT('email', ?, 'role', ?), NOW())
      `,
      [randomUUID(), user.id, user.id, user.email, user.role]
    );
  }

  for (const game of sampleGames) {
    await db.execute(
      `
        INSERT INTO games (
          id,
          organizer_user_id,
          title,
          sport,
          court_name,
          description,
          game_date,
          start_time,
          location_text,
          barangay,
          city,
          max_slots,
          entry_fee,
          image_url,
          visibility,
          status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'public', 'open', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          sport = VALUES(sport),
          court_name = VALUES(court_name),
          description = VALUES(description),
          game_date = VALUES(game_date),
          start_time = VALUES(start_time),
          location_text = VALUES(location_text),
          barangay = VALUES(barangay),
          city = VALUES(city),
          max_slots = VALUES(max_slots),
          entry_fee = VALUES(entry_fee),
          image_url = VALUES(image_url),
          updated_at = NOW()
      `,
      [
        game.id,
        game.organizerUserId,
        game.title,
        game.sport,
        game.courtName,
        game.description,
        game.gameDate,
        game.startTime,
        game.locationText,
        game.barangay,
        game.city,
        game.maxSlots,
        game.entryFee,
        game.imageUrl,
      ]
    );
  }

  await db.execute(
    `
      INSERT INTO notifications (
        id,
        user_id,
        notification_type,
        title,
        message,
        related_game_id,
        related_user_id,
        is_read,
        created_at
      ) VALUES
        (?, ?, 'security', 'Phase 1 enabled', 'Policy center and reporting are now active in this environment.', NULL, NULL, 0, NOW()),
        (?, ?, 'reminder', 'Upcoming game', 'Sunday Streetball Showdown starts soon.', ?, NULL, 0, NOW())
      ON DUPLICATE KEY UPDATE
        message = VALUES(message),
        related_game_id = VALUES(related_game_id)
    `,
    [
      '99999999-9999-9999-9999-999999999991',
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      '99999999-9999-9999-9999-999999999992',
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
    ]
  );

  console.log('Demo auth users seeded successfully.');
  console.log('Policy documents and sample games seeded successfully.');
  console.log('Admin: admin@yopmail.com / AdminPass123!');
  console.log('Organizer: organizer@yopmail.com / OrganizerPass123!');
  console.log('Player: player@yopmail.com / PlayerPass123!');
};

main()
  .catch((error) => {
    console.error('Failed to seed demo users:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getDb().end();
  });
