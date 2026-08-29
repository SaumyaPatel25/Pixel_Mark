import urllib.request
import re

req = urllib.request.Request('https://nddplatform.com', headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')
imgs = list(set(re.findall(r'https?://[^\s\"\'\>\)]+?\.(?:png|jpg|jpeg|webp)', html)))
print(imgs[:10])
