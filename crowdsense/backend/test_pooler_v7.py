import psycopg2
import sys

def test_conn(user, host, port, dbname, password, options=None):
    try:
        print(f"Testing: user={user}, host={host}, port={port}, options={options}")
        conn = psycopg2.connect(
            dbname=dbname,
            user=user,
            password=password,
            host=host,
            port=port,
            sslmode='require',
            options=options
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

# Try external_id
print("--- TESTING EXTERNAL_ID ---")
test_conn("postgres", host, "6543", dbname, password, options="-c external_id=leihwymwbxgzvzasskzy")

# Try tenant_id
print("--- TESTING TENANT_ID ---")
test_conn("postgres", host, "6543", dbname, password, options="-c tenant_id=leihwymwbxgzvzasskzy")
