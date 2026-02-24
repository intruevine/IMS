-- NAS MariaDB 초기 설정 SQL
-- 서버: intruevine.dscloud.biz:3306
-- root 비밀번호: IntrueVine2@25

-- 1. 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS intruevine_ims 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 2. 애플리케이션 사용자 생성
CREATE USER IF NOT EXISTS 'intruevine'@'%' 
IDENTIFIED BY 'IntrueVine2@25';

-- 3. 권한 부여
GRANT ALL PRIVILEGES ON intruevine_ims.* 
TO 'intruevine'@'%';

-- 4. 권한 적용
FLUSH PRIVILEGES;

-- 확인
SHOW DATABASES LIKE 'intruevine_ims';
SHOW GRANTS FOR 'intruevine'@'%';
