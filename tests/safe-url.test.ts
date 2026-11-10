import { describe, expect, it } from 'vitest';
import { httpOrTelUrl, httpUrl, jsonForScript, safeRedirectPath } from '@/lib/safe-url';

describe('httpUrl', () => {
  it('accepts http(s) only', () => {
    expect(httpUrl('https://www.immigration.go.kr/x')).toBe('https://www.immigration.go.kr/x');
    for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'data:text/html,<script>', 'vbscript:x', 'file:///etc/passwd', '//evil.example', 'not a url', '', null]) {
      expect(httpUrl(bad), String(bad)).toBeNull();
    }
  });
  it('allows tel: only for official resources', () => {
    expect(httpOrTelUrl('tel:1345')).toBe('tel:1345');
    expect(httpOrTelUrl('tel:1345;javascript')).toBeNull();
    expect(httpUrl('tel:1345')).toBeNull();
  });
});

describe('safeRedirectPath', () => {
  it('allows same-site paths', () => {
    expect(safeRedirectPath('/en/write-review?office=x')).toBe('/en/write-review?office=x');
    expect(safeRedirectPath('/admin')).toBe('/admin');
  });
  it('rejects open-redirect tricks', () => {
    for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', '/\\/evil.example', 'evil', '/a\nb', '/a\tb', undefined, 5]) {
      expect(safeRedirectPath(bad), String(bad)).toBeNull();
    }
  });
});

describe('jsonForScript', () => {
  it('cannot break out of a script tag', () => {
    const out = jsonForScript({ name: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('<');
    expect(JSON.parse(out).name).toBe('</script><script>alert(1)</script>');
  });
});
