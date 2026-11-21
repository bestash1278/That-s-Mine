-- Users Table
CREATE TABLE users (
    user_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'USER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Categories Table
CREATE TABLE categories (
    category_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Campus Buildings Table
CREATE TABLE campus_buildings (
    building_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    building_name VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_building_coords ON campus_buildings(latitude, longitude);

-- Storage Locations Table
CREATE TABLE storage_locations (
    storage_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    building_id BIGINT NOT NULL,
    storage_name VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    detail_location VARCHAR(255),
    description TEXT,
    contact_phone VARCHAR(20),
    operating_hours VARCHAR(100),
    pickup_guide TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (building_id) REFERENCES campus_buildings(building_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_storage_coords ON storage_locations(latitude, longitude);
CREATE INDEX idx_storage_building ON storage_locations(building_id);

-- Found Items Table
CREATE TABLE found_items (
    item_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    reporter_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    found_building_id BIGINT,
    storage_id BIGINT,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    private_features TEXT,
    found_date DATE NOT NULL,
    found_time TIME,
    found_location VARCHAR(255) NOT NULL,
    found_latitude DECIMAL(10, 7),
    found_longitude DECIMAL(10, 7),
    found_location_detail VARCHAR(255),
    storage_location VARCHAR(255),
    storage_latitude DECIMAL(10, 7),
    storage_longitude DECIMAL(10, 7),
    storage_location_detail VARCHAR(255),
    custody_type VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'REPORTED',
    version BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (reporter_id) REFERENCES users(user_id),
    FOREIGN KEY (category_id) REFERENCES categories(category_id),
    FOREIGN KEY (found_building_id) REFERENCES campus_buildings(building_id),
    FOREIGN KEY (storage_id) REFERENCES storage_locations(storage_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_found_items_category ON found_items(category_id);
CREATE INDEX idx_found_items_status ON found_items(status);
CREATE INDEX idx_found_items_found_date ON found_items(found_date);
CREATE INDEX idx_found_items_found_coords ON found_items(found_latitude, found_longitude);
CREATE INDEX idx_found_items_storage_coords ON found_items(storage_latitude, storage_longitude);
CREATE INDEX idx_found_items_reporter ON found_items(reporter_id);
CREATE INDEX idx_found_items_deleted_at ON found_items(deleted_at);

-- Found Item Images Table
CREATE TABLE found_item_images (
    image_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    item_id BIGINT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    sort_order INT DEFAULT 0,
    is_thumbnail BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES found_items(item_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_found_item_images_item ON found_item_images(item_id);

-- Lost Reports Table
CREATE TABLE lost_reports (
    report_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    lost_date DATE NOT NULL,
    lost_end_date DATE,
    lost_location VARCHAR(255) NOT NULL,
    lost_latitude DECIMAL(10, 7),
    lost_longitude DECIMAL(10, 7),
    lost_location_detail VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'SEARCHING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_lost_reports_category ON lost_reports(category_id);
CREATE INDEX idx_lost_reports_status ON lost_reports(status);
CREATE INDEX idx_lost_reports_user ON lost_reports(user_id);
CREATE INDEX idx_lost_reports_deleted_at ON lost_reports(deleted_at);

-- Lost Report Images Table
CREATE TABLE lost_report_images (
    image_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    report_id BIGINT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    sort_order INT DEFAULT 0,
    is_thumbnail BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES lost_reports(report_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_lost_report_images_report ON lost_report_images(report_id);

-- Return Requests Table
CREATE TABLE return_requests (
    request_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    item_id BIGINT NOT NULL,
    requester_id BIGINT NOT NULL,
    ownership_description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    review_comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    FOREIGN KEY (item_id) REFERENCES found_items(item_id),
    FOREIGN KEY (requester_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_return_requests_item ON return_requests(item_id);
CREATE INDEX idx_return_requests_requester ON return_requests(requester_id);
CREATE INDEX idx_return_requests_status ON return_requests(status);

-- Search Synonyms Table
CREATE TABLE search_synonyms (
    synonym_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    term VARCHAR(100) NOT NULL,
    canonical VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_search_synonyms_term ON search_synonyms(term);

-- Insert default categories
INSERT INTO categories (category_name, sort_order) VALUES
('지갑', 1),
('카드', 2),
('이어폰', 3),
('보조배터리', 4),
('의류·잡화', 5),
('기타', 6);

-- Insert search synonyms
INSERT INTO search_synonyms (term, canonical) VALUES
('에어팟', '이어폰'),
('버즈', '이어폰'),
('카드지갑', '지갑'),
('지갑카드', '지갑'),
('충전기', '보조배터리'),
('배터리', '보조배터리');
