import psycopg2
import sys

def test_conn(host, user, password, dbname):
    try:
        print(f"Testing IP: {host} with user: {user}")
        conn = psycopg2.connect(
            dbname=dbname,
            user=user,
            password=password,
            host=host,
            port="6543",
            sslmode='require'
        )
        print("Success!")
        conn.close()
        return True
    except Exception as e:
        print(f"Failed: {e}")
        return False

pooler_ip = "3.108.251.216"
password = "Crowd@#101716"
test_conn(pooler_ip, "postgres.leihwymwbxgzvzasskzy", password, "postgres")
