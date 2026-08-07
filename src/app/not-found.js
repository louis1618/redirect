import RedirectClient from '../components/RedirectClient';

export default function NotFound() {
  return <RedirectClient error="요청하신 URL이 존재하지 않습니다." />;
}
