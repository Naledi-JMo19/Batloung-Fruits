-- Batloung Fruits Distribution Management System
-- Run:  mysql -u root -p < backend/database/schema.sql
-- Fresh installations only: this script refuses to overwrite an existing database.
CREATE DATABASE batloung_fruits CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE batloung_fruits;

-- ---------- Reference data ----------
CREATE TABLE provinces (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(30) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE box_sizes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  size_name VARCHAR(10) NOT NULL UNIQUE,
  description VARCHAR(255) NOT NULL,
  CONSTRAINT chk_box_size CHECK (size_name IN ('Small','Medium','Large'))
) ENGINE=InnoDB;

CREATE TABLE fruits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT chk_fruit_name CHECK (name IN ('Apples','Bananas','Oranges','Mangoes','Grapes'))
) ENGINE=InnoDB;

-- Which provinces each fruit may be sourced from (from the brief)
CREATE TABLE fruit_source_provinces (
  fruit_id INT NOT NULL,
  province_id INT NOT NULL,
  PRIMARY KEY (fruit_id, province_id),
  CONSTRAINT fk_fsp_fruit FOREIGN KEY (fruit_id) REFERENCES fruits(id) ON DELETE CASCADE,
  CONSTRAINT fk_fsp_province FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------- Suppliers ----------
CREATE TABLE suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_name VARCHAR(100) NOT NULL,
  province_id INT NOT NULL,
  contact_person VARCHAR(100) NOT NULL,
  telephone VARCHAR(25) NOT NULL,
  email VARCHAR(120) NOT NULL,
  physical_address VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_supplier_province FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------- Products = Fruit + Box Size ----------
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fruit_id INT NOT NULL,
  box_size_id INT NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  units_per_box INT NOT NULL DEFAULT 1,
  UNIQUE KEY uq_fruit_box (fruit_id, box_size_id),
  CONSTRAINT chk_price CHECK (selling_price > 0),
  CONSTRAINT chk_units CHECK (units_per_box > 0),
  CONSTRAINT fk_product_fruit FOREIGN KEY (fruit_id) REFERENCES fruits(id) ON DELETE RESTRICT,
  CONSTRAINT fk_product_box FOREIGN KEY (box_size_id) REFERENCES box_sizes(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE stock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL UNIQUE,
  quantity INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_stock_qty CHECK (quantity >= 0),
  CONSTRAINT fk_stock_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE purchases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity_boxes INT NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  purchase_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_purchase_qty CHECK (quantity_boxes > 0),
  CONSTRAINT chk_purchase_cost CHECK (unit_cost > 0),
  CONSTRAINT fk_purchase_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_purchase_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------- Users (RBAC) ----------
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role ENUM('Administrator','Sales') NOT NULL
) ENGINE=InnoDB;

-- ---------- Vendors, orders ----------
CREATE TABLE street_vendors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_code VARCHAR(20) NOT NULL UNIQUE,
  vendor_name VARCHAR(100) NOT NULL,
  business_name VARCHAR(100) NULL,
  telephone VARCHAR(25) NOT NULL,
  location_area VARCHAR(100) NOT NULL,
  latitude DECIMAL(10,7) NULL,   -- point chosen on the Google map (optional)
  longitude DECIMAL(10,7) NULL,
  registration_date DATE NOT NULL,
  status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  CONSTRAINT chk_vendor_lat CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  CONSTRAINT chk_vendor_lng CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB;

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NOT NULL,
  order_date DATE NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status ENUM('Pending','Confirmed','Processing','Ready for Collection/Delivery','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_vendor FOREIGN KEY (vendor_id) REFERENCES street_vendors(id) ON DELETE RESTRICT,
  CONSTRAINT fk_order_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  CONSTRAINT chk_item_qty CHECK (quantity > 0),
  CONSTRAINT fk_item_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_item_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------- Seed data ----------
INSERT INTO provinces (name) VALUES ('Eastern Cape'),('Free State'),('Gauteng'),('KwaZulu-Natal'),('Limpopo'),
  ('Mpumalanga'),('Northern Cape'),('North West'),('Western Cape');

INSERT INTO box_sizes (size_name, description) VALUES
 ('Small','A small quantity of fruit for street vendors with limited capital or lower expected daily demand.'),
 ('Medium','A medium quantity suitable for street vendors with moderate customer demand.'),
 ('Large','A larger quantity intended for street vendors who purchase higher volumes.');

INSERT INTO fruits (name, description) VALUES
 ('Apples','Crisp apples from the Western Cape, Free State and Mpumalanga'),
 ('Bananas','Bananas from Limpopo, KwaZulu-Natal and Mpumalanga'),
 ('Oranges','Oranges from Limpopo, Mpumalanga and Eastern Cape'),
 ('Mangoes','Mangoes from Limpopo, Mpumalanga and KwaZulu-Natal'),
 ('Grapes','Grapes from the Western Cape, Northern Cape and Limpopo');

INSERT INTO fruit_source_provinces (fruit_id, province_id)
SELECT f.id, p.id FROM fruits f JOIN provinces p ON
 (f.name='Apples'  AND p.name IN ('Western Cape','Free State','Mpumalanga')) OR
 (f.name='Bananas' AND p.name IN ('Limpopo','KwaZulu-Natal','Mpumalanga')) OR
 (f.name='Oranges' AND p.name IN ('Limpopo','Mpumalanga','Eastern Cape')) OR
 (f.name='Mangoes' AND p.name IN ('Limpopo','Mpumalanga','KwaZulu-Natal')) OR
 (f.name='Grapes'  AND p.name IN ('Western Cape','Northern Cape','Limpopo'));

-- 5 fruits x 3 sizes = 15 products. Price = base * size multiplier (editable in the app).
INSERT INTO products (fruit_id, box_size_id, selling_price, units_per_box)
SELECT f.id, b.id,
  ROUND(CASE f.name WHEN 'Apples' THEN 60 WHEN 'Bananas' THEN 45 WHEN 'Oranges' THEN 50 WHEN 'Mangoes' THEN 70 ELSE 80 END *
        CASE b.size_name WHEN 'Small' THEN 1 WHEN 'Medium' THEN 1.8 ELSE 2.6 END, 2),
  CASE b.size_name WHEN 'Small' THEN 20 WHEN 'Medium' THEN 40 ELSE 70 END
FROM fruits f CROSS JOIN box_sizes b;

INSERT INTO stock (product_id, quantity) SELECT id, 0 FROM products;

INSERT INTO suppliers (supplier_name, province_id, contact_person, telephone, email, physical_address)
SELECT 'Cape Orchards (Pty) Ltd', id, 'Thandi Mokoena', '+27 21 555 0101', 'orders@capeorchards.example', 'Elgin Valley Road, Grabouw, 7160' FROM provinces WHERE name='Western Cape';
INSERT INTO suppliers (supplier_name, province_id, contact_person, telephone, email, physical_address)
SELECT 'Letaba Tropical Farms', id, 'Pieter van Wyk', '+27 15 555 0144', 'sales@letaba.example', 'R36 Tzaneen, Limpopo, 0850' FROM provinces WHERE name='Limpopo';
INSERT INTO suppliers (supplier_name, province_id, contact_person, telephone, email, physical_address)
SELECT 'Lowveld Fresh Produce', id, 'Nomsa Dlamini', '+27 13 555 0188', 'info@lowveldfresh.example', 'Nelspruit Industrial Park, Mbombela, 1200' FROM provinces WHERE name='Mpumalanga';

INSERT INTO street_vendors (vendor_code, vendor_name, business_name, telephone, location_area, latitude, longitude, registration_date) VALUES
 ('VND001','Mpho Letsie','Mpho Fresh Stand','+266 5800 1001','Maseru Central',-29.3100000,27.4800000,'2026-01-12'),
 ('VND002','Palesa Ranthocha','Palesa Fruits','+266 5800 1002','Ha Thamae',-29.3300000,27.5200000,'2026-02-03'),
 ('VND003','Tefo Mohapi','Tefo Roadside Market','+266 5800 1003','Maseru West',-29.3050000,27.4500000,'2026-03-20');
-- Run npm run setup in backend to create admin and sales with your own passwords.
