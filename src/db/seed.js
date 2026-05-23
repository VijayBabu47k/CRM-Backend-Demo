require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

const seedData = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Starting database seeding...');
    
    await client.query('BEGIN');
    
    // Clear all existing data
    console.log('Clearing existing data...');
    await client.query('DELETE FROM notifications');
    await client.query('DELETE FROM revenue');
    await client.query('DELETE FROM activities');
    await client.query('DELETE FROM users');
    console.log('All existing data cleared');
    
    // Hash password for Vijay
    const hashedPassword = await bcrypt.hash('Testing@123', 12);
    
    // Insert Vijay as the default admin user
    await client.query(`
      INSERT INTO users (email, password, first_name, last_name, role, status, department)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, ['vijaybabu@gmail.com', hashedPassword, 'Vijay', 'Babu', 'admin', 'active', 'Management']);
    
    console.log('Default user Vijay created');
    
    await client.query('COMMIT');
    console.log('Database seeding completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

seedData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
