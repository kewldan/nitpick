import { Header } from '../components/Header.tsx';
import { Icon } from '../components/Icon.tsx';
import { navigate } from '../lib/hooks.tsx';

export function ErrorPage({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="page">
      <Header />
      <main className="container container--narrow">
        <div className="np-panel empty-state">
          <Icon name="alert" size={24} />
          <h1 className="t-title-md">{title}</h1>
          <p className="muted">{text}</p>
          {action && (
            <a
              href={action.href}
              className="np-btn np-btn--primary"
              onClick={(e) => {
                e.preventDefault();
                navigate(action.href);
              }}
            >
              {action.label}
            </a>
          )}
        </div>
      </main>
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="page">
      <Header />
      <main className="container container--narrow">
        <p className="muted loading" role="status">
          Loading review…
        </p>
      </main>
    </div>
  );
}
