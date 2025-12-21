-- 智慧慢病管理系统数据库初始化脚本
-- 创建时间: 2025-12-22

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- 用于模糊搜索

-- 打印初始化信息
DO $$
BEGIN
  RAISE NOTICE '开始初始化 health_mgmt 数据库...';
END $$;

-- 创建枚举类型
CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'health_manager', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'banned');
CREATE TYPE check_in_type AS ENUM ('blood_pressure', 'blood_sugar', 'medication', 'exercise', 'diet', 'therapy');
CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');

-- 创建更新时间自动更新函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 打印完成信息
DO $$
BEGIN
  RAISE NOTICE '数据库初始化完成！';
  RAISE NOTICE '已创建枚举类型: user_role, user_status, check_in_type, risk_level, gender_type';
  RAISE NOTICE '已创建函数: update_updated_at_column()';
END $$;
