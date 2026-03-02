-- Service Appointments Table for Calendar
-- Tracks specific tasks/appointments for technicians

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create service_appointments table
CREATE TABLE IF NOT EXISTS service_appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    technician_id UUID REFERENCES technicians(id),
    technician_name TEXT,
    job_card_id UUID REFERENCES job_cards(id),
    machine_model TEXT,
    serial_number TEXT,
    client_name TEXT,
    work_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    planned_hours DECIMAL(4,2) DEFAULT 0,
    priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'emergency'
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_appointments_work_date ON service_appointments(work_date);
CREATE INDEX IF NOT EXISTS idx_service_appointments_technician ON service_appointments(technician_id);
CREATE INDEX IF NOT EXISTS idx_service_appointments_status ON service_appointments(status);

-- VIEW for daily load statistics (capacity tracking)
-- Assumes team of 6 technicians x 8 hours = 48 hours total daily capacity
CREATE OR REPLACE VIEW daily_load_stats AS
SELECT 
    work_date,
    COUNT(DISTINCT technician_id) as active_technicians,
    SUM(planned_hours) as reserved_hours,
    (48 - COALESCE(SUM(planned_hours), 0)) as free_hours,
    ROUND((COALESCE(SUM(planned_hours), 0) / 48) * 100) as load_percentage,
    COUNT(*) as appointment_count,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE priority = 'emergency') as emergency_count
FROM service_appointments
GROUP BY work_date;

-- VIEW for technician-specific load
CREATE OR REPLACE VIEW technician_daily_load AS
SELECT 
    technician_id,
    technician_name,
    work_date,
    SUM(planned_hours) as booked_hours,
    (8 - COALESCE(SUM(planned_hours), 0)) as available_hours,
    ROUND((COALESCE(SUM(planned_hours), 0) / 8) * 100) as capacity_percentage,
    COUNT(*) as task_count
FROM service_appointments
WHERE status != 'cancelled'
GROUP BY technician_id, technician_name, work_date;

-- Enable realtime for the appointments table
ALTER PUBLICATION supabase_realtime ADD TABLE service_appointments;

-- Insert sample data for testing
INSERT INTO service_appointments (technician_name, machine_model, serial_number, client_name, work_date, start_time, end_time, planned_hours, priority, status)
VALUES 
    ('Иван Петров', 'John Deere 8R 410', 'JD8R-2024-001', 'Агро Инвест ООД', CURRENT_DATE, '08:00', '12:00', 4, 'normal', 'scheduled'),
    ('Иван Петров', 'John Deere S790', 'JDS790-2023-045', 'Зърнени Култури АД', CURRENT_DATE, '13:00', '16:00', 3, 'high', 'scheduled'),
    ('Георги Димитров', 'John Deere 6M-185', 'JD6M-2024-012', 'Слънчев Дол ЕООД', CURRENT_DATE, '08:00', '11:00', 3, 'normal', 'in_progress'),
    ('Георги Димитров', 'John Deere 9RX 640', 'JD9RX-2023-008', 'Плодородие ООД', CURRENT_DATE, '12:00', '17:00', 5, 'emergency', 'scheduled'),
    ('Стефан Николов', 'John Deere 8R 370', 'JD8R-2024-003', 'БГ Агро АД', CURRENT_DATE, '09:00', '14:00', 5, 'normal', 'scheduled'),
    ('Петър Иванов', 'John Deere W440', 'JDW440-2024-002', 'Житница БГ ООД', CURRENT_DATE, '08:00', '10:00', 2, 'low', 'completed'),
    -- Tomorrow's appointments
    ('Иван Петров', 'John Deere 6R 250', 'JD6R-2024-015', 'Златно Зърно ООД', CURRENT_DATE + 1, '08:00', '13:00', 5, 'normal', 'scheduled'),
    ('Георги Димитров', 'John Deere S780', 'JDS780-2023-022', 'Агро Поле ЕООД', CURRENT_DATE + 1, '08:00', '12:00', 4, 'high', 'scheduled'),
    ('Стефан Николов', 'John Deere 8R 410', 'JD8R-2024-007', 'Нива Плюс АД', CURRENT_DATE + 1, '09:00', '15:00', 6, 'normal', 'scheduled'),
    -- Day after tomorrow
    ('Иван Петров', 'John Deere 9RX 590', 'JD9RX-2024-001', 'Агро Макс ООД', CURRENT_DATE + 2, '08:00', '16:00', 8, 'emergency', 'scheduled'),
    ('Петър Иванов', 'John Deere 6M-175', 'JD6M-2024-018', 'Полска Роса ЕООД', CURRENT_DATE + 2, '10:00', '14:00', 4, 'normal', 'scheduled')
ON CONFLICT DO NOTHING;
