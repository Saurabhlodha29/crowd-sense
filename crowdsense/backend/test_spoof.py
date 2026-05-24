import psycopg2
import sys

def test_conn(host, user, password, dbname, spoof_host):
    try:
        print(f"Testing spoofed host: {spoof_host} at {host}")
        # In psycopg2, we can't easily set the SNI hostname if the host is an IP
        # unless we use a custom SSL context or a proxy.
        # But we can try to use the 'host' parameter as the IP and 'hostaddr' as the IP?
        # No, 'host' is the hostname and 'hostaddr' is the IP.
        conn = psycopg2.connect(
            dbname=dbname,
            user=user,
            password=password,
            host=spoof_host,
            hostaddr=host,
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
spoof_host = "db.leihwymwbxgzvzasskzy.supabase.co"

test_conn(pooler_ip, "postgres", password, "postgres", spoof_host)
