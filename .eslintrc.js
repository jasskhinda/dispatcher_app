module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    'react/no-unescaped-entities': 'off',
    'react-hooks/exhaustive-deps': 'off',
    '@next/next/no-html-link-for-pages': 'off',
  },
  // Ignore all files in node_modules and .next
  ignorePatterns: ['node_modules', '.next'],
};
