import psycopg2
import sys

def test_conn(user, host, port, dbname, password):
    try:
        print(f"Testing: user={user}, host={host}, port={port}, dbname={dbname}")
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

# Try dotted DB name
print("--- TESTING DOTTED DB NAME ---")
test_conn("postgres", host, "6543", "postgres.leihwymwbxgzvzasskzy", password)

# Try user as postgres and dbname as project ref
print("--- TESTING PROJECT REF AS DB NAME (PORT 6543) ---")
test_conn("postgres", host, "6543", "leihwymwbxgzvzasskzy", password)
