import re

def make_safe(sql):
    # 1. Handle CREATE TYPE with check
    type_pattern = re.compile(r"CREATE TYPE public\.(\w+) AS ENUM \((.*?)\);", re.DOTALL)
    def replace_type(match):
        name = match.group(1)
        values = match.group(2)
        return f"""
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{name}') THEN
        CREATE TYPE public.{name} AS ENUM ({values});
    END IF;
END $$;"""
    sql = type_pattern.sub(replace_type, sql)

    # 2. Handle CREATE TABLE
    sql = re.sub(r"CREATE TABLE public\.(\w+)", r"CREATE TABLE IF NOT EXISTS public.\1", sql)

    # 3. Handle CREATE POLICY with check
    # Many variations of CREATE POLICY exist. Let's use a simpler "DROP IF EXISTS" approach or wrap in EXCEPTION
    # Wrapping in DO block with EXCEPTION duplicate_object is safest for policies
    policy_pattern = re.compile(r"CREATE POLICY (.*?) ON (.*?) (.*?);", re.DOTALL)
    def replace_policy(match):
        name = match.group(1)
        table = match.group(2)
        rest = match.group(3)
        return f"""
DO $$ BEGIN
    CREATE POLICY {name} ON {table} {rest};
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;"""
    sql = policy_pattern.sub(replace_policy, sql)

    # 4. Handle CREATE TRIGGER (DROP first)
    trigger_pattern = re.compile(r"CREATE TRIGGER (\w+) (.*?) ON (.*?) (.*?) EXECUTE FUNCTION (.*?);", re.DOTALL)
    def replace_trigger(match):
        name = match.group(1)
        timing = match.group(2)
        table = match.group(3)
        event = match.group(4)
        func = match.group(5)
        return f"DROP TRIGGER IF EXISTS {name} ON {table}; CREATE TRIGGER {name} {timing} ON {table} {event} EXECUTE FUNCTION {func};"
    sql = trigger_pattern.sub(replace_trigger, sql)

    return sql

with open("/Users/annalupaiva/Downloads/lovable dev/full_migration_to_run.sql", "r") as f:
    content = f.read()

# Apply transforms
safe_content = make_safe(content)

# Special fixes for specific lines that might have been mangled or need extra care
# e.g. the seeding INSERTs are already mostly safe due to ON CONFLICT in the original file

with open("/Users/annalupaiva/Downloads/lovable dev/safe_migration.sql", "w") as f:
    f.write(safe_content)
