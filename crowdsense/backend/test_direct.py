import psycopg2
try:
    print("Testing direct connection...")
    conn = psycopg2.connect(
        dbname="postgres",
        user="postgres",
        password="Crowd@#101716",
        host="db.leihwymwbxgzvzasskzy.supabase.co",
        port="5432",
        sslmode='require'
    )
    print("Direct connection success!")
    conn.close()
except Exception as e:
    print(f"Direct connection failed: {e}")
