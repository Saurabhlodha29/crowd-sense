import psycopg2
try:
    print("Testing connection via Cloudflare host (port 5432)...")
    conn = psycopg2.connect(
        dbname="postgres",
        user="postgres.leihwymwbxgzvzasskzy",
        password="Crowd@#101716",
        host="leihwymwbxgzvzasskzy.supabase.co",
        port="5432",
        sslmode='require',
        connect_timeout=3
    )
    print("Success on 5432!")
    conn.close()
except Exception as e:
    print(f"Failed on 5432: {e}")

try:
    print("Testing connection via Cloudflare host (port 6543)...")
    conn = psycopg2.connect(
        dbname="postgres",
        user="postgres.leihwymwbxgzvzasskzy",
        password="Crowd@#101716",
        host="leihwymwbxgzvzasskzy.supabase.co",
        port="6543",
        sslmode='require',
        connect_timeout=3
    )
    print("Success on 6543!")
    conn.close()
except Exception as e:
    print(f"Failed on 6543: {e}")
