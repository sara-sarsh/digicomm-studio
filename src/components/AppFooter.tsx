// src/components/AppFooter.tsx

interface AppFooterProps {
  githubUrl?:  string;
  issuesUrl?:  string;
  licenseUrl?: string;
}

export function AppFooter({
  githubUrl  = 'https://github.com/sara-sarsh/digicomm-studio',
  issuesUrl  = 'https://github.com/sara-sarsh/digicomm-studio/issues',
  licenseUrl = 'https://github.com/sara-sarsh/digicomm-studio/blob/main/LICENSE',
}: AppFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer" role="contentinfo">
      <div className="footer-left">
        <span className="footer-credit">
          ساخته‌شده توسط{' '}
          <a href={githubUrl} target="_blank" rel="noopener noreferrer">
            Sara
          </a>
          {' '}— مهندس مخابرات{' '}
          <span aria-label="Amateur Astronomer">🔭</span>
        </span>
      </div>

      <div className="footer-center">
        <a
          href={issuesUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >
          گزارش باگ
        </a>
        <span className="footer-sep" aria-hidden="true">·</span>
        <a
          href={licenseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >
          متن‌باز (MIT)
        </a>
      </div>

      <div className="footer-right">
        <span>© {year}</span>
      </div>
    </footer>
  );
}
