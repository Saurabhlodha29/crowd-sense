import psycopg2
import sys

def test_conn(host, user, password, dbname):
    try:
        print(f"Testing: {host}")
        conn = psycopg2.connect(
            dbname=dbname,
            user=user,
            password=password,
            host=host,
            port="6543",
            sslmode='require',
            connect_timeout=3
        )
        print(f"--> SUCCESS ON {host}!")
        conn.close()
        return True
    except Exception as e:
        err = str(e)
        if "not found" in err:
            print(f"  Failed: tenant/user not found")
        elif "no tenant identifier" in err:
            print(f"  Failed: no tenant identifier")
        elif "timeout expired" in err or "timeout" in err:
            print(f"  Failed: Timeout")
        else:
            print(f"  Failed: {err.strip()}")
        return False

password = "Crowd@#101716"
user = "postgres.leihwymwbxgzvzasskzy"
dbname = "postgres"

regions = [
    "ap-south-1",
    "ap-southeast-1",
    "ap-southeast-2",
    "ap-northeast-1",
    "ap-northeast-2",
    "us-east-1",
    "us-east-2",
    "us-west-1",
    "us-west-2",
    "eu-west-1",
    "eu-west-2",
    "eu-west-3",
    "eu-central-1",
    "sa-east-1",
    "ca-central-1"
]

for r in regions:
    host = f"aws-0-{r}.pooler.supabase.com"
    if test_conn(host, user, password, dbname):
        print(f"*** FOUND WORKING POOLER HOST: {host} ***")
        break
