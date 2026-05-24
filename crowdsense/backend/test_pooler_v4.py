import psycopg2
import sys

def test_conn(user, host, port, dbname, password):
    try:
        print(f"Testing: user={user}, host={host}, port={port}")
        conn = psycopg2.connect(
            dbname=dbname,
            user=user,
            password=password,
            host=host,
            port=port,
            sslmode='require'
        )
        print("Success!")
        conn.close()
        return True
    except Exception as e:
        print(f"Failed: {e}")
        return False

password = "Crowd@#101716"
host = "aws-0-ap-south-1.pooler.supabase.com"
dbname = "postgres"

# Try @ format
print("--- TESTING @ FORMAT ---")
test_conn("postgres@leihwymwbxgzvzasskzy", host, "5432", dbname, password)

# Try with the ref as the DB name and user as postgres
print("--- TESTING REF AS DB NAME ---")
test_conn("postgres", host, "5432", "leihwymwbxgzvzasskzy", password)
