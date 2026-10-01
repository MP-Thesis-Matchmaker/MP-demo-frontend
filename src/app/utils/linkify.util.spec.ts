import {linkify} from './linkify.util';

describe('linkify', () => {
  it('returns plain text untouched', () => {
    expect(linkify('no links here')).toEqual([{kind: 'text', text: 'no links here'}]);
  });

  it('pulls a URL out of parentheses, as the template synthesiser writes it', () => {
    expect(linkify('- Title (https://www.zora.uzh.ch/handle/1)\n')).toEqual([
      {kind: 'text', text: '- Title ('},
      {kind: 'link', text: 'https://www.zora.uzh.ch/handle/1', href: 'https://www.zora.uzh.ch/handle/1'},
      {kind: 'text', text: ')\n'}
    ]);
  });

  it('leaves trailing sentence punctuation outside the link', () => {
    expect(linkify('See https://uzh.ch/a.')).toEqual([
      {kind: 'text', text: 'See '},
      {kind: 'link', text: 'https://uzh.ch/a', href: 'https://uzh.ch/a'},
      {kind: 'text', text: '.'}
    ]);
  });

  it('ignores non-http schemes', () => {
    expect(linkify('javascript:alert(1)')).toEqual([{kind: 'text', text: 'javascript:alert(1)'}]);
  });
});
