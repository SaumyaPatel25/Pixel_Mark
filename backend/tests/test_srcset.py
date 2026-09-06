import sys
sys.path.append('c:/Users/saumy/OneDrive/Desktop/Entrext/backend')
from utils.proxy_rewriter import proxy_srcset_attributes

html = '<img srcset="https://example.com/img.jpg 480w, https://example.com/img2.jpg 800w">'
print(proxy_srcset_attributes(html, 'http://api', 'sess1', 'https://example.com'))
