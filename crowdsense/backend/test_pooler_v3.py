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

# Try project ref as username
print("--- TESTING PROJECT REF AS USERNAME ---")
test_conn("leihwymwbxgzvzasskzy", host, "5432", dbname, password)

# Try with . instead of . in username (wait, I already tried that)

# Try with the project ref in the options
try:
    print("--- TESTING WITH OPTIONS ---")
    conn = psycopg2.connect(
        dbname=dbname,
        user="postgres",
        password=password,
        host=host,
        port="5432",
        sslmode='require',
        options=f"-c project=leihwymwbxgzvzasskzy"
    )
    print("Success with options!")
    conn.close()
except Exception as e:
    print(f"Failed with options: {e}")
