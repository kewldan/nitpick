import { useLocation } from './lib/hooks.tsx';
import { ErrorPage } from './pages/ErrorPage.tsx';
import { Mentor } from './pages/Mentor.tsx';
import { Shared } from './pages/Shared.tsx';

export function App() {
  const loc = useLocation();
  const path = loc.split('#')[0].replace(/\/+$/, '') || '/';

  let m: RegExpExecArray | null;
  if (path === '/') return <Mentor key="mentor" screen="code" />;
  if (path === '/draft') return <Mentor key="mentor" screen="review" />;
  if ((m = /^\/e\/([A-Za-z0-9]{6,10})(\/code)?$/.exec(path))) {
    return <Mentor key="mentor" id={m[1]} screen={m[2] ? 'code' : 'review'} />;
  }
  if ((m = /^\/([A-Za-z0-9]{6,10})$/.exec(path))) return <Shared key={m[1]} id={m[1]} />;
  return (
    <ErrorPage
      title="Page not found"
      text="There’s nothing at this address."
      action={{ label: 'Start a new review', href: '/' }}
    />
  );
}
