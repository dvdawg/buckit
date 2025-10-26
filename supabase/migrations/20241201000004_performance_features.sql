
ALTER TABLE users ADD COLUMN location TEXT;
ALTER TABLE users ADD COLUMN current_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN longest_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN total_completions INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN last_activity_date DATE;

ALTER TABLE buckets ADD COLUMN emoji TEXT DEFAULT '🪣';
ALTER TABLE buckets ADD COLUMN color TEXT DEFAULT '#4ade80';
ALTER TABLE buckets ADD COLUMN challenge_count INTEGER DEFAULT 0;
ALTER TABLE buckets ADD COLUMN completion_percentage DECIMAL(5,2) DEFAULT 0.00;

ALTER TABLE items ADD COLUMN satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5);
ALTER TABLE items ADD COLUMN urgency_level TEXT DEFAULT 'no_rush' CHECK (urgency_level IN ('overdue', 'due_soon', 'no_rush'));
ALTER TABLE items ADD COLUMN is_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE items ADD COLUMN completed_at TIMESTAMPTZ;

CREATE TABLE user_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    completions_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, activity_date)
);

CREATE TABLE weekly_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    completions_count INTEGER DEFAULT 0,
    growth_percentage DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, week_start)
);

CREATE TABLE bucket_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bucket_id UUID NOT NULL REFERENCES buckets(id) ON DELETE CASCADE,
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,
    total_challenges INTEGER DEFAULT 0,
    completed_challenges INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, bucket_id)
);

CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX idx_user_activity_date ON user_activity(activity_date);
CREATE INDEX idx_weekly_progress_user_id ON weekly_progress(user_id);
CREATE INDEX idx_weekly_progress_week_start ON weekly_progress(week_start);
CREATE INDEX idx_bucket_progress_user_id ON bucket_progress(user_id);
CREATE INDEX idx_bucket_progress_bucket_id ON bucket_progress(bucket_id);
CREATE INDEX idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX idx_performance_metrics_type ON performance_metrics(metric_type);
CREATE INDEX idx_performance_metrics_period ON performance_metrics(period_start, period_end);

CREATE INDEX idx_users_location ON users(location);
CREATE INDEX idx_users_streak ON users(current_streak);
CREATE INDEX idx_buckets_emoji ON buckets(emoji);
CREATE INDEX idx_buckets_color ON buckets(color);
CREATE INDEX idx_items_satisfaction ON items(satisfaction_rating);
CREATE INDEX idx_items_urgency ON items(urgency_level);
CREATE INDEX idx_items_completed ON items(is_completed);

CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    current_streak_count INTEGER := 0;
    longest_streak_count INTEGER;
    last_activity_date DATE;
