import sqlite3
conn = sqlite3.connect('pixelmark.db')
cur = conn.cursor()
cur.execute('SELECT id, session_id FROM markers')
print(cur.fetchall())
