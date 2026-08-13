import unittest
from utils.proxy_rewriter import strip_sri_attributes, rewrite_html

class TestSRIAndRegexProxyRewriter(unittest.TestCase):
    def test_strip_sri_attributes_link(self):
        input_html = '<link rel="stylesheet" href="https://cdn.example.com/style.css" integrity="sha384-abc123xyz" crossorigin="anonymous">'
        result = strip_sri_attributes(input_html)
        self.assertNotIn('integrity=', result)
        self.assertNotIn('crossorigin=', result)
        self.assertIn('href="https://cdn.example.com/style.css"', result)

    def test_strip_sri_attributes_script(self):
        input_html = '<script src="https://cdn.example.com/app.js" integrity="sha384-def456" crossorigin="use-credentials"></script>'
        result = strip_sri_attributes(input_html)
        self.assertNotIn('integrity=', result)
        self.assertNotIn('crossorigin=', result)
        self.assertIn('src="https://cdn.example.com/app.js"', result)

    def test_rewrite_html_removes_sri(self):
        html_content = '''<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="https://cdn.prod.website-files.com/623fdd745/designjoy.shared.min.css" integrity="sha384-samplehash" crossorigin="anonymous">
</head>
<body>
    <script src="https://cdn.memberstack.io/static/memberstack.js" integrity="sha384-anotherhash" crossorigin="anonymous"></script>
</body>
</html>'''
        rewritten = rewrite_html(
            html=html_content,
            session_id="2108e4ca-37c4-441f-8936-36953d4fae71",
            page_url="https://www.designjoy.co/",
            base_url="https://www.designjoy.co/",
            api_base="http://localhost:8000"
        )
        self.assertNotIn('integrity=', rewritten)
        self.assertNotIn('crossorigin=', rewritten)
        self.assertIn('designjoy.shared.min.css', rewritten)

if __name__ == '__main__':
    unittest.main()
