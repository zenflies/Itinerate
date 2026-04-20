#!/usr/bin/env node
/**
 * One-time script to create an admin account or promote an existing user to admin.
 *
 * Usage:
 *   node create-admin.js                        (interactive prompts)
 *   node create-admin.js promote user@email.com (promote existing user)
 */

require('dotenv').config();
const readline = require('readline');
const bcrypt = require('bcryptjs');
const { initDB, getDB } = require('./db');

initDB();
const db = getDB();

const [,, command, emailArg] = process.argv;

// ── Promote an existing user ──────────────────────────────────────────────────
if (command === 'promote') {
  if (!emailArg) {
    console.error('Usage: node create-admin.js promote user@email.com');
    process.exit(1);
  }
  const user = db.prepare('SELECT id, first_name, last_name, email, is_admin FROM users WHERE email = ?')
    .get(emailArg.toLowerCase().trim());
  if (!user) {
    console.error(`No user found with email: ${emailArg}`);
    process.exit(1);
  }
  if (user.is_admin === 1) {
    console.log(`${user.first_name} ${user.last_name} <${user.email}> is already an admin.`);
    process.exit(0);
  }
  db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(user.id);
  console.log(`✅ ${user.first_name} ${user.last_name} <${user.email}> has been promoted to admin.`);
  process.exit(0);
}

// ── Create a new admin account interactively ──────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

(async () => {
  console.log('\n── Create Admin Account ─────────────────────────────');
  const firstName = (await ask('First name: ')).trim();
  const lastName  = (await ask('Last name:  ')).trim();
  const email     = (await ask('Email:      ')).trim().toLowerCase();
  const password  = (await ask('Password (min 8 chars): ')).trim();
  rl.close();

  if (!firstName || !email || !password) {
    console.error('First name, email, and password are all required.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const existing = db.prepare('SELECT id, is_admin FROM users WHERE email = ?').get(email);
  if (existing) {
    if (existing.is_admin === 1) {
      console.log('An admin account with that email already exists.');
    } else {
      db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(existing.id);
      console.log(`✅ Existing user promoted to admin.`);
    }
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  db.prepare(
    'INSERT INTO users (first_name, last_name, email, password_hash, is_admin) VALUES (?, ?, ?, ?, 1)'
  ).run(firstName, lastName, email, passwordHash);

  console.log(`\n✅ Admin account created!`);
  console.log(`   Email:    ${email}`);
  console.log(`   Name:     ${firstName} ${lastName}`);
  console.log(`   Panel:    http://localhost:${process.env.PORT || 3000}/admin.html\n`);
})();
