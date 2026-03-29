import { htmlToPlainText, plainTextToQuillHtml } from './aiText';

test('htmlToPlainText returns empty for empty input', () => {
  expect(htmlToPlainText('')).toBe('');
  expect(htmlToPlainText(null)).toBe('');
});

test('htmlToPlainText strips tags and normalizes whitespace', () => {
  const html = '<p>Hello <strong>world</strong></p><p>Second&nbsp;line</p>';
  expect(htmlToPlainText(html)).toBe('Hello world Second line');
});

test('plainTextToQuillHtml wraps and escapes', () => {
  const out = plainTextToQuillHtml('Hi <script>alert(1)</script>');
  expect(out).toBe('<p>Hi &lt;script&gt;alert(1)&lt;/script&gt;</p>');
});

test('plainTextToQuillHtml returns empty for empty text', () => {
  expect(plainTextToQuillHtml('   ')).toBe('');
});