BEGIN
    SELECT MAX(activity_date) INTO last_activity_date
    FROM user_activity 
    WHERE user_id = p_user_id;
    
    WITH activity_with_gaps AS (
        SELECT 
            activity_date,
            activity_date - ROW_NUMBER() OVER (ORDER BY activity_date) * INTERVAL '1 day' AS group_date
        FROM user_activity 
        WHERE user_id = p_user_id
    ),
    streak_groups AS (
        SELECT 
            group_date,
            COUNT(*) as streak_length,
            MIN(activity_date) as streak_start,
            MAX(activity_date) as streak_end
        FROM activity_with_gaps
        GROUP BY group_date
    )
    SELECT COALESCE(MAX(streak_length), 0) INTO current_streak_count
    FROM streak_groups
    WHERE streak_end >= CURRENT_DATE - INTERVAL '1 day';
    
    SELECT longest_streak INTO longest_streak_count
    FROM users WHERE id = p_user_id;
    
    UPDATE users 
    SET 
        current_streak = current_streak_count,
        longest_streak = GREATEST(current_streak_count, COALESCE(longest_streak_count, 0)),
        last_activity_date = last_activity_date
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_bucket_progress(p_bucket_id UUID, p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    total_items INTEGER;
    completed_items INTEGER;
    completion_pct DECIMAL(5,2);
BEGIN
    SELECT COUNT(*) INTO total_items
    FROM items 
    WHERE bucket_id = p_bucket_id AND owner_id = p_user_id;
    
    SELECT COUNT(*) INTO completed_items
    FROM items 
    WHERE bucket_id = p_bucket_id AND owner_id = p_user_id AND is_completed = TRUE;
    
    completion_pct := CASE 
        WHEN total_items = 0 THEN 0.00
        ELSE (completed_items::DECIMAL / total_items::DECIMAL) * 100
    END;
    
    INSERT INTO bucket_progress (user_id, bucket_id, completion_percentage, total_challenges, completed_challenges)
    VALUES (p_user_id, p_bucket_id, completion_pct, total_items, completed_items)
    ON CONFLICT (user_id, bucket_id) 
    DO UPDATE SET
        completion_percentage = completion_pct,
        total_challenges = total_items,
        completed_challenges = completed_items,
        last_updated = NOW();
    
    UPDATE buckets 
    SET 
        challenge_count = total_items,
        completion_percentage = completion_pct
    WHERE id = p_bucket_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION record_user_activity(p_user_id UUID, p_completions_count INTEGER DEFAULT 1)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_activity (user_id, activity_date, completions_count)
    VALUES (p_user_id, CURRENT_DATE, p_completions_count)
    ON CONFLICT (user_id, activity_date)
    DO UPDATE SET completions_count = user_activity.completions_count + p_completions_count;
    
    PERFORM update_user_streak(p_user_id);
    
    UPDATE users 
    SET total_completions = total_completions + p_completions_count
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_weekly_progress(p_user_id UUID, p_week_start DATE)
RETURNS VOID AS $$
DECLARE
    week_end DATE := p_week_start + INTERVAL '6 days';
    completions_count INTEGER;
    previous_week_completions INTEGER;
    growth_pct DECIMAL(5,2);
BEGIN
    SELECT COALESCE(SUM(completions_count), 0) INTO completions_count
    FROM user_activity 
    WHERE user_id = p_user_id 
    AND activity_date BETWEEN p_week_start AND week_end;
    
    SELECT COALESCE(SUM(completions_count), 0) INTO previous_week_completions
    FROM user_activity 
    WHERE user_id = p_user_id 
    AND activity_date BETWEEN (p_week_start - INTERVAL '7 days') AND (p_week_start - INTERVAL '1 day');
    
    growth_pct := CASE 
        WHEN previous_week_completions = 0 THEN 0.00
        ELSE ((completions_count - previous_week_completions)::DECIMAL / previous_week_completions::DECIMAL) * 100
    END;
    
    INSERT INTO weekly_progress (user_id, week_start, week_end, completions_count, growth_percentage)
    VALUES (p_user_id, p_week_start, week_end, completions_count, growth_pct)
    ON CONFLICT (user_id, week_start)
    DO UPDATE SET
        completions_count = completions_count,
        growth_percentage = growth_pct;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_update_progress()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_completed = TRUE AND (OLD.is_completed IS NULL OR OLD.is_completed = FALSE) THEN
        PERFORM record_user_activity(NEW.owner_id, 1);
        
        PERFORM update_bucket_progress(NEW.bucket_id, NEW.owner_id);
        
        NEW.completed_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_progress_on_completion
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_progress();

CREATE OR REPLACE FUNCTION trigger_update_bucket_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM update_bucket_progress(NEW.bucket_id, NEW.owner_id);
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'UPDATE' THEN
        IF NEW.bucket_id != OLD.bucket_id THEN
            PERFORM update_bucket_progress(NEW.bucket_id, NEW.owner_id);
            PERFORM update_bucket_progress(OLD.bucket_id, OLD.owner_id);
        ELSE
            PERFORM update_bucket_progress(NEW.bucket_id, NEW.owner_id);
        END IF;
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        PERFORM update_bucket_progress(OLD.bucket_id, OLD.owner_id);
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bucket_stats_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_bucket_stats();
