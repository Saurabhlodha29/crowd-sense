import psycopg2
import sys

def test_conn(host, user, password, dbname):
    try:
        print(f"Testing direct IPv6: host={host}")
        conn = psycopg2.connect(
            dbname=dbname,
            user=user,
            password=password,
            host=host,
            port="5432",
            sslmode='require'
        )
        print("Success!")
        conn.close()
        return True
    except Exception as e:
        print(f"Failed: {e}")
        return False

ipv6 = "2406:da1a:b00:1300:736:54b4:cd08:5237"
password = "Crowd@#101716"
test_conn(ipv6, "postgres", password, "postgres")
