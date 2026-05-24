import psycopg2
import sys

def test_conn(user, host, port, dbname, password, app_name=None):
    try:
        print(f"Testing: user={user}, host={host}, port={port}, app_name={app_name}")
        conn = psycopg2.connect(
            dbname=dbname,
            user=user,
            password=password,
            host=host,
            port=port,
            sslmode='require',
            application_name=app_name
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

# Try application name
print("--- TESTING APPLICATION NAME ---")
test_conn("postgres", host, "6543", dbname, password, app_name="leihwymwbxgzvzasskzy")

# Try with the project ref in the options again but with a different key
try:
    print("--- TESTING OPTIONS project_ref ---")
    conn = psycopg2.connect(
        dbname=dbname,
        user="postgres",
        password=password,
        host=host,
        port="6543",
        sslmode='require',
        options=f"-c project_ref=leihwymwbxgzvzasskzy"
    )
    print("Success with project_ref!")
    conn.close()
except Exception as e:
    print(f"Failed with project_ref: {e}")
