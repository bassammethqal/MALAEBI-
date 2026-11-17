-- Migration 007: Extend opening hours and pricing rules to cover 06:00:00 - 24:00:00
-- Covers 18 hourly slots from 06:00 AM to 11:00 PM (closing at 24:00:00).

UPDATE opening_hours
SET opens_at = '06:00:00',
    closes_at = '24:00:00',
    is_closed = false;

UPDATE pricing_rules
SET starts_at = '06:00:00',
    ends_at = '24:00:00',
    active = true;
