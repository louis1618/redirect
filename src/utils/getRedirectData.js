import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export async function getRedirectData(slug) {
  try {
    const q = query(collection(db, 'redirects'), where('slug', '==', slug));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      const redirectData = docSnap.data();
      
      if (redirectData.active === false) {
        return { error: '이 URL은 현재 이용할 수 없습니다.', redirectData: null };
      }
      
      return { error: null, redirectData };
    } else {
      return { error: '요청하신 URL이 존재하지 않습니다.', redirectData: null };
    }
  } catch (error) {
    console.error('Error fetching redirect URL:', error);
    return { error: 'URL 정보를 가져오는 중 오류가 발생했습니다.', redirectData: null };
  }
}
