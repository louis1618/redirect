export const dynamic = 'force-dynamic';

import RedirectClient from '../components/RedirectClient';
import { getRedirectData } from '../utils/getRedirectData';

export default async function Home() {
  const { error, redirectData } = await getRedirectData('main');
  
  return <RedirectClient redirectData={redirectData} error={error} />;
}
