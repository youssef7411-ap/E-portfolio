import { filenameFromUrl, normalizeLinks } from './postMedia';

test('normalizeLinks filters invalid links', () => {
  const out = normalizeLinks([
    { title: 'Ok', url: 'https://example.com' },
    { title: 'No proto', url: 'example.com' },
    { title: 'Bad', url: 'javascript:alert(1)' },
  ]);
  expect(out).toEqual([{ title: 'Ok', url: 'https://example.com' }]);
});

test('filenameFromUrl returns fallback for empty', () => {
  expect(filenameFromUrl('', 'x.jpg')).toBe('x.jpg');
});

test('filenameFromUrl parses pathname', () => {
  expect(filenameFromUrl('https://a.com/uploads/pic.png?x=1', 'x')).toBe('pic.png');
});
