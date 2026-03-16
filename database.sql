SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS pipeline_stages;
DROP TABLE IF EXISTS pipelines;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS followups;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS deals;
DROP TABLE IF EXISTS properties;
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS lead_stages;
DROP TABLE IF EXISTS lead_sources;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  UNIQUE KEY uniq_role_permission (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(191) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) DEFAULT '',
  phone VARCHAR(50) DEFAULT '',
  avatar VARCHAR(255) DEFAULT NULL,
  role_id INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE lead_sources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lead_stages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(20) DEFAULT '#3B82F6',
  stage_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) DEFAULT '',
  email VARCHAR(191) DEFAULT '',
  phone VARCHAR(50) DEFAULT '',
  company VARCHAR(150) DEFAULT '',
  source_id INT DEFAULT NULL,
  stage_id INT DEFAULT NULL,
  assigned_to INT DEFAULT NULL,
  created_by INT DEFAULT NULL,
  budget DECIMAL(15,2) DEFAULT 0,
  requirements TEXT,
  notes TEXT,
  status ENUM('new','contacted','qualified','lost','converted') NOT NULL DEFAULT 'new',
  priority ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
  last_contacted_at DATETIME DEFAULT NULL,
  next_followup_at DATETIME DEFAULT NULL,
  converted_to_customer_id INT DEFAULT NULL,
  converted_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES lead_sources(id) ON DELETE SET NULL,
  FOREIGN KEY (stage_id) REFERENCES lead_stages(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) DEFAULT '',
  email VARCHAR(191) DEFAULT '',
  phone VARCHAR(50) DEFAULT '',
  company VARCHAR(150) DEFAULT '',
  address VARCHAR(255) DEFAULT '',
  city VARCHAR(100) DEFAULT '',
  state VARCHAR(100) DEFAULT '',
  country VARCHAR(100) DEFAULT '',
  postal_code VARCHAR(30) DEFAULT '',
  source_id INT DEFAULT NULL,
  assigned_to INT DEFAULT NULL,
  customer_value DECIMAL(15,2) DEFAULT 0,
  lead_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES lead_sources(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
);

CREATE TABLE properties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  property_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'available',
  price DECIMAL(15,2) NOT NULL DEFAULT 0,
  address VARCHAR(255) DEFAULT '',
  city VARCHAR(100) DEFAULT '',
  state VARCHAR(100) DEFAULT '',
  country VARCHAR(100) DEFAULT '',
  postal_code VARCHAR(30) DEFAULT '',
  bedrooms INT DEFAULT NULL,
  bathrooms DECIMAL(4,1) DEFAULT NULL,
  square_feet INT DEFAULT NULL,
  lot_size DECIMAL(12,2) DEFAULT NULL,
  year_built INT DEFAULT NULL,
  amenities TEXT,
  images JSON DEFAULT NULL,
  listed_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (listed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE deals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  lead_id INT DEFAULT NULL,
  customer_id INT DEFAULT NULL,
  property_id INT DEFAULT NULL,
  stage VARCHAR(50) NOT NULL DEFAULT 'initiated',
  value DECIMAL(15,2) NOT NULL DEFAULT 0,
  probability INT NOT NULL DEFAULT 50,
  expected_close_date DATE DEFAULT NULL,
  actual_close_date DATE DEFAULT NULL,
  created_by INT DEFAULT NULL,
  assigned_to INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  task_type VARCHAR(50) NOT NULL DEFAULT 'other',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  due_date DATETIME DEFAULT NULL,
  lead_id INT DEFAULT NULL,
  customer_id INT DEFAULT NULL,
  deal_id INT DEFAULT NULL,
  assigned_to INT DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE followups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lead_id INT DEFAULT NULL,
  customer_id INT DEFAULT NULL,
  followup_type VARCHAR(50) NOT NULL DEFAULT 'note',
  subject VARCHAR(150) NOT NULL,
  description TEXT,
  scheduled_at DATETIME NOT NULL,
  completed_at DATETIME DEFAULT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  assigned_to INT DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activity_type VARCHAR(100) NOT NULL,
  description VARCHAR(255) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT NOT NULL,
  user_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'info',
  link VARCHAR(255) DEFAULT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lead_id INT DEFAULT NULL,
  customer_id INT DEFAULT NULL,
  property_id INT DEFAULT NULL,
  deal_id INT DEFAULT NULL,
  content TEXT NOT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE pipelines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) DEFAULT '',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pipeline_stages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pipeline_id INT NOT NULL,
  stage_id INT NOT NULL,
  stage_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE,
  FOREIGN KEY (stage_id) REFERENCES lead_stages(id) ON DELETE CASCADE
);

CREATE TABLE reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  parameters JSON DEFAULT NULL,
  generated_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type VARCHAR(50) NOT NULL DEFAULT 'string',
  description VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO roles (id, name, description) VALUES
(1, 'Admin', 'Full access'),
(2, 'Manager', 'Team management access'),
(3, 'Sales Agent', 'Default sales role')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO permissions (name, description) VALUES
('manage_users', 'Create and manage users'),
('manage_leads', 'Create and manage leads'),
('manage_customers', 'Create and manage customers'),
('manage_properties', 'Create and manage properties'),
('manage_deals', 'Create and manage deals'),
('manage_tasks', 'Create and manage tasks'),
('view_reports', 'View reports')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions
ON DUPLICATE KEY UPDATE role_id = role_id;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE name IN ('manage_leads','manage_customers','manage_properties','manage_deals','manage_tasks','view_reports')
ON DUPLICATE KEY UPDATE role_id = role_id;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE name IN ('manage_leads','manage_customers','manage_properties','manage_deals','manage_tasks')
ON DUPLICATE KEY UPDATE role_id = role_id;

INSERT INTO lead_sources (name, description) VALUES
('Website', 'Website inquiry'),
('Facebook', 'Facebook campaign'),
('Google Ads', 'Google Ads lead'),
('Referral', 'Referred lead'),
('Walk-in', 'Walk-in lead')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO lead_stages (name, color, stage_order) VALUES
('New', '#3B82F6', 1),
('Contacted', '#8B5CF6', 2),
('Qualified', '#10B981', 3),
('Proposal', '#F59E0B', 4),
('Won', '#22C55E', 5),
('Lost', '#EF4444', 6)
ON DUPLICATE KEY UPDATE color = VALUES(color), stage_order = VALUES(stage_order);

INSERT INTO pipelines (id, name, description, is_default) VALUES
(1, 'Default Pipeline', 'Default sales pipeline', TRUE)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO pipeline_stages (pipeline_id, stage_id, stage_order)
SELECT 1, id, stage_order FROM lead_stages
ON DUPLICATE KEY UPDATE stage_order = VALUES(stage_order);

INSERT INTO settings (setting_key, setting_value, setting_type, description) VALUES
('company_name', 'Real Estate CRM', 'string', 'Company name'),
('currency', 'INR', 'string', 'Default currency'),
('timezone', 'Asia/Kolkata', 'string', 'Default timezone')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
