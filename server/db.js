require('dotenv').config();
const mariadb = require('mariadb');

const pool = mariadb.createPool({
  host: process.env.DB_HOST || 'intruevine.dscloud.biz',  // NAS 도메인 주소
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'intruevine',
  password: process.env.DB_PASSWORD || 'IntrueVine2@25',
  database: process.env.DB_NAME || 'intruevine_ims',
  bigIntAsNumber: true,
  insertIdAsNumber: true,
  connectionLimit: 10,
  connectTimeout: 10000,
  acquireTimeout: 10000
});

// 데이터베이스 초기화 (테이블 생성)
async function initDatabase() {
  let conn;
  try {
    conn = await pool.getConnection();
    
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        username VARCHAR(50) PRIMARY KEY,
        display_name VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'manager', 'user') DEFAULT 'user',
        approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
        approved_at TIMESTAMP NULL,
        approved_by VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await conn.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved' AFTER role");
    await conn.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL AFTER approval_status');
    await conn.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by VARCHAR(50) NULL AFTER approved_at');
    await conn.query("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'manager', 'user') DEFAULT 'user'");
    
    await conn.query(`
      CREATE TABLE IF NOT EXISTS contracts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_name VARCHAR(200) NOT NULL,
        project_title VARCHAR(300) NOT NULL,
        project_type VARCHAR(50),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_customer_name (customer_name),
        INDEX idx_end_date (end_date)
      )
    `);
    
    await conn.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contract_id INT NOT NULL,
        category ENUM('HW', 'SW') NOT NULL,
        item VARCHAR(200) NOT NULL,
        product VARCHAR(200) NOT NULL,
        qty INT DEFAULT 1,
        cycle VARCHAR(50),
        scope TEXT,
        remark TEXT,
        company VARCHAR(200),
        engineer_main_name VARCHAR(100),
        engineer_main_rank VARCHAR(50),
        engineer_main_phone VARCHAR(50),
        engineer_main_email VARCHAR(100),
        engineer_sub_name VARCHAR(100),
        engineer_sub_rank VARCHAR(50),
        engineer_sub_phone VARCHAR(50),
        engineer_sub_email VARCHAR(100),
        sales_name VARCHAR(100),
        sales_rank VARCHAR(50),
        sales_phone VARCHAR(50),
        sales_email VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
        INDEX idx_contract_id (contract_id),
        INDEX idx_category (category)
      )
    `);
    
    await conn.query(`
      CREATE TABLE IF NOT EXISTS asset_details (
        id INT AUTO_INCREMENT PRIMARY KEY,
        asset_id INT NOT NULL,
        content VARCHAR(300),
        qty VARCHAR(50),
        unit VARCHAR(50),
        FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS contract_files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contract_id INT NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        stored_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size BIGINT DEFAULT 0,
        uploaded_by VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
        INDEX idx_contract_file_contract_id (contract_id)
      )
    `);
    
    await conn.query(`
      CREATE TABLE IF NOT EXISTS events (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(300) NOT NULL,
        type ENUM('contract_end', 'inspection', 'maintenance', 'meeting', 'remote_support', 'training', 'sales_support', 'other') DEFAULT 'other',
        created_by VARCHAR(50),
        customer_name VARCHAR(200),
        location VARCHAR(300),
        start DATETIME NOT NULL,
        end DATETIME,
        contract_id INT,
        asset_id INT,
        status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
        support_hours DECIMAL(6,2) NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL,
        FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL,
        INDEX idx_start (start),
        INDEX idx_type (type)
      )
    `);

    // 기존 DB 업그레이드: 누락 컬럼 추가
    await conn.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by VARCHAR(50) NULL AFTER type');
    await conn.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS customer_name VARCHAR(200) NULL AFTER type');
    await conn.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS location VARCHAR(300) NULL AFTER customer_name');
    await conn.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS support_hours DECIMAL(6,2) NULL AFTER status');
    await conn.query(`
      ALTER TABLE events 
      MODIFY COLUMN type ENUM('contract_end', 'inspection', 'maintenance', 'meeting', 'remote_support', 'training', 'sales_support', 'other') DEFAULT 'other'
    `);
    
    await conn.query(`
      CREATE TABLE IF NOT EXISTS project_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contract_id INT,
        member_name VARCHAR(100) NOT NULL,
        position VARCHAR(100),
        department VARCHAR(100),
        phone VARCHAR(50),
        email VARCHAR(100),
        start_date DATE,
        end_date DATE,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL,
        INDEX idx_status (status)
      )
    `);
    await conn.query('ALTER TABLE project_members ADD COLUMN IF NOT EXISTS project_name VARCHAR(300) NULL AFTER contract_id');
    await conn.query('ALTER TABLE project_members ADD COLUMN IF NOT EXISTS customer_name VARCHAR(200) NULL AFTER project_name');
    await conn.query('ALTER TABLE project_members ADD COLUMN IF NOT EXISTS manager_name VARCHAR(100) NULL AFTER customer_name');
    await conn.query("ALTER TABLE project_members ADD COLUMN IF NOT EXISTS allocation_type ENUM('resident', 'proposal', 'pm', 'pl', 'ta', 'se', 'etc_support') NULL AFTER manager_name");
    await conn.query('ALTER TABLE project_members ADD COLUMN IF NOT EXISTS monthly_effort DECIMAL(8,2) NULL AFTER end_date');
    await conn.query('ALTER TABLE project_members ADD COLUMN IF NOT EXISTS notes TEXT NULL AFTER monthly_effort');
    await conn.query("ALTER TABLE project_members MODIFY COLUMN allocation_type ENUM('resident', 'proposal', 'pm', 'pl', 'ta', 'se', 'etc_support') NULL");
    await conn.query("ALTER TABLE project_members MODIFY COLUMN status ENUM('active', 'inactive', 'completed', 'withdrawn') DEFAULT 'active'");
    
    await conn.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(36) PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(300) NOT NULL,
        message TEXT,
        severity ENUM('info', 'warning', 'error') DEFAULT 'info',
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_is_read (is_read),
        INDEX idx_created_at (created_at)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS additional_holidays (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        name VARCHAR(200) NOT NULL,
        type ENUM('national', 'company') DEFAULT 'company',
        created_by VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_holiday_date (date)
      )
    `);
    
    await conn.query(`
      CREATE TABLE IF NOT EXISTS version_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        entity_id INT NOT NULL,
        entity_type ENUM('contract', 'asset') NOT NULL,
        version INT NOT NULL,
        change_type ENUM('create', 'update', 'delete') NOT NULL,
        data JSON,
        diff JSON,
        created_by VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_entity (entity_id, entity_type),
        INDEX idx_created_at (created_at)
      )
    `);
    
    console.log('All tables created successfully');
    
    // 기본 관리자 계정 생성
    const bcrypt = require('bcrypt');
    const adminExists = await conn.query('SELECT 1 FROM users WHERE username = ?', ['admin']);
    
    if (adminExists.length === 0) {
      const adminHash = await bcrypt.hash('admin', 10);
      const userHash = await bcrypt.hash('user', 10);
      
      await conn.query(`
        INSERT INTO users (username, display_name, password_hash, role, approval_status, approved_at, approved_by) VALUES
        ('admin', 'System Admin', ?, 'admin', 'approved', NOW(), 'system'),
        ('user', 'General User', ?, 'user', 'approved', NOW(), 'system')
      `, [adminHash, userHash]);
      
      console.log('Default users created (admin/admin, user/user)');
    }
    await conn.query("UPDATE users SET approval_status = 'approved' WHERE approval_status IS NULL");
    await conn.query("UPDATE users SET approved_at = COALESCE(approved_at, created_at) WHERE approval_status = 'approved'");    
  } catch (err) {
    console.error('Database initialization failed:', err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

module.exports = { pool, initDatabase };


