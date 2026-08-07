import RedirectClient from '../../components/RedirectClient';
import { getRedirectData } from '../../utils/getRedirectData';
import { notFound } from 'next/navigation';

export default async function SlugPage({ params }) {
  const { slug } = await params;
  const { error, redirectData } = await getRedirectData(slug);
  
  if (error === '요청하신 URL이 존재하지 않습니다.') {
    notFound();
  }
  
  return <RedirectClient redirectData={redirectData} error={error} />;
}
